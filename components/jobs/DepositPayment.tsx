"use client";

import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { CreditCard, Lock, Check } from "lucide-react";
import { formatCents } from "@/lib/utils";
import { motion } from "framer-motion";
import { duration, ease } from "@/lib/design-system/motion";

// ============================================================================
// Types
// ============================================================================

type Props = {
  jobId: string;
  depositPaid: boolean;
  depositAmountCents?: number | null;
};

// ============================================================================
// Stripe promise (singleton)
// ============================================================================

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

// ============================================================================
// Main component
// ============================================================================

export function DepositPayment({
  jobId,
  depositPaid,
  depositAmountCents,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(!depositPaid);
  const [error, setError] = useState<string | null>(null);

  const initPayment = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/deposit`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setClientSecret(data.clientSecret);
        setAmount(data.amount);
      }
    } catch {
      setError("Failed to initialize payment.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!depositPaid && stripePromise) {
      initPayment();
    }
  }, [depositPaid, initPayment]);

  if (depositPaid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.normal, ease: ease.enter }}
        className="rounded-xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20"
      >
        <div className="flex items-center gap-3">
          <Check className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-900 dark:text-green-100">
              Deposit Paid
            </p>
            {depositAmountCents && (
              <p className="text-sm text-green-700 dark:text-green-300">
                {formatCents(depositAmountCents)} received
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!stripePromise) {
    return null; // Stripe not configured
  }

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4 h-6 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-32 rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.normal, ease: ease.enter }}
      className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
        <CreditCard className="h-5 w-5" />
        Deposit Required
      </h3>
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
        A deposit of {formatCents(amount)} is required to confirm your
        appointment.
      </p>

      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <DepositForm amount={amount} />
      </Elements>

      <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Lock className="h-3 w-3" />
        Secure payment powered by Stripe
      </div>
    </motion.div>
  );
}

// ============================================================================
// Inner form (needs Stripe context)
// ============================================================================

function DepositForm({ amount }: { amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (submitError) {
      setError(submitError.message || "Payment failed");
      setProcessing(false);
    }
    // On success, Stripe redirects — no need to handle here
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="mt-4 h-12 w-full rounded-lg bg-[hsl(var(--primary-600))] font-medium text-white hover:bg-[hsl(var(--primary-700))] disabled:opacity-50"
      >
        {processing ? "Processing..." : `Pay ${formatCents(amount)} Deposit`}
      </button>
    </form>
  );
}
