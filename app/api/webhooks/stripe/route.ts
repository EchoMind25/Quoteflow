import { NextResponse } from "next/server";

export async function POST() {
  // Stripe webhook will be implemented in the payments feature phase
  return NextResponse.json(
    { error: "Not implemented" },
    { status: 501 },
  );
}
