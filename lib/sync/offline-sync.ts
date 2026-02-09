import { createClient } from "@/lib/supabase/client";
import type {
  QuoteInsert,
  QuoteUpdate,
  QuoteLineItemInsert,
  CustomerInsert,
} from "@/types/database";
import {
  getPendingQueueItems,
  removeFromQueue,
  incrementRetries,
  getUnuploadedPhotos,
  markPhotoUploaded,
  removeCachedPhoto,
  getUnuploadedAudio,
  markAudioUploaded,
  removeCachedAudio,
  cacheQuote,
  cacheCustomer,
  replaceTempQuoteId,
  type OfflineQueueItem,
} from "@/lib/db/indexed-db";

// ============================================================================
// Types
// ============================================================================

export type SyncResult = {
  processed: number;
  failed: number;
  errors: { id: string; error: string }[];
  id_mappings?: { temp_id: string; real_id: string }[];
  conflicts?: {
    item_id: string;
    quote_id: string;
    server_updated_at: string;
  }[];
};

type SyncEventDetail = {
  type: "SYNC_START" | "SYNC_PROGRESS" | "SYNC_COMPLETE" | "SYNC_ERROR";
  processed?: number;
  total?: number;
  error?: string;
  id_mappings?: { temp_id: string; real_id: string }[];
  conflicts?: {
    item_id: string;
    quote_id: string;
    server_updated_at: string;
  }[];
};

// ============================================================================
// Background Sync Registration
// ============================================================================

const SYNC_TAG = "quotestream-offline-sync";

export async function requestBackgroundSync(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // Background Sync API may not be available on all browsers
    if ("sync" in registration) {
      await (
        registration as ServiceWorkerRegistration & {
          sync: { register(tag: string): Promise<void> };
        }
      ).sync.register(SYNC_TAG);
      return true;
    }
  } catch {
    // Sync registration failed — fall back to manual sync
  }

  return false;
}

// ============================================================================
// Main sync orchestrator
// ============================================================================

export async function processOfflineSync(): Promise<SyncResult> {
  const result: SyncResult = {
    processed: 0,
    failed: 0,
    errors: [],
    id_mappings: [],
    conflicts: [],
  };

  emitSyncEvent({ type: "SYNC_START" });

  // 1. Upload cached photos first (other actions may depend on them)
  await uploadCachedPhotos(result);

  // 2. Upload cached audio files
  await uploadCachedAudio(result);

  // 3. Process the offline action queue
  await processActionQueue(result);

  // 4. Refresh local caches with latest server data
  await refreshCaches();

  emitSyncEvent({
    type: "SYNC_COMPLETE",
    processed: result.processed,
    total: result.processed + result.failed,
    id_mappings: result.id_mappings,
    conflicts: result.conflicts,
  });

  return result;
}

// ============================================================================
// Photo uploads (batched, 3 concurrent)
// ============================================================================

const PHOTO_BATCH_SIZE = 3;

async function uploadCachedPhotos(result: SyncResult): Promise<void> {
  const photos = await getUnuploadedPhotos();
  if (photos.length === 0) return;

  const supabase = createClient();

  for (let i = 0; i < photos.length; i += PHOTO_BATCH_SIZE) {
    const batch = photos.slice(i, i + PHOTO_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((photo) => uploadSinglePhoto(supabase, photo)),
    );

    for (const settled of results) {
      if (settled.status === "fulfilled") {
        result.processed++;
      } else {
        result.failed++;
        result.errors.push({
          id: batch[results.indexOf(settled)]?.id ?? "unknown",
          error:
            settled.reason instanceof Error
              ? settled.reason.message
              : "Photo upload failed",
        });
      }
    }
  }
}

async function uploadSinglePhoto(
  supabase: ReturnType<typeof createClient>,
  photo: { id: string; blob: Blob; quote_id: string },
): Promise<void> {
  const ext = photo.blob.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `quotes/${photo.quote_id}/${photo.id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("quote-photos")
    .upload(storagePath, photo.blob, {
      contentType: photo.blob.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Record the photo in the database
  const { error: insertError } = await supabase
    .from("quote_photos")
    .insert({
      id: photo.id,
      quote_id: photo.quote_id,
      storage_path: storagePath,
      mime_type: photo.blob.type,
      size_bytes: photo.blob.size,
    });

  if (insertError) throw insertError;

  await markPhotoUploaded(photo.id);
  // Free up storage after successful upload
  await removeCachedPhoto(photo.id);
}

// ============================================================================
// Audio uploads
// ============================================================================

async function uploadCachedAudio(result: SyncResult): Promise<void> {
  const audioItems = await getUnuploadedAudio();
  if (audioItems.length === 0) return;

  const supabase = createClient();

  for (const audio of audioItems) {
    try {
      const ext = audio.mime_type.includes("webm") ? "webm" : "m4a";
      const storagePath = `quotes/${audio.quote_id}/voice_${audio.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("quote-audio")
        .upload(storagePath, audio.blob, {
          contentType: audio.mime_type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Update the quote with the audio URL
      const { error: updateError } = await supabase
        .from("quotes")
        .update({ voice_audio_url: storagePath })
        .eq("id", audio.quote_id);

      if (updateError) throw updateError;

      await markAudioUploaded(audio.id);
      await removeCachedAudio(audio.id);
      result.processed++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        id: audio.id,
        error: err instanceof Error ? err.message : "Audio upload failed",
      });
    }
  }
}

