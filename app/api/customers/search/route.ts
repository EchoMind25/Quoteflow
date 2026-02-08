import { NextResponse, type NextRequest } from "next/server";
import { searchCustomers } from "@/lib/actions/customers";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (query.trim().length === 0) {
    return NextResponse.json([]);
  }

  const results = await searchCustomers(query);
  return NextResponse.json(results);
}
