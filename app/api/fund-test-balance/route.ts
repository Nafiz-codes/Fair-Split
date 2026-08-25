import { NextResponse } from "next/server";
import { assertStripeConfigured, stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  try {
    assertStripeConfigured();
    const charge = await stripe.charges.create({
      amount: 50_000,
      currency: "usd",
      source: "tok_bypassPending",
      description: "Fair Split test platform balance funding",
    });

    return NextResponse.json({ success: true, chargeId: charge.id, amount: charge.amount });
  } catch (firstError) {
    try {
      const charge = await stripe.charges.create({
        amount: 50_000,
        currency: "usd",
        source: "tok_visa",
        description: "Fair Split test platform balance funding (fallback)",
      });

      return NextResponse.json({ success: true, chargeId: charge.id, amount: charge.amount, usedFallbackToken: true });
    } catch (fallbackError) {
      const error = fallbackError instanceof Error ? fallbackError.message : firstError instanceof Error ? firstError.message : "Unable to create the test charge.";
      return NextResponse.json({ success: false, error }, { status: 500 });
    }
  }
}