// ============================================================================
// Action queue processing
// ============================================================================

async function processActionQueue(result: SyncResult): Promise<void> {
  const items = await getPendingQueueItems();
  if (items.length === 0) return;

  const supabase = createClient();

  for (const item of items) {
    try {
      await processQueueItem(supabase, item, result);
      await removeFromQueue(item.id);
      result.processed++;

      emitSyncEvent({
        type: "SYNC_PROGRESS",
        processed: result.processed,
        total: items.length,
      });
    } catch (err) {
      await incrementRetries(item.id);
      result.failed++;
      result.errors.push({
        id: item.id,
        error:
          err instanceof Error ? err.message : "Queue processing failed",
      });
    }
  }
}

async function processQueueItem(
  supabase: ReturnType<typeof createClient>,
  item: OfflineQueueItem,
  result: SyncResult,
): Promise<void> {
  switch (item.action) {
    case "create_quote": {
      const { line_items, _temp_id, _pending, ...quoteFields } = item.payload;
      const quoteData = quoteFields as unknown as QuoteInsert;

      const { data: quote, error } = await supabase
        .from("quotes")
        .insert(quoteData)
        .select()
        .single();

      if (error) throw error;

      // Insert line items if present
      if (Array.isArray(line_items) && line_items.length > 0) {
        const rows = (
          line_items as unknown as QuoteLineItemInsert[]
        ).map((li) => ({
          ...li,
          quote_id: quote.id,
        }));

        const { error: liError } = await supabase
          .from("quote_line_items")
          .insert(rows);

        if (liError) throw liError;
      }

      // Replace temp ID in caches if present
      if (typeof _temp_id === "string") {
        const quoteAsRecord = quote as unknown as Record<string, unknown>;
        await replaceTempQuoteId(_temp_id, quote.id, quoteAsRecord);
        result.id_mappings?.push({ temp_id: _temp_id, real_id: quote.id });
      }

      // Suppress unused variable warning
      void _pending;
      break;
    }

    case "update_quote": {
      const { id, _cached_updated_at, ...updates } = item.payload;
      const quoteId = id as string;

      // Conflict detection
      if (typeof _cached_updated_at === "string") {
        const { data: current } = await supabase
          .from("quotes")
          .select("updated_at")
          .eq("id", quoteId)
          .single();

        if (current && current.updated_at > _cached_updated_at) {
          result.conflicts?.push({
            item_id: item.id,
            quote_id: quoteId,
            server_updated_at: current.updated_at,
          });
          emitSyncEvent({
            type: "SYNC_PROGRESS",
            processed: result.processed,
            total: undefined,
          });
        }
      }

      // Last-write-wins: apply update
      const { error } = await supabase
        .from("quotes")
        .update(updates as unknown as QuoteUpdate)
        .eq("id", quoteId);

      if (error) throw error;
      break;
    }

    case "update_quote_status": {
      const { id: quoteId, status, ...timestamps } = item.payload;
      const { error } = await supabase
        .from("quotes")
        .update({
          status,
          ...timestamps,
        } as unknown as QuoteUpdate)
        .eq("id", quoteId as string);

      if (error) throw error;
      break;
    }

    case "create_customer": {
      const { error } = await supabase
        .from("customers")
        .insert(item.payload as unknown as CustomerInsert);

      if (error) throw error;
      break;
    }

    case "upload_photo": {
      // Photos are handled separately in uploadCachedPhotos().
      break;
    }

    case "upload_audio": {
      // Audio is handled separately in uploadCachedAudio().
      break;
    }

    case "send_quote": {
      // Delegate to the sync API endpoint (email/SMS requires server-side)
      const response = await fetch("/api/sync/offline-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [item], source: "client-sync" }),
      });
      if (!response.ok) {
        throw new Error(`Sync API returned ${response.status}`);
      }
      break;
    }

    default:
      throw new Error(`Unknown queue action: ${item.action}`);
  }
}

// ============================================================================
// Cache refresh (pull latest from server)
// ============================================================================

async function refreshCaches(): Promise<void> {
  const supabase = createClient();

  // Pull latest quotes for this business (only fields needed for cache/list)
  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      "id, business_id, customer_id, created_by, quote_number, title, status, subtotal_cents, tax_rate, tax_cents, discount_cents, total_cents, expires_at, sent_at, viewed_at, accepted_at, declined_at, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  if (quotes) {
    for (const quote of quotes) {
      await cacheQuote(
        quote.id,
        quote as unknown as Record<string, unknown>,
      );
    }
  }

  // Pull latest customers for this business
  const { data: customers } = await supabase
    .from("customers")
    .select(
      "id, business_id, first_name, last_name, email, phone, company_name, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (customers) {
    for (const customer of customers) {
      await cacheCustomer(
        customer.id,
        customer as unknown as Record<string, unknown>,
      );
    }
  }
}

// ============================================================================
// Event emitter (notifies UI components)
// ============================================================================

function emitSyncEvent(detail: SyncEventDetail): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("quotestream-sync", { detail }),
    );
  }
}

// ============================================================================
// Online/offline helpers
// ============================================================================

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function onOnline(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}

export function onOffline(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("offline", callback);
  return () => window.removeEventListener("offline", callback);
}
