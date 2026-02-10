import { NextRequest, NextResponse } from "next/server";
import { createDepositPaymentIntent } from "@/lib/stripe/deposits";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const result = await createDepositPaymentIntent(jobId);

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create payment intent";
    console.error("Deposit API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
