import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";

// ============================================================================
// Stripe client
// ============================================================================

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

// ============================================================================
// Create deposit payment intent
// ============================================================================

export async function createDepositPaymentIntent(jobId: string) {
  const supabase = createServiceClient();
  const stripe = getStripeClient();

  // Get job with business and quote
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, deposit_amount_cents, deposit_paid, business_id, quote_id",
    )
    .eq("id", jobId)
    .single();

  if (!job) throw new Error("Job not found");
  if (job.deposit_paid) throw new Error("Deposit already paid");

  // Get business Stripe account and deposit settings
  const { data: business } = await supabase
    .from("businesses")
    .select(
      "stripe_account_id, deposit_required, deposit_type, deposit_amount",
    )
    .eq("id", job.business_id)
    .single();

  if (!business) throw new Error("Business not found");

  // Get quote total for percentage calculation
  const { data: quote } = await supabase
    .from("quotes")
    .select("total_cents")
    .eq("id", job.quote_id)
    .single();

  if (!quote) throw new Error("Quote not found");

  // Calculate deposit amount
  let depositCents: number;
  if (job.deposit_amount_cents) {
    // Already computed (e.g., from a previous failed attempt)
    depositCents = job.deposit_amount_cents;
  } else if (business.deposit_type === "percentage") {
    depositCents = Math.round(
      quote.total_cents * ((business.deposit_amount || 25) / 100),
    );
  } else {
    depositCents = (business.deposit_amount || 25) * 100;
  }

  // Minimum Stripe amount is $0.50
  if (depositCents < 50) depositCents = 50;

  // Create payment intent
  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount: depositCents,
    currency: "usd",
    metadata: {
      job_id: jobId,
    },
  };

  // If business has Stripe Connect, use destination charge
  if (business.stripe_account_id) {
    paymentIntentParams.application_fee_amount = Math.round(
      depositCents * 0.029,
    );
    paymentIntentParams.transfer_data = {
      destination: business.stripe_account_id,
    };
  }

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

  // Store deposit info on job
  await supabase
    .from("jobs")
    .update({
      deposit_amount_cents: depositCents,
      stripe_payment_intent_id: paymentIntent.id,
    })
    .eq("id", jobId);

  return {
    clientSecret: paymentIntent.client_secret,
    amount: depositCents,
  };
}

// ============================================================================
// Handle deposit webhook
// ============================================================================

export async function handleDepositWebhook(event: Stripe.Event) {
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const jobId = paymentIntent.metadata.job_id;

    if (jobId) {
      const supabase = createServiceClient();

      await supabase
        .from("jobs")
        .update({
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString(),
          status: "confirmed",
        })
        .eq("id", jobId);

      // Add timeline entry
      await supabase.from("job_updates").insert({
        job_id: jobId,
        update_type: "status_change",
        old_status: "scheduled",
        new_status: "confirmed",
        message: `Deposit of $${(paymentIntent.amount / 100).toFixed(2)} received`,
        sender_type: "system",
      });
    }
  }
}
