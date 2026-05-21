const functions = require("firebase-functions");
const stripeSecret = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY || '';
const stripe = require("stripe")(stripeSecret);

exports.stripeCreateCustomer = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const { email, name } = data;
  if (!email) throw new functions.https.HttpsError("invalid-argument", "email required");
  const customer = await stripe.customers.create({ email, name: name || "", metadata: { userId: context.auth.uid } });
  return { customerId: customer.id };
});

exports.stripeCreateSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const { customerId, priceId } = data;
  if (!customerId || !priceId) throw new functions.https.HttpsError("invalid-argument", "customerId and priceId required");
  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
    metadata: { userId: context.auth.uid },
  });
  const invoice = sub.latest_invoice;
  return { subscriptionId: sub.id, clientSecret: invoice?.payment_intent?.client_secret, status: sub.status };
});

exports.stripeCreateCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const { customerId, priceId, customerEmail } = data;
  const params = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: "https://studio-m.web.app/?checkout=success",
    cancel_url: "https://studio-m.web.app/?checkout=cancelled",
    metadata: { userId: context.auth.uid },
  };
  if (customerId) params["customer"] = customerId;
  else if (customerEmail) params["customer_email"] = customerEmail;
  const session = await stripe.checkout.sessions.create(params);
  return { url: session.url };
});

exports.stripeCreatePortalSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const { customerId } = data;
  if (!customerId) throw new functions.https.HttpsError("invalid-argument", "customerId required");
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: "https://studio-m.web.app/",
  });
  return { url: session.url };
});

exports.stripeCancelSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const { subscriptionId, cancelNow } = data;
  if (!subscriptionId) throw new functions.https.HttpsError("invalid-argument", "subscriptionId required");
  const sub = cancelNow
    ? await stripe.subscriptions.cancel(subscriptionId)
    : await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  return { subscriptionId: sub.id, status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end };
});

exports.stripeCreatePaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const { amount, metadata } = data;
  if (!amount) throw new functions.https.HttpsError("invalid-argument", "amount required");
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { userId: context.auth.uid, ...(metadata || {}) },
  });
  return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
});

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return res.status(200).send({ received: true, warning: "webhook secret not configured" });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err.message);
    return res.status(400).send({ error: `Webhook Error: ${err.message}` });
  }
  switch (event.type) {
    case "payment_intent.succeeded": console.log("[stripe] Payment succeeded:", event.data.object.id); break;
    case "payment_intent.payment_failed": console.error("[stripe] Payment failed:", event.data.object.id); break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      console.log(`[stripe] Subscription ${event.type}:`, event.data.object.id, "status:", event.data.object.status);
      break;
    case "invoice.payment_succeeded": console.log("[stripe] Invoice payment succeeded"); break;
    case "invoice.payment_failed": console.error("[stripe] Invoice payment failed"); break;
    default: console.log(`[stripe] Unhandled event: ${event.type}`);
  }
  res.status(200).send({ received: true });
});