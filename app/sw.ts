/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type { PrecacheEntry } from "serwist";
import { Serwist } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  StaleWhileRevalidate,
} from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const SYNC_TAG = "quoteflow-offline-sync";

// ============================================================================
// Serwist instance — precaching + runtime caching
// ============================================================================

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // -----------------------------------------------------------------------
    // QuoteFlow API responses — NetworkFirst with 5 min cache
    // -----------------------------------------------------------------------
    {
      matcher: ({ sameOrigin, request, url }) =>
        sameOrigin &&
        url.pathname.startsWith("/api/") &&
        !url.pathname.includes("/webhooks/") &&
        request.method === "GET",
      handler: new NetworkFirst({
        cacheName: "qf-api-responses",
        networkTimeoutSeconds: 10,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 5 * 60, // 5 minutes TTL
          }),
        ],
      }),
    },

    // -----------------------------------------------------------------------
    // Supabase Storage (photos, PDFs) — CacheFirst, 7-day TTL
    // -----------------------------------------------------------------------
    {
      matcher: ({ url }) =>
        url.hostname.endsWith(".supabase.co") &&
        url.pathname.includes("/storage/"),
      handler: new CacheFirst({
        cacheName: "qf-supabase-storage",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },

    // -----------------------------------------------------------------------
    // Static assets from /_next/static — immutable, CacheFirst
    // -----------------------------------------------------------------------
    {
      matcher: ({ url }) => url.pathname.startsWith("/_next/static"),
      handler: new CacheFirst({
        cacheName: "qf-next-static",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },

    // -----------------------------------------------------------------------
    // Image assets — StaleWhileRevalidate, 30-day TTL
    // -----------------------------------------------------------------------
    {
      matcher: ({ request }) => request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "qf-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },

    // -----------------------------------------------------------------------
    // Font files — CacheFirst, 1-year TTL
    // -----------------------------------------------------------------------
    {
      matcher: ({ request }) => request.destination === "font",
      handler: new CacheFirst({
        cacheName: "qf-fonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },

    // -----------------------------------------------------------------------
    // HTML pages / navigations — NetworkFirst, 24h cache fallback
    // -----------------------------------------------------------------------
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "qf-pages",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
});

// ============================================================================
// Background Sync — process the IndexedDB offline queue
// ============================================================================

self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync(): Promise<void> {
  // POST to our sync endpoint — the server action processes the queue items
  // sent as JSON in the request body.  We read them from IndexedDB here
  // (the idb library works in Service Workers) and send them in bulk.
  try {
    const { openDB } = await import("idb");
    const db = await openDB("quoteflow", 3);
    const items: unknown[] = await db.getAllFromIndex(
      "offline_queue",
      "by-timestamp",
    );

    if (items.length === 0) return;

    const response = await self.fetch("/api/sync/offline-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, source: "background-sync" }),
    });

    if (!response.ok) {
      throw new Error(`Sync API returned ${response.status}`);
    }

    const result: {
      processed_ids?: string[];
      id_mappings?: { temp_id: string; real_id: string }[];
      conflicts?: {
        item_id: string;
        quote_id: string;
        server_updated_at: string;
      }[];
    } = await response.json();

    // Remove successfully processed items from the local queue
    if (result.processed_ids) {
      const tx = db.transaction("offline_queue", "readwrite");
      for (const id of result.processed_ids) {
        await tx.store.delete(id);
      }
      await tx.done;
    }

    // Handle ID mappings — replace temp IDs in caches
    if (result.id_mappings && result.id_mappings.length > 0) {
      const quoteTx = db.transaction(
        ["quotes_cache", "photos_cache", "audio_cache"],
        "readwrite",
      );
      const quotesStore = quoteTx.objectStore("quotes_cache");
      const photosStore = quoteTx.objectStore("photos_cache");
      const audioStore = quoteTx.objectStore("audio_cache");

      for (const mapping of result.id_mappings) {
        // Replace quote in quotes_cache
        const oldQuote = await quotesStore.get(mapping.temp_id);
        if (oldQuote) {
          await quotesStore.delete(mapping.temp_id);
          await quotesStore.put({
            id: mapping.real_id,
            quote_data: {
              ...oldQuote.quote_data,
              id: mapping.real_id,
              _pending: false,
            },
            last_synced: Date.now(),
          });
        }

        // Update photos referencing the temp quote_id
        const photoIndex = photosStore.index("by-quote");
        let photoCursor = await photoIndex.openCursor(mapping.temp_id);
        while (photoCursor) {
          await photoCursor.update({
            ...photoCursor.value,
            quote_id: mapping.real_id,
          });
          photoCursor = await photoCursor.continue();
        }

        // Update audio referencing the temp quote_id
        const audioIndex = audioStore.index("by-quote");
        let audioCursor = await audioIndex.openCursor(mapping.temp_id);
        while (audioCursor) {
          await audioCursor.update({
            ...audioCursor.value,
            quote_id: mapping.real_id,
          });
          audioCursor = await audioCursor.continue();
        }
      }

      await quoteTx.done;
    }

    // Show notification on sync complete
    const count = result.processed_ids?.length ?? 0;
    if (count > 0) {
      await self.registration.showNotification("QuoteFlow", {
        body: `${count} item${count !== 1 ? "s" : ""} synced successfully`,
        tag: "sync-complete",
      });
    }

    // Notify all open tabs that sync completed (include id_mappings + conflicts)
    const clients = await self.clients.matchAll({ type: "window" });
    for (const client of clients) {
      client.postMessage({
        type: "SYNC_COMPLETE",
        processed: count,
        timestamp: Date.now(),
        id_mappings: result.id_mappings ?? [],
        conflicts: result.conflicts ?? [],
      });
    }
  } catch (error) {
    // Log and re-throw — the browser will retry the sync event
    // eslint-disable-next-line no-console
    console.error("[QuoteFlow SW] Background sync failed:", error);
    throw error;
  }
}

// ============================================================================
// Listen for messages from the main thread
// ============================================================================

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================================================
// Activate Serwist lifecycle listeners (install, activate, fetch, etc.)
// ============================================================================

serwist.addEventListeners();
