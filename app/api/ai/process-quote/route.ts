import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  // AI processing pipeline will be implemented in the AI feature phase
  return NextResponse.json(
    { error: "Not implemented" },
    { status: 501 },
  );
}
