import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendQuoteEmail } from "@/lib/email/send-quote";
import { sendQuoteSMS } from "@/lib/sms/send-quote";
import type {
  QuoteInsert,
  QuoteUpdate,
  QuoteLineItemInsert,
  CustomerInsert,
} from "@/types/database";

export const runtime = "nodejs";

// ============================================================================
// Types
// ============================================================================

type QueueItem = {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
};

type SyncResponse = {
  processed_ids: string[];
  failed: { id: string; error: string }[];
  id_mappings: { temp_id: string; real_id: string }[];
  conflicts: {
    item_id: string;
    quote_id: string;
    server_updated_at: string;
  }[];
};

// ============================================================================
// POST handler
// ============================================================================

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Verify auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: { items: QueueItem[]; source?: string } = await request.json();

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 },
      );
    }

    const result: SyncResponse = {
      processed_ids: [],
      failed: [],
      id_mappings: [],
      conflicts: [],
    };

    for (const item of body.items) {
      try {
        await processItem(supabase, item, result);
        result.processed_ids.push(item.id);
      } catch (err) {
        result.failed.push({
          id: item.id,
          error: err instanceof Error ? err.message : "Processing failed",
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sync/offline-queue] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Item processor
// ============================================================================

async function processItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  item: QueueItem,
  result: SyncResponse,
): Promise<void> {
  switch (item.action) {
    case "create_quote": {
      const { line_items, _temp_id, _pending, ...quoteFields } = item.payload;
      // Remove internal fields before inserting
      const quoteData = quoteFields as unknown as QuoteInsert;

      const { data: quote, error } = await supabase
        .from("quotes")
        .insert(quoteData)
        .select()
        .single();

      if (error) throw error;

      // Insert line items if present
      if (Array.isArray(line_items) && line_items.length > 0) {
        const rows = (line_items as unknown as QuoteLineItemInsert[]).map(
          (li) => ({
            ...li,
            quote_id: quote.id,
          }),
        );

        const { error: liError } = await supabase
          .from("quote_line_items")
          .insert(rows);

        if (liError) throw liError;
      }

      // Return ID mapping for temp IDs
      if (typeof _temp_id === "string") {
        result.id_mappings.push({ temp_id: _temp_id, real_id: quote.id });
      }

      // Suppress unused variable warnings
      void _pending;
      break;
    }

    case "update_quote": {
      const { id, _cached_updated_at, ...updates } = item.payload;
      const quoteId = id as string;

      // Conflict detection: check server's updated_at
      if (typeof _cached_updated_at === "string") {
        const { data: current } = await supabase
          .from("quotes")
          .select("updated_at")
          .eq("id", quoteId)
          .single();

        if (current && current.updated_at > _cached_updated_at) {
          result.conflicts.push({
            item_id: item.id,
            quote_id: quoteId,
            server_updated_at: current.updated_at,
          });
        }
      }

      // Last-write-wins: apply update regardless of conflict
      const { error } = await supabase
        .from("quotes")
        .update(updates as unknown as QuoteUpdate)
        .eq("id", quoteId);

      if (error) throw error;
      break;
    }

    case "update_quote_status": {
      const { id: statusQuoteId, status, ...timestamps } = item.payload;
      const { error } = await supabase
        .from("quotes")
        .update({
          status,
          ...timestamps,
        } as unknown as QuoteUpdate)
        .eq("id", statusQuoteId as string);

      if (error) throw error;
      break;
    }

    case "create_customer": {
      const { _temp_id: customerTempId, ...customerFields } = item.payload;
      const { data: customer, error } = await supabase
        .from("customers")
        .insert(customerFields as unknown as CustomerInsert)
        .select()
        .single();

      if (error) throw error;

      if (typeof customerTempId === "string" && customer) {
        result.id_mappings.push({
          temp_id: customerTempId,
          real_id: customer.id,
        });
      }
      break;
    }

    case "send_quote": {
      await handleSendQuote(supabase, item.payload);
      break;
    }

    case "upload_photo":
    case "upload_audio": {
      // No-op: handled by client-side blob uploads
      break;
    }

    default:
      throw new Error(`Unknown queue action: ${item.action}`);
  }
}

// ============================================================================
// Send quote handler (mirrors lib/actions/quotes.ts sendQuote logic)
// ============================================================================

async function handleSendQuote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: Record<string, unknown>,
): Promise<void> {
  const quoteId = payload.quote_id as string;
  const deliveryMethod = (payload.delivery_method as string) ?? "email";

  if (!quoteId) throw new Error("quote_id is required");

  // Fetch quote
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) throw new Error("Quote not found");
  if (quote.status !== "draft") throw new Error(`Quote already ${quote.status}`);

  // Fetch line items
  const { data: lineItems } = await supabase
    .from("quote_line_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order");

  // Fetch customer
  if (!quote.customer_id) throw new Error("No customer on quote");
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", quote.customer_id)
    .single();

  if (!customer) throw new Error("Customer not found");

  // Fetch business
  const { data: business } = await supabase
    .from("businesses")
    .select("name, logo_url, primary_color, email, phone")
    .eq("id", quote.business_id)
    .single();

  if (!business) throw new Error("Business not found");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${appUrl}/public/quotes/${quoteId}`;

  const errors: string[] = [];

  // Email
  if (deliveryMethod === "email" || deliveryMethod === "both") {
    if (customer.email) {
      const emailResult = await sendQuoteEmail({
        quote,
        lineItems: lineItems ?? [],
        customer,
        business,
        publicUrl,
      });
      if (!emailResult.success) {
        errors.push(`Email: ${emailResult.error}`);
      }
    }
  }

  // SMS
  if (deliveryMethod === "sms" || deliveryMethod === "both") {
    if (customer.phone) {
      const smsResult = await sendQuoteSMS({
        to: customer.phone,
        businessName: business.name,
        quoteNumber: quote.quote_number,
        totalCents: quote.total_cents,
        publicUrl,
      });
      if (!smsResult.success) {
        errors.push(`SMS: ${smsResult.error}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(". "));
  }

  // Update status
  const { error: updateError } = await supabase
    .from("quotes")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", quoteId);

  if (updateError) throw updateError;
}
