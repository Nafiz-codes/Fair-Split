import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = new Stripe(secretKey ?? "sk_test_missing_key");

export function assertStripeConfigured() {
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
}
