import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// ============================================================================
// Schema
// ============================================================================

export interface OfflineQueueItem {
  id: string;
  action:
    | "create_quote"
    | "update_quote"
    | "create_customer"
    | "upload_photo"
    | "upload_audio"
    | "update_quote_status"
    | "send_quote";
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

export interface QuoteCacheItem {
  id: string;
  quote_data: Record<string, unknown>;
  last_synced: number;
}

export interface PhotoCacheItem {
  id: string;
  blob: Blob;
  quote_id: string;
  uploaded: number; // 0 = not uploaded, 1 = uploaded (matches IndexedDB index type)
}

export interface AudioCacheItem {
  id: string;
  blob: Blob;
  quote_id: string;
  duration_seconds: number;
  mime_type: string;
  uploaded: number; // 0 = not uploaded, 1 = uploaded (matches IndexedDB index type)
}

export interface CustomerCacheItem {
  id: string;
  customer_data: Record<string, unknown>;
  last_synced: number;
}

interface QuotestreamDB extends DBSchema {
  offline_queue: {
    key: string;
    value: OfflineQueueItem;
    indexes: {
      "by-timestamp": number;
      "by-action": string;
    };
  };
  quotes_cache: {
    key: string;
    value: QuoteCacheItem;
    indexes: { "by-last-synced": number };
  };
  photos_cache: {
    key: string;
    value: PhotoCacheItem;
    indexes: {
      "by-quote": string;
      "by-uploaded": number; // 0 = not uploaded, 1 = uploaded
    };
  };
  audio_cache: {
    key: string;
    value: AudioCacheItem;
    indexes: {
      "by-quote": string;
      "by-uploaded": number;
    };
  };
  customers_cache: {
    key: string;
    value: CustomerCacheItem;
    indexes: { "by-last-synced": number };
  };
}

// ============================================================================
// Database init (singleton)
// ============================================================================

const DB_NAME = "quotestream";
const DB_VERSION = 3;
const MAX_RETRIES = 5;

let dbPromise: Promise<IDBPDatabase<QuotestreamDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<QuotestreamDB>> {
  if (!dbPromise) {
    dbPromise = openDB<QuotestreamDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Drop old v1 stores if upgrading
        if (oldVersion < 2) {
          for (const name of db.objectStoreNames) {
            db.deleteObjectStore(name);
          }

          // offline_queue
          const queueStore = db.createObjectStore("offline_queue", {
            keyPath: "id",
          });
          queueStore.createIndex("by-timestamp", "timestamp");
          queueStore.createIndex("by-action", "action");

          // quotes_cache
          const quotesStore = db.createObjectStore("quotes_cache", {
            keyPath: "id",
          });
          quotesStore.createIndex("by-last-synced", "last_synced");

          // photos_cache
          const photosStore = db.createObjectStore("photos_cache", {
            keyPath: "id",
          });
          photosStore.createIndex("by-quote", "quote_id");
          photosStore.createIndex("by-uploaded", "uploaded");

          // customers_cache
          const customersStore = db.createObjectStore("customers_cache", {
            keyPath: "id",
          });
          customersStore.createIndex("by-last-synced", "last_synced");
        }

        // v3: audio_cache store
        if (oldVersion < 3) {
          const audioStore = db.createObjectStore("audio_cache", {
            keyPath: "id",
          });
          audioStore.createIndex("by-quote", "quote_id");
          audioStore.createIndex("by-uploaded", "uploaded");
        }
      },
    });
  }
  return dbPromise;
}

// ============================================================================
// Offline Queue
// ============================================================================

export async function enqueueOfflineAction(
  action: OfflineQueueItem["action"],
  payload: Record<string, unknown>,
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.put("offline_queue", {
    id,
    action,
    payload,
    timestamp: Date.now(),
    retries: 0,
  });
  return id;
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("offline_queue", "by-timestamp");
}

export async function getPendingQueueItems(): Promise<OfflineQueueItem[]> {
  const items = await getOfflineQueue();
  return items.filter((item) => item.retries < MAX_RETRIES);
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("offline_queue", id);
}

export async function incrementRetries(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get("offline_queue", id);
  if (item) {
    item.retries += 1;
    await db.put("offline_queue", item);
  }
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();
  await db.clear("offline_queue");
}

export async function getQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count("offline_queue");
}

// ============================================================================
// Quotes Cache
// ============================================================================

export async function cacheQuote(
  id: string,
  quoteData: Record<string, unknown>,
): Promise<void> {
  const db = await getDB();
  await db.put("quotes_cache", {
    id,
    quote_data: quoteData,
    last_synced: Date.now(),
  });
}

export async function getCachedQuote(
  id: string,
): Promise<QuoteCacheItem | undefined> {
  const db = await getDB();
  return db.get("quotes_cache", id);
}

export async function getAllCachedQuotes(): Promise<QuoteCacheItem[]> {
  const db = await getDB();
  return db.getAll("quotes_cache");
}

