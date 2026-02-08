import {
  cacheQuote,
  enqueueOfflineAction,
} from "@/lib/db/indexed-db";
import { requestBackgroundSync, isOnline } from "@/lib/sync/offline-sync";

// ============================================================================
// Types
// ============================================================================

export type OptimisticLineItem = {
  title: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  line_total_cents: number;
  item_type: string;
  sort_order: number;
};

export type OptimisticQuoteInput = {
  businessId: string;
  userId: string;
  title: string;
  description?: string;
  customerId?: string;
  lineItems: OptimisticLineItem[];
  voiceTranscript?: string;
  voiceConfidence?: number;
  taxRate?: number;
  expiresAt?: string;
};

export type OptimisticQuoteResult = {
  tempId: string;
  quoteData: Record<string, unknown>;
};

// ============================================================================
// Create quote optimistically
// ============================================================================

export async function createQuoteOptimistic(
  input: OptimisticQuoteInput,
): Promise<OptimisticQuoteResult> {
  const tempId = crypto.randomUUID();
  const shortId = tempId.slice(0, 8);
  const now = new Date().toISOString();

  // Calculate totals from line items
  const subtotalCents = input.lineItems.reduce(
    (sum, li) => sum + li.line_total_cents,
    0,
  );

  const taxRate = input.taxRate ?? 0;
  const taxCents = Math.round(subtotalCents * (taxRate / 100));

  const quoteData: Record<string, unknown> = {
    id: tempId,
    business_id: input.businessId,
    created_by: input.userId,
    title: input.title,
    description: input.description ?? null,
    customer_id: input.customerId ?? null,
    quote_number: `PENDING-${shortId}`,
    status: "draft",
    subtotal_cents: subtotalCents,
    tax_rate: taxRate,
    tax_cents: taxCents,
    discount_cents: 0,
    total_cents: subtotalCents + taxCents,
    notes: null,
    customer_notes: null,
    expires_at: input.expiresAt ?? null,
    sent_at: null,
    viewed_at: null,
    accepted_at: null,
    declined_at: null,
    voice_transcript: input.voiceTranscript ?? null,
    voice_audio_url: null,
    voice_confidence: input.voiceConfidence ?? null,
    created_at: now,
    updated_at: now,
    _pending: true,
    _temp_id: tempId,
  };

  // Store in quotes cache
  await cacheQuote(tempId, quoteData);

  // Enqueue for sync
  await enqueueOfflineAction("create_quote", {
    ...quoteData,
    line_items: input.lineItems,
  });

  // Trigger background sync if online
  if (isOnline()) {
    await requestBackgroundSync();
  }

  return { tempId, quoteData };
}
