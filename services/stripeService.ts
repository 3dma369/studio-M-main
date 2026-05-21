import { loadStripe } from '@stripe/stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseSetup';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

let stripePromise: Promise<any> | null = null;

export function getStripe() {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
}

// Create Stripe customer
export async function createCustomer(email: string, name?: string) {
  try {
    const fn = httpsCallable(functions, 'stripeCreateCustomer');
    const result = await fn({ email, name });
    return (result.data as any).customerId;
  } catch (err: any) {
    console.error('[stripeService] createCustomer error:', err.message);
    throw err;
  }
}

// Create Stripe Checkout session for subscription
export async function createCheckoutSession(priceId: string, customerId?: string, customerEmail?: string) {
  try {
    const fn = httpsCallable(functions, 'stripeCreateCheckoutSession');
    const result = await fn({ priceId, customerId, customerEmail });
    const { url } = result.data as any;
    if (url) window.location.href = url;
  } catch (err: any) {
    console.error('[stripeService] createCheckoutSession error:', err.message);
    throw err;
  }
}

// Open Stripe Customer Portal
export async function openBillingPortal(customerId: string) {
  try {
    const fn = httpsCallable(functions, 'stripeCreatePortalSession');
    const result = await fn({ customerId });
    const { url } = result.data as any;
    if (url) window.location.href = url;
  } catch (err: any) {
    console.error('[stripeService] openBillingPortal error:', err.message);
    throw err;
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string, cancelNow: boolean = false) {
  try {
    const fn = httpsCallable(functions, 'stripeCancelSubscription');
    const result = await fn({ subscriptionId, cancelNow });
    return result.data;
  } catch (err: any) {
    console.error('[stripeService] cancelSubscription error:', err.message);
    throw err;
  }
}

// Create one-time payment intent (for service packages)
export async function createPaymentIntent(amount: number, metadata?: Record<string, string>) {
  try {
    const fn = httpsCallable(functions, 'stripeCreatePaymentIntent');
    const result = await fn({ amount, metadata });
    return result.data as { clientSecret: string; paymentIntentId: string };
  } catch (err: any) {
    console.error('[stripeService] createPaymentIntent error:', err.message);
    throw err;
  }
}

// Legacy stripeService API (kept for backward compatibility)
export const stripeService = {
  async checkout(cartItems: any[]) {
    // Redirect to Stripe Checkout for the first item as a subscription
    const priceId = cartItems[0]?.priceId;
    if (priceId) {
      return createCheckoutSession(priceId);
    }
    // One-time payment
    const total = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    return createPaymentIntent(total);
  },

  async donate(amount: number) {
    return createPaymentIntent(amount, { type: 'donation' });
  },

  async subscribe(tier: string, priceId: string) {
    return createCheckoutSession(priceId);
  },
};