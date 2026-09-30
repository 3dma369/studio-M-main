const functions = require('firebase-functions');

// `secrets: [...]` as first arg tells Cloud Functions to inject the named
// secrets as process.env.STRIPE_* at runtime. In firebase-functions@6.x v1
// API, opts are passed directly to onRequest/onCall instead of runWith().
const STRIPE_SECRETS=['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
const stripeOnCall = (handler) =>
  functions.https.onCall({ secrets: STRIPE_SECRETS }, handler);
const stripeOnRequest = (handler) =>
  functions.https.onRequest({ secrets: STRIPE_SECRETS }, handler);

let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripe = require('stripe')(key);
  }
  return _stripe;
};

exports.stripeCreateCustomer = stripeOnCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { email, name } = data;
  if (!email) throw new functions.https.HttpsError('invalid-argument', 'email required');
  const customer = await getStripe().customers.create({ email, name: name || '', metadata: { userId: context.auth.uid } });
  return { customerId: customer.id };
});

exports.stripeCreateSubscription = stripeOnCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { customerId, priceId } = data;
  if (!customerId || !priceId) throw new functions.https.HttpsError('invalid-argument', 'customerId and priceId required');
  const sub = await getStripe().subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: { userId: context.auth.uid },
  });
  const invoice = sub.latest_invoice;
  return { subscriptionId: sub.id, clientSecret: invoice?.payment_intent?.client_secret, status: sub.status };
});

exports.stripeCreateCheckoutSession = stripeOnCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { customerId, priceId, customerEmail } = data;
  const params = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: 'https://studio-m.web.app/?checkout=success',
    cancel_url: 'https://studio-m.web.app/?checkout=cancelled',
    metadata: { userId: context.auth.uid },
  };
  if (customerId) params.customer = customerId;
  else if (customerEmail) params.customer_email = customerEmail;
  const session = await getStripe().checkout.sessions.create(params);
  return { url: session.url };
});

exports.stripeCreatePortalSession = stripeOnCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { customerId } = data;
  if (!customerId) throw new functions.https.HttpsError('invalid-argument', 'customerId required');
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: 'https://studio-m.web.app/',
  });
  return { url: session.url };
});

exports.stripeCancelSubscription = stripeOnCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { subscriptionId, cancelNow } = data;
  if (!subscriptionId) throw new functions.https.HttpsError('invalid-argument', 'subscriptionId required');
  const sub = cancelNow
    ? await getStripe().subscriptions.cancel(subscriptionId)
    : await getStripe().subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  return { subscriptionId: sub.id, status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end };
});

exports.stripeCreatePaymentIntent = stripeOnCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { amount, metadata } = data;
  if (!amount) throw new functions.https.HttpsError('invalid-argument', 'amount required');
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: { userId: context.auth.uid, ...(metadata || {}) },
  });
  return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
});

// ── YouTube channel feed (for Reality Hub) ─────────────────────────────────
// Public RSS feed proxy so the browser can fetch it without CORS issues.
// Channel uploads playlist format: UU + channel_id
//   https://www.youtube.com/feeds/videos.xml?playlist_id=UUxxxxxxxxxxxxxxxxxxxxxx
// Cached for 15 minutes to spare YouTube.
const YOUTUBE_RSS_CACHE_TTL_MS = 15 * 60 * 1000;
const _ytRssCache = new Map(); // key: playlistId -> { ts, videos }

exports.youtubeChannelFeed = functions.https.onCall(async (data, context) => {
  const { playlistId, maxResults = 15 } = data || {};
  if (!playlistId || !/^UU[A-Za-z0-9_-]{22}$/.test(playlistId)) {
    throw new functions.https.HttpsError('invalid-argument',
      'playlistId must be the uploads playlist id (UU + 22-char channel id)');
  }
  const limit = Math.max(1, Math.min(50, Number(maxResults) || 15));

  const cached = _ytRssCache.get(playlistId);
  if (cached && Date.now() - cached.ts < YOUTUBE_RSS_CACHE_TTL_MS) {
    return { videos: cached.videos.slice(0, limit), cached: true };
  }

  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`;
  const xml = await new Promise((resolve, reject) => {
    const lib = require('https');
    const req = lib.get(url, { timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`YouTube RSS HTTP ${res.statusCode}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('timeout', () => { req.destroy(new Error('YouTube RSS timeout')); });
    req.on('error', reject);
  });

  // Minimal XML parser — entries look like:
  //   <entry>...<yt:videoId>ID</yt:videoId>...<published>DATE</published>...
  //          ...<media:title>TITLE</media:title>...
  //          ...<media:thumbnail url="https://i3.ytimg.com/vi/ID/hqdefault.jpg" .../>
  const videos = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = block.match(/<media:title>([^<]+)<\/media:title>/);
    const publishedMatch = block.match(/<published>([^<]+)<\/published>/);
    const thumbMatch = block.match(/<media:thumbnail[^>]+url="([^"]+)"/);
    if (!idMatch) continue;
    videos.push({
      videoId: idMatch[1],
      title: titleMatch ? titleMatch[1] : 'Untitled',
      publishedAt: publishedMatch ? publishedMatch[1] : null,
      thumbnail: thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${idMatch[1]}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${idMatch[1]}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${idMatch[1]}`,
    });
    if (videos.length >= 50) break;
  }

  _ytRssCache.set(playlistId, { ts: Date.now(), videos });
  return { videos: videos.slice(0, limit), cached: false };
});

exports.stripeWebhook = stripeOnRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(200).send({ received: true, warning: 'webhook secret not configured' });
  }
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return res.status(400).send({ error: `Webhook Error: ${err.message}` });
  }
  switch (event.type) {
    case 'payment_intent.succeeded': console.log('[stripe] Payment succeeded:', event.data.object.id); break;
    case 'payment_intent.payment_failed': console.error('[stripe] Payment failed:', event.data.object.id); break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      console.log(`[stripe] Subscription ${event.type}:`, event.data.object.id, 'status:', event.data.object.status);
      break;
    case 'invoice.payment_succeeded': console.log('[stripe] Invoice payment succeeded'); break;
    case 'invoice.payment_failed': console.error('[stripe] Invoice payment failed'); break;
    default: console.log(`[stripe] Unhandled event: ${event.type}`);
  }
  res.status(200).send({ received: true });
});