export async function removeCachedQuote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("quotes_cache", id);
}

export async function clearQuotesCache(): Promise<void> {
  const db = await getDB();
  await db.clear("quotes_cache");
}

// ============================================================================
// Photos Cache
// ============================================================================

export async function cachePhoto(
  quoteId: string,
  blob: Blob,
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.put("photos_cache", {
    id,
    blob,
    quote_id: quoteId,
    uploaded: 0,
  });
  return id;
}

export async function getCachedPhoto(
  id: string,
): Promise<PhotoCacheItem | undefined> {
  const db = await getDB();
  return db.get("photos_cache", id);
}

export async function getPhotosByQuote(
  quoteId: string,
): Promise<PhotoCacheItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("photos_cache", "by-quote", quoteId);
}

export async function getUnuploadedPhotos(): Promise<PhotoCacheItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("photos_cache", "by-uploaded", 0);
}

export async function markPhotoUploaded(id: string): Promise<void> {
  const db = await getDB();
  const photo = await db.get("photos_cache", id);
  if (photo) {
    photo.uploaded = 1;
    await db.put("photos_cache", photo);
  }
}

export async function removeCachedPhoto(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("photos_cache", id);
}

export async function clearPhotosCache(): Promise<void> {
  const db = await getDB();
  await db.clear("photos_cache");
}

// ============================================================================
// Customers Cache
// ============================================================================

export async function cacheCustomer(
  id: string,
  customerData: Record<string, unknown>,
): Promise<void> {
  const db = await getDB();
  await db.put("customers_cache", {
    id,
    customer_data: customerData,
    last_synced: Date.now(),
  });
}

export async function getCachedCustomer(
  id: string,
): Promise<CustomerCacheItem | undefined> {
  const db = await getDB();
  return db.get("customers_cache", id);
}

export async function getAllCachedCustomers(): Promise<CustomerCacheItem[]> {
  const db = await getDB();
  return db.getAll("customers_cache");
}

export async function removeCachedCustomer(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("customers_cache", id);
}

export async function clearCustomersCache(): Promise<void> {
  const db = await getDB();
  await db.clear("customers_cache");
}

// ============================================================================
// Audio Cache
// ============================================================================

export async function cacheAudio(
  quoteId: string,
  blob: Blob,
  durationSeconds: number,
  mimeType: string,
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.put("audio_cache", {
    id,
    blob,
    quote_id: quoteId,
    duration_seconds: durationSeconds,
    mime_type: mimeType,
    uploaded: 0,
  });
  return id;
}

export async function getCachedAudio(
  id: string,
): Promise<AudioCacheItem | undefined> {
  const db = await getDB();
  return db.get("audio_cache", id);
}

export async function getAudioByQuote(
  quoteId: string,
): Promise<AudioCacheItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("audio_cache", "by-quote", quoteId);
}

export async function getUnuploadedAudio(): Promise<AudioCacheItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("audio_cache", "by-uploaded", 0);
}

export async function markAudioUploaded(id: string): Promise<void> {
  const db = await getDB();
  const audio = await db.get("audio_cache", id);
  if (audio) {
    audio.uploaded = 1;
    await db.put("audio_cache", audio);
  }
}

export async function removeCachedAudio(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("audio_cache", id);
}

export async function clearAudioCache(): Promise<void> {
  const db = await getDB();
  await db.clear("audio_cache");
}

// ============================================================================
// Offline-sync helpers (pending quotes, temp ID replacement)
// ============================================================================

export async function getCachedPendingQuotes(): Promise<QuoteCacheItem[]> {
  const all = await getAllCachedQuotes();
  return all.filter((q) => q.quote_data._pending === true);
}

export async function replaceTempQuoteId(
  tempId: string,
  realId: string,
  realQuoteData: Record<string, unknown>,
): Promise<void> {
  const db = await getDB();
  await db.delete("quotes_cache", tempId);
  await db.put("quotes_cache", {
    id: realId,
    quote_data: { ...realQuoteData, _pending: false },
    last_synced: Date.now(),
  });
  await updatePhotosQuoteId(tempId, realId);
  await updateAudioQuoteId(tempId, realId);
}

export async function updatePhotosQuoteId(
  oldQuoteId: string,
  newQuoteId: string,
): Promise<void> {
  const db = await getDB();
  const photos = await db.getAllFromIndex(
    "photos_cache",
    "by-quote",
    oldQuoteId,
  );
  for (const photo of photos) {
    photo.quote_id = newQuoteId;
    await db.put("photos_cache", photo);
  }
}

export async function updateAudioQuoteId(
  oldQuoteId: string,
  newQuoteId: string,
): Promise<void> {
  const db = await getDB();
  const audioItems = await db.getAllFromIndex(
    "audio_cache",
    "by-quote",
    oldQuoteId,
  );
  for (const audio of audioItems) {
    audio.quote_id = newQuoteId;
    await db.put("audio_cache", audio);
  }
}
