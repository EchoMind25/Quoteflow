# Quotestream

Privacy-first AI-powered quoting platform for service businesses (HVAC, plumbing, electrical). Built with Next.js 16, Supabase, and Tailwind CSS.

## Commands

- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build (webpack)
- `npm run type-check` — TypeScript check (runs both `tsconfig.json` and `tsconfig.sw.json`)
- `npm run lint` — ESLint via `next lint`
- `npm run format` — Prettier format all files
- `npm run format:check` — Check formatting without writing

## Architecture

### Stack

- **Framework:** Next.js 16.1.6 (App Router, React 19)
- **Database:** Supabase (Postgres + Auth + Storage)
- **Styling:** Tailwind CSS 3.4 with CSS custom properties for theming
- **PWA:** Serwist 9.5 service worker (`app/sw.ts`) with offline-first IndexedDB queue
- **AI:** AssemblyAI (voice transcription), Anthropic Claude Sonnet (vision + quote generation), Zod (AI output validation)
- **Icons:** lucide-react

### Project structure

```
app/                    # Next.js App Router pages
  (auth)/               # Auth layout group (login, signup)
  app/                  # Authenticated app shell (dashboard, quotes, customers, settings)
  public/quotes/[id]/   # Public quote view (no auth, customer-facing)
  api/                  # API routes
  sw.ts                 # Service worker (separate tsconfig.sw.json)
components/             # Client/server components by domain
  auth/                 # Login/signup forms
  dashboard/            # Nav, dark mode toggle
  quotes/               # Voice recorder, transcript editor, creation wizard, detail views
emails/                 # React email templates (table-based HTML)
lib/
  actions/              # Server actions (ai.ts, quotes.ts)
  ai/                   # AI integrations (transcription.ts, vision.ts, prompts/)
  db/                   # IndexedDB offline storage (indexed-db.ts)
  email/                # Email sending (SMTP via nodemailer)
  sms/                  # SMS sending (Twilio integration)
  supabase/             # Supabase client/server/proxy helpers
  sync/                 # Offline sync orchestrator
types/                  # TypeScript types (database.ts — generated Supabase types)
supabase/migrations/    # SQL migrations (applied in order)
proxy.ts                # Request proxy (auth guards, session refresh)
```

### Key conventions

- **Proxy, not middleware:** Next.js 16 deprecated `middleware.ts`. This project uses `proxy.ts` at the project root with the named export `proxy()`. Auth session refresh logic lives in `lib/supabase/proxy.ts`. Do NOT create a `middleware.ts` file.
- **Server actions** live in `app/actions/` (auth) and `lib/actions/` (AI). They use `useActionState` on the client side — see `components/auth/login-form.tsx` for the pattern.
- **Database types** in `types/database.ts` are manually maintained to match Supabase schema. When adding columns, update `Row` (non-optional nullable), `Insert` (optional nullable), and `Update` (optional nullable) in lockstep.
- **IndexedDB** uses the `idb` library with a versioned schema (`lib/db/indexed-db.ts`). Current version is **3**. Upgrades are incremental (`if (oldVersion < N)`). The service worker (`app/sw.ts`) also opens the same DB — keep the version number in sync.
- **Offline queue** pattern: actions are enqueued in IndexedDB when offline, then processed by `lib/sync/offline-sync.ts` when connectivity returns. The `OfflineQueueItem["action"]` union must include any new queue action types.
- **Two tsconfigs:** `tsconfig.json` excludes `app/sw.ts`; `tsconfig.sw.json` covers only the service worker. Both must pass `tsc --noEmit`.
- **Strict TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. Prefix unused params with `_`.
- **CSS theming:** Use `hsl(var(--...))` custom properties (e.g. `text-[hsl(var(--muted-foreground))]`). Brand colors use `brand-600`, `brand-700` etc. as Tailwind classes.
- **`no-console` rule:** Only `console.warn` and `console.error` are allowed. Use `// eslint-disable-next-line no-console` for intentional server-side logging.

### Voice recording & transcription flow

1. User navigates to `/app/quotes/new` (the "New Quote" links point here)
2. `VoiceRecorder` captures audio via MediaRecorder (prefers `audio/webm;codecs=opus`, falls back to `audio/mp4`)
3. Audio blob is cached in IndexedDB `audio_cache` store for offline resilience
4. `transcribeVoiceNote` server action uploads to AssemblyAI, returns transcript + confidence
5. `TranscriptEditor` shows editable transcript with color-coded confidence badge
6. On sync, `uploadCachedAudio()` uploads cached audio to Supabase Storage `quote-audio` bucket

### AI quote generation pipeline

1. User clicks "Generate with AI" after transcript review
2. `generateQuoteFromAI` server action sends photo URLs + transcript + industry to `analyzePhotosAndTranscript()`
3. `lib/ai/vision.ts` builds a multi-modal Claude message: image blocks (Supabase Storage public URLs) + few-shot example + transcript
4. Industry-specific system prompts and examples live in `lib/ai/prompts/quote-analysis.ts` (HVAC, plumbing, electrical, general)
5. Claude returns structured JSON validated by Zod schema (`quoteAnalysisSchema`)
6. Low-confidence labor items get fallback pricing per industry (`FALLBACK_LABOR_RATES`)
7. Wizard UI shows editable line item cards with per-item confidence badges, inline editing, removal, and a "Regenerate" option
8. Photo URLs are resolved from Supabase Storage paths to public URLs before sending to Claude

Key files:
- `lib/ai/prompts/quote-analysis.ts` — Zod schemas, system prompts, few-shot examples, fallback pricing
- `lib/ai/vision.ts` — Anthropic SDK singleton, `analyzePhotosAndTranscript()`, JSON parsing + validation
- `lib/actions/ai.ts` — `generateQuoteFromAI` server action (FormData → structured result)
- `components/quotes/quote-creation-wizard.tsx` — Full wizard UI (voice → transcript → AI generation → review)

### Quote delivery system

1. Business user opens quote detail (`/app/quotes/[id]`) and clicks "Send Quote"
2. `QuoteDetailView` shows delivery method selector: Email, SMS, or Both
3. `sendQuote` server action (`lib/actions/quotes.ts`) sends via selected channel(s):
   - **Email:** `lib/email/send-quote.ts` uses nodemailer SMTP with `emails/quote-email.tsx` (table-based HTML template, branded with business color + logo)
   - **SMS:** `lib/sms/send-quote.ts` uses Twilio SDK, message kept under 160 chars
4. Quote status updates to `"sent"` with `sent_at` timestamp
5. Public link: `/public/quotes/[id]` — no auth required, mobile-optimized, branded with business primary color
6. `PublicQuoteView` shows accept/decline buttons; first view sets `viewed_at` (fire-and-forget)
7. `acceptQuote` / `declineQuote` server actions update status + send acceptance notification email to business owner

Key files:
- `emails/quote-email.tsx` — React email template (table-based for cross-client compatibility)
- `lib/email/send-quote.ts` — SMTP email sending (`sendQuoteEmail`, `sendAcceptanceNotification`)
- `lib/email/smtp.ts` — Nodemailer SMTP transport singleton
- `lib/sms/send-quote.ts` — Twilio integration (`sendQuoteSMS`)
- `lib/actions/quotes.ts` — `sendQuote`, `acceptQuote`, `declineQuote` server actions
- `components/quotes/quote-detail-view.tsx` — Authenticated detail view with send panel
- `components/quotes/public-quote-view.tsx` — Public customer-facing view with accept/decline
- `app/app/quotes/[id]/page.tsx` — Authenticated quote detail page
- `app/public/quotes/[id]/page.tsx` — Public quote page (marks as viewed on first load)

### Offline-first architecture

The app uses a complete offline-first pattern: IndexedDB stores + service worker Background Sync + optimistic UI.

**Sync flow:**
1. Actions (create/update quotes, send quotes, etc.) are enqueued in IndexedDB `offline_queue` when offline
2. `lib/sync/offline-sync.ts` orchestrates sync: batch photo uploads (3 concurrent) → audio uploads → queue processing → cache refresh
3. Background Sync (`app/sw.ts`) POSTs queue items to `/api/sync/offline-queue` when connectivity returns
4. Sync API processes each item independently (failure in one doesn't block others), returns `processed_ids`, `id_mappings`, and `conflicts`
5. `SyncStatus` component (`components/sync-status.tsx`) shows connectivity + queue state with auto-sync on reconnect

**Optimistic quote creation:**
- `lib/sync/optimistic-quote.ts` creates a temp quote (UUID) with `_pending: true` in `quotes_cache`, enqueues `create_quote` action
- `components/quotes/quotes-list.tsx` merges pending quotes from IndexedDB above server quotes (amber "Pending sync" badge)
- After sync, `replaceTempQuoteId()` swaps temp ID for real server ID in all caches (quotes, photos, audio)

**Conflict resolution:**
- `update_quote` actions include `_cached_updated_at`; sync API compares with server's `updated_at`
- If server is newer, conflict is reported but update still applies (last-write-wins)
- `SyncConflictDialog` (`components/sync-conflict-dialog.tsx`) shows conflicts with "Keep My Changes" / "Reload Server Data" options

**Offline send:**
- `quote-detail-view.tsx` intercepts send when offline, enqueues `send_quote` action with `quote_id` + `delivery_method`
- `send_quote` in `offline-sync.ts` delegates to the sync API endpoint (email/SMS requires server-side SDKs)
- Sync API handler mirrors `sendQuote` server action logic

**Image compression:**
- `lib/media/compress-image.ts` resizes to max 1920px and converts to JPEG at 85% quality
- Uses `OffscreenCanvas` (SW-compatible) with `HTMLCanvasElement` fallback

Key files:
- `lib/db/indexed-db.ts` — IndexedDB schema (v3), queue/cache CRUD, pending quote helpers
- `lib/sync/offline-sync.ts` — Sync orchestrator, batch uploads, queue processing
- `lib/sync/optimistic-quote.ts` — Optimistic quote creation
- `app/api/sync/offline-queue/route.ts` — Server-side sync endpoint (Node.js runtime)
- `app/sw.ts` — Service worker with Background Sync, ID mapping, notifications
- `components/sync-status.tsx` — Sync status bar (offline/pending/syncing/done/error)
- `components/sync-conflict-dialog.tsx` — Conflict resolution dialog
- `components/sync-status-wrapper.tsx` — Connects SyncStatus + ConflictDialog in app layout
- `components/quotes/quotes-list.tsx` — Offline-aware quote list with pending badges
- `lib/media/compress-image.ts` — Image compression utility

### Supabase Storage buckets

- `quote-photos` — Job site photos
- `quote-audio` — Voice note recordings

### Environment variables

See `.env.example`. Key vars:
- `ANTHROPIC_API_KEY` — Required for Claude Vision quote generation
- `ASSEMBLYAI_API_KEY` — Required for voice transcription
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — Required for email delivery (SMTP via Resend)
- `SMTP_FROM` — Default sender address for outbound emails
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` — Required for SMS delivery (Twilio)
- `NEXT_PUBLIC_APP_URL` — Base URL for public quote links (e.g. `https://quotestream.app`)
- Server action body size limit is set to `10mb` in `next.config.ts`

---

# Anti-Patterns & Best Practices

This section documents common mistakes found during PRD audits and the correct patterns already implemented in the codebase. These are based on real bugs that have been fixed. Follow these patterns to prevent recurrence.

## Table of Contents
1. [Public Quote Access Security](#1-public-quote-access-security)
2. [Rate Limiting Architecture](#2-rate-limiting-architecture)
3. [AI Route Runtime Configuration](#3-ai-route-runtime-configuration)
4. [Authentication in Server Actions](#4-authentication-in-server-actions)
5. [Encryption Implementation](#5-encryption-implementation)
6. [Database Table Naming](#6-database-table-naming)
7. [IndexedDB Type Safety](#7-indexeddb-type-safety)
8. [Audit Logging](#8-audit-logging)
9. [File Structure Conventions](#9-file-structure-conventions)
10. [Performance Patterns](#10-performance-patterns)

---

## 1. Public Quote Access Security

### ❌ WRONG: Anon key with RLS policies for public pages
```typescript
// DO NOT DO THIS — creates an enumeration vector
const supabase = await createClient(); // anon key
const { data } = await supabase
  .from("quotes")
  .select("*")
  .eq("id", params.id);
```
**Problem:** Requires `anon SELECT` RLS policies on the quotes table, which allow any anonymous user to scan for valid UUIDs and enumerate all non-draft quotes.

### ✅ CORRECT: Service role with explicit column selection
```typescript
// app/public/quotes/[id]/page.tsx — the actual implementation
import { createServiceClient } from "@/lib/supabase/service";

const supabase = createServiceClient();
const { data: quote } = await supabase
  .from("quotes")
  .select(
    "id, business_id, customer_id, status, title, quote_number, " +
    "subtotal_cents, tax_rate, tax_cents, discount_cents, total_cents, " +
    "customer_notes, expires_at, viewed_at"
  )
  .eq("id", id)
  .in("status", ["sent", "viewed", "accepted", "declined", "expired"])
  .single();
```

### 📖 Rationale
UUID secrecy is the access control mechanism for public quote links (secret-link model). The service role bypasses RLS entirely, so no `anon SELECT` policies are needed. Migration `0009_fix_anon_rls.sql` removed all anon SELECT policies from `quotes`, `customers`, and `quote_line_items`. Only `businesses` retains anon SELECT (low-risk marketing info).

### 🔍 Detection
- Search for `createClient()` in any `app/public/` page — should always be `createServiceClient()`
- Check for `anon` or `public` SELECT policies on sensitive tables in new migrations
- Verify `.select()` uses explicit column lists, never `*`

### 📝 References
- `lib/supabase/service.ts` — Service role client factory
- `supabase/migrations/0009_fix_anon_rls.sql` — Removed vulnerable anon SELECT policies
- `supabase/migrations/0010_anon_update_column_guard.sql` — Column guard trigger for anon UPDATE

---

## 2. Rate Limiting Architecture

### ❌ WRONG: Using `middleware.ts` for rate limiting
```typescript
// middleware.ts — DO NOT CREATE THIS FILE
import { NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  // rate limit logic here
}
```
**Problem:** Next.js 16 replaced `middleware.ts` with `proxy.ts`. Creating `middleware.ts` causes conflicts with the proxy-based auth session refresh.

### ❌ WRONG: In-memory rate limiting
```typescript
// DO NOT DO THIS — race condition in serverless
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
```
**Problem:** Each serverless instance has its own memory. Users can bypass limits by hitting different instances. Classic TOCTOU race condition.

### ✅ CORRECT: Two-layer rate limiting with atomic Postgres function
```typescript
// Layer 1: Server Actions — Postgres-backed (lib/rate-limit.ts)
import { checkAIRateLimit, checkEmailRateLimit } from "@/lib/rate-limit";

const limit = await checkAIRateLimit(profile.business_id); // 10/min per business
if (!limit.allowed) {
  const waitSec = Math.ceil(limit.resetMs / 1000);
  return { error: `Rate limit exceeded. Please wait ${waitSec} seconds.` };
}

// Layer 2: API Routes — Upstash Redis (lib/ratelimit/api-ratelimit.ts)
import { checkRateLimit } from "@/lib/ratelimit/api-ratelimit";
const blocked = await checkRateLimit(request, userId); // 100/min per user
if (blocked) return blocked; // Returns 429 with Retry-After header
```

### 📖 Rationale
The Postgres `check_rate_limit()` function uses a single atomic UPSERT (fixed in migration `0012_fix_rate_limiting.sql`) that eliminates the TOCTOU race condition present in the original two-step SELECT+UPDATE approach. Upstash Redis is available for API routes needing Edge-compatible rate limiting. Both layers fail-open (allow requests if backend is unavailable) to avoid blocking legitimate users.

**Current rate limits:**
| Scope | Limit | Window | Key pattern |
|-------|-------|--------|-------------|
| AI generation | 10 req | 60s | `ai:{businessId}` |
| Photo upload | 20 req | 60s | `photo:{userId}` |
| Email delivery | 100 req | 24h | `email:{businessId}` |

### 🔍 Detection
- `middleware.ts` file must not exist (use `proxy.ts` instead)
- Search for `new Map()` near rate/limit/throttle logic — should use DB or Redis
- Every AI-related server action must call `checkAIRateLimit()` before processing
- Rate limit checks should be scoped by `businessId`, not `userId`, for multi-tenant isolation

### 📝 References
- `lib/rate-limit.ts` — Postgres-backed rate limit helpers
- `lib/ratelimit/api-ratelimit.ts` — Upstash Redis rate limiter (for API routes)
- `supabase/migrations/0011_rate_limiting.sql` — Table + initial function
- `supabase/migrations/0012_fix_rate_limiting.sql` — Atomic UPSERT fix (race condition)
- `proxy.ts` — Request proxy (do NOT replace with middleware.ts)

---

## 3. AI Route Runtime Configuration

### ❌ WRONG: Using Edge runtime for AI operations
```typescript
// DO NOT DO THIS in server actions or AI routes
export const runtime = "edge";

export async function generateQuote(formData: FormData) {
  const buffer = Buffer.from(data); // ← Buffer not available in Edge
}
```
**Problem:** AI server actions use `Buffer.from()` and Node.js `crypto` APIs that are not available in the Edge runtime. The Anthropic SDK also requires Node.js.

### ✅ CORRECT: Default Node.js runtime for server actions (no export needed)
```typescript
// lib/actions/ai.ts — the actual implementation
"use server";

// No runtime export = Node.js by default
// Server actions in App Router run on Node.js unless explicitly changed

export async function generateQuoteFromAI(
  _prevState: GenerateQuoteState,
  formData: FormData,
): Promise<GenerateQuoteState> {
  // Buffer.from() ✓, crypto ✓, Anthropic SDK ✓
}
```

### 📖 Rationale
Server Actions default to Node.js runtime in Next.js App Router. The Anthropic SDK, `Buffer`, and Node.js `crypto` module all require Node.js. The body size limit of 10MB is configured in `next.config.ts` to support photo/audio uploads. The AI client (`lib/ai/vision.ts`) uses a singleton pattern with retry logic (3 attempts, exponential backoff).

### 🔍 Detection
- Search for `export const runtime = "edge"` in any file that imports `@anthropic-ai/sdk`, `Buffer`, or `crypto`
- Server action files (`"use server"`) should not declare `runtime` unless they genuinely work on Edge

### 📝 References
- `lib/actions/ai.ts` — AI server action (Node.js default)
- `lib/ai/vision.ts` — Anthropic client singleton with retry logic
- `next.config.ts` — `serverActions.bodySizeLimit: "10mb"`

---

## 4. Authentication in Server Actions

### ❌ WRONG: Relying only on RLS without explicit auth check
```typescript
// Fragile — if RLS policy has a bug, data leaks silently
export async function updateQuote(formData: FormData) {
  const supabase = await createClient();
  // No auth check — trusting RLS to handle everything
  await supabase.from("quotes").update({ title: "New" }).eq("id", quoteId);
}
```

### ❌ WRONG: Optional auth on rate-limited operations
```typescript
// DO NOT DO THIS — unauthenticated callers bypass rate limiting entirely
if (authUser) {
  const limit = await checkAIRateLimit(profile.business_id);
  if (!limit.allowed) return { error: "Rate limit exceeded." };
}
// ← If not authenticated, no rate limit applied!
```

### ✅ CORRECT: Explicit auth guard with shared helper
```typescript
// lib/actions/settings.ts — the DRY pattern for authenticated actions
async function getBusinessId(): Promise<{
  businessId: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { businessId: null, error: "Not authenticated." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();
  if (!profile?.business_id) {
    return { businessId: null, error: "No business associated with account." };
  }
  return { businessId: profile.business_id };
}

// Usage in every authenticated server action:
export async function updateBusinessProfile(formData: FormData) {
  const { businessId, error: authError } = await getBusinessId();
  if (!businessId) return { error: authError };
  // Proceed with businessId...
}
```

### ✅ CORRECT: Public actions use service role explicitly
```typescript
// lib/actions/quotes.ts — acceptQuote/declineQuote (customer-facing, no auth)
export async function acceptQuote(formData: FormData) {
  const quoteId = formData.get("quote_id") as string;
  // Service role for reads (anon SELECT policies removed in 0009)
  const serviceClient = createServiceClient();
  const { data: quote } = await serviceClient
    .from("quotes")
    .select("id, status, expires_at, ...")
    .eq("id", quoteId)
    .single();
  // UUID is the access control — no auth needed
}
```

### 📖 Rationale
There are four authentication patterns in the codebase. Use the right one:

| Pattern | When | Example |
|---------|------|---------|
| `getBusinessId()` helper | Authenticated business operations | Settings, customers, catalog |
| Explicit `getUser()` + guard | Authenticated with custom logic | AI generation (needs rate limit) |
| `createServiceClient()` | Public customer-facing actions | Accept/decline quote |
| No auth check | Public auth forms | Login, signup (magic link) |

### 🔍 Detection
- Every server action in `lib/actions/` must have either `getUser()` check or `createServiceClient()` — never neither
- Search for `createClient()` without a subsequent `auth.getUser()` in server actions
- Rate-limited actions must fail-closed if auth is missing (not silently skip the check)

### 📝 References
- `lib/actions/settings.ts` — `getBusinessId()` shared helper (used by 7+ functions)
- `lib/actions/customers.ts` — Explicit auth pattern
- `lib/actions/quotes.ts` — Mixed: `sendQuote` (RLS), `acceptQuote`/`declineQuote` (service role)
- `lib/actions/ai.ts` — Auth + rate limiting (mandatory auth enforced on all AI actions)

---

## 5. Encryption Implementation

### ❌ WRONG: Hardcoded keys or incorrect IV size
```typescript
// DO NOT DO THIS
const key = "my-secret-key-1234567890123456"; // ← Not hex, wrong format
const iv = crypto.randomBytes(12); // ← 12 bytes is for WebCrypto; Node uses 16
```

### ❌ WRONG: Reusing IVs or deterministic encryption
```typescript
// DO NOT DO THIS — same IV + key = same ciphertext = pattern analysis
const iv = Buffer.from("fixed-iv-value!!");
```

### ✅ CORRECT: AES-256-GCM with random 16-byte IV
```typescript
// lib/crypto/encrypt.ts — the actual implementation
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV for Node.js crypto

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).");
  }
  return Buffer.from(keyHex, "hex");
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH); // Fresh random IV every time
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
```

### 📖 Rationale
- **Algorithm:** AES-256-GCM provides authenticated encryption (integrity + confidentiality)
- **IV size:** 16 bytes (128-bit) for Node.js `crypto` module. Note: NIST recommends 12 bytes (96-bit) for GCM; Node.js supports both but 16 is what this codebase uses consistently
- **Key format:** 64-character hex string = 32 bytes = 256-bit key
- **Output format:** `iv:authTag:ciphertext` (colon-separated hex)
- **Auth tag:** GCM mode produces a 16-byte authentication tag that detects tampering
- **Generate a key:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 🔍 Detection
- Search for `createCipheriv` — IV must come from `crypto.randomBytes()`, never a constant
- Key must come from `process.env.ENCRYPTION_KEY`, never hardcoded
- Output must include auth tag (GCM) — if using `aes-256-cbc`, that's wrong
- Never store `ENCRYPTION_KEY` in `.env` committed to git — only in `.env.local`

### 📝 References
- `lib/crypto/encrypt.ts` — Complete encrypt/decrypt implementation
- `.env.local.example` — Key format documentation

---

## 6. Database Table Naming

### ❌ WRONG: Referencing `team_members` table
```typescript
// DO NOT DO THIS — this table does not exist
const { data } = await supabase.from("team_members").select("*");
```
```sql
-- DO NOT DO THIS in migrations
CREATE TABLE public.team_members ( ... );
```

### ✅ CORRECT: Use `profiles` table for all user/team data
```typescript
// The profiles table is the single source of truth for user-business membership
const { data: profile } = await supabase
  .from("profiles")
  .select("business_id, role, first_name, last_name")
  .eq("id", user.id)
  .single();
```
```sql
-- profiles schema (from 0001_initial_schema.sql):
-- id (uuid, FK → auth.users), business_id (uuid, FK → businesses),
-- role ('owner'|'admin'|'technician'|'viewer'),
-- first_name, last_name, phone, avatar_url, created_at, updated_at
```

### 📖 Rationale
The `profiles` table has a 1:1 relationship with `auth.users` and stores the user's `business_id` (many-to-one with `businesses`). The `role` column controls permissions. "Team members" is a UI concept — when displaying team members, query `profiles` filtered by `business_id`. The PRD mentions `team_members` as a JSON export key name, not a database table.

**Tenant isolation pattern:**
```sql
-- Every RLS policy uses this function:
CREATE FUNCTION public.get_my_business_id() RETURNS uuid AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Example RLS policy:
CREATE POLICY "quotes_select_own" ON quotes
  FOR SELECT USING (business_id = public.get_my_business_id());
```

### 🔍 Detection
- Search for `"team_members"` in `.ts` files — should always be `"profiles"`
- New migrations must not create a `team_members` table
- RLS policies must use `get_my_business_id()` for tenant scoping

### 📝 References
- `supabase/migrations/0001_initial_schema.sql` — `profiles` table + `get_my_business_id()` function
- `types/database.ts` — TypeScript types for `profiles` (lines 81-131)

---

## 7. IndexedDB Type Safety

### ❌ WRONG: Boolean values in numeric indexes
```typescript
// DO NOT DO THIS — boolean !== number in IndexedDB
interface PhotoCacheItem {
  uploaded: boolean; // ← Index queries won't work
}
await db.put("photos_cache", { id, blob, quote_id: quoteId, uploaded: false });
```
**Problem:** IndexedDB indexes are type-sensitive. The schema declares `"by-uploaded": number` but storing `boolean` values means `getAllFromIndex("photos_cache", "by-uploaded", 0)` returns nothing.

### ✅ CORRECT: Use numbers (0/1) for boolean-like indexed fields
```typescript
// lib/db/indexed-db.ts — the actual implementation
interface PhotoCacheItem {
  uploaded: number; // 0 = not uploaded, 1 = uploaded (matches index type)
}

// Store with numeric values:
await db.put("photos_cache", { id, blob, quote_id: quoteId, uploaded: 0 });

// Query by index works correctly:
export async function getUnuploadedPhotos(): Promise<PhotoCacheItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("photos_cache", "by-uploaded", 0);
}

// Mark as uploaded:
photo.uploaded = 1;
await db.put("photos_cache", photo);
```

### 📖 Rationale
IndexedDB stores values as-is and indexes are type-sensitive. Using `number` (0/1) instead of `boolean` for indexed fields ensures that `getAllFromIndex()` queries work correctly. Both `PhotoCacheItem.uploaded` and `AudioCacheItem.uploaded` use this pattern. The `_pending` field on cached quotes uses strict equality (`=== true`) since it is not indexed.

**Version synchronization:** IndexedDB version is **3** in both `lib/db/indexed-db.ts` (line 92) and `app/sw.ts` (line 152). These MUST stay in sync.

### 🔍 Detection
- New IndexedDB indexes with boolean-like semantics must use `number` (0/1), not `boolean`
- Check that `lib/db/indexed-db.ts` and `app/sw.ts` use the same DB version number

### 📝 References
- `lib/db/indexed-db.ts` — IndexedDB schema (v3), store definitions, query patterns
- `app/sw.ts` — Service worker IndexedDB access (must match version)

---

## 8. Audit Logging

### ❌ WRONG: Storing actor name instead of user ID
```typescript
// DO NOT DO THIS — names change, IDs don't
await supabase.from("activity_logs").insert({
  actor_name: "John Smith",       // ← Denormalized, stale on rename
  actor_email: "john@example.com", // ← Also denormalized
});
```

### ❌ WRONG: Using `audit_logs` table name
```typescript
// DO NOT DO THIS — table is called activity_logs
await supabase.from("audit_logs").insert({ ... });
```

### ✅ CORRECT: Store user_id, resolve names via JOIN
```typescript
// lib/audit/log.ts — the actual implementation
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // Skip silently if not authenticated

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();
  if (!profile?.business_id) return; // Skip silently

  await supabase.from("activity_logs").insert({
    user_id: user.id,                  // ← FK to profiles, never stale
    business_id: profile.business_id,  // ← Tenant scoping
    action_type: entry.action_type,    // e.g. "quote.sent"
    resource_type: entry.resource_type, // e.g. "quote"
    resource_id: entry.resource_id,
    description: entry.description,
    metadata: entry.metadata ?? {},
  });
}
```

### 📖 Rationale
- **Table name:** `activity_logs` (not `audit_logs` — consistency matters for grep/search)
- **Actor ID:** `user_id` (UUID FK to `profiles`) — immutable, JOINable
- **Fail-silent:** Logging errors never disrupt the primary operation (catch + `console.error`)
- **Business scoping:** RLS policies on `activity_logs` use `get_my_business_id()` for tenant isolation
- **Indexed columns:** `business_id`, `user_id`, `(resource_type, resource_id)`, `created_at DESC`

**Action type convention:** `{resource}.{verb}` — e.g., `quote.created`, `quote.sent`, `customer.updated`

### 🔍 Detection
- Search for `"audit_logs"` — should always be `"activity_logs"`
- Log inserts must include `user_id` (UUID) and `business_id`, never denormalized names
- `logActivity()` calls should be fire-and-forget (no `await` needed in caller unless ordering matters)
- All critical server actions must call `logActivity()` — search for missing calls

**Currently logged actions:**
| Action Type | Location | Description |
|---|---|---|
| `quote.sent` | `lib/actions/quotes.ts` | Quote sent via email/SMS |
| `ai.quote_generated` | `lib/actions/ai.ts` | AI quote generation (Gemini or Claude) |
| `customer.created` | `lib/actions/customers.ts` | New customer created |
| `customer.updated` | `lib/actions/customers.ts` | Customer details updated |
| `settings.updated` | `lib/actions/settings.ts` | Business profile updated |
| `settings.logo_updated` | `lib/actions/settings.ts` | Business logo uploaded |
| `settings.branding_updated` | `lib/actions/settings.ts` | Brand color changed |
| `settings.defaults_updated` | `lib/actions/settings.ts` | Quote defaults changed |
| `catalog.created` | `lib/actions/settings.ts` | Catalog item created |
| `catalog.updated` | `lib/actions/settings.ts` | Catalog item updated |
| `catalog.deleted` | `lib/actions/settings.ts` | Catalog item soft-deleted |

**Viewing logs:** Users can view activity logs at `/app/settings/activity`.

### 📝 References
- `lib/audit/log.ts` — `logActivity()` function
- `supabase/migrations/0013_activity_logs.sql` — Table schema + RLS policies + indexes
- `components/settings/activity-log.tsx` — Activity log viewer component
- `app/app/settings/activity/page.tsx` — Activity log page

---

## 9. File Structure Conventions

### ❌ WRONG: Placing server actions in wrong directories
```
app/api/ai/generate/route.ts     ← API route when a server action suffices
app/actions/quotes.ts             ← Auth actions go here, not business logic
components/quotes/actions.ts      ← Server actions don't go in components/
```

### ✅ CORRECT: Follow the established structure
```
app/actions/auth.ts               ← Auth-only server actions (login, signup)
lib/actions/ai.ts                 ← AI server actions (transcribe, generate)
lib/actions/quotes.ts             ← Quote business logic (send, accept, decline)
lib/actions/customers.ts          ← Customer CRUD
lib/actions/settings.ts           ← Settings with getBusinessId() helper
```

### 📖 Rationale
- `app/actions/` — Public auth actions (no authentication required)
- `lib/actions/` — Business logic actions (require authentication or service role)
- API routes (`app/api/`) — Only for webhook endpoints, sync API, and operations requiring HTTP method control
- Server actions are preferred over API routes because they get CSRF protection automatically

### 🔍 Detection
- New server actions (`"use server"`) should be in `lib/actions/` unless they're auth-only
- API routes should only be created when HTTP semantics are needed (webhooks, service worker sync)
- No `middleware.ts` file should exist

---

## 10. Performance Patterns

### ❌ WRONG: N+1 queries in loops
```typescript
// DO NOT DO THIS
for (const quote of quotes) {
  const { data: items } = await supabase
    .from("quote_line_items")
    .select("*")
    .eq("quote_id", quote.id);
}
```

### ❌ WRONG: Sequential processing of independent operations
```typescript
// DO NOT DO THIS — photos are independent, upload in parallel
for (const photo of photos) {
  await uploadPhoto(photo);
}
```

### ✅ CORRECT: Batch queries and parallel processing
```typescript
// Batch query — single SELECT for all related items
const { data: items } = await supabase
  .from("quote_line_items")
  .select("*")
  .in("quote_id", quotes.map(q => q.id));

// Parallel upload with concurrency limit (lib/sync/offline-sync.ts pattern)
const BATCH_SIZE = 3;
for (let i = 0; i < photos.length; i += BATCH_SIZE) {
  const batch = photos.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(photo => uploadPhoto(photo)));
}
```

### 📖 Rationale
The sync orchestrator (`lib/sync/offline-sync.ts`) processes photo uploads 3 at a time. This balances throughput against connection limits on mobile devices. Database queries should use `.in()` for batch lookups instead of per-item SELECTs. The `get_my_business_id()` function used in RLS policies is `SECURITY DEFINER` + `STABLE`, allowing Postgres to cache the result within a single statement.

### 🔍 Detection
- Search for `await` inside `for` loops that iterate over records — consider `Promise.all`
- Search for `.eq("quote_id"` inside loops — should be `.in("quote_id", ids)`
- Check RLS helper functions are marked `STABLE` (allows Postgres to optimize)

### 📝 References
- `lib/sync/offline-sync.ts` — Batch upload pattern (3 concurrent)
- `supabase/migrations/0001_initial_schema.sql` — `get_my_business_id()` (STABLE)

---

# Checklists

## Pre-Implementation Checklist

Before implementing any new feature, verify:

- [ ] All new Server Actions have `supabase.auth.getUser()` check (or explicitly use `createServiceClient()` for public routes)
- [ ] Public routes use `createServiceClient()`, not `createClient()`
- [ ] Rate limiting applied to all AI and email operations via `lib/rate-limit.ts`
- [ ] No `middleware.ts` file created — use `proxy.ts` instead
- [ ] Encryption uses `lib/crypto/encrypt.ts` (AES-256-GCM, 16-byte random IV)
- [ ] Database queries reference `profiles` table (not `team_members`)
- [ ] Audit logs use `activity_logs` table (not `audit_logs`)
- [ ] IndexedDB version in `lib/db/indexed-db.ts` matches `app/sw.ts`
- [ ] New IndexedDB stores have correct index types matching stored values
- [ ] File paths match project structure (`lib/actions/` for business logic, `app/actions/` for auth)
- [ ] All async operations have error handling (try/catch or `.catch()`)
- [ ] `useEffect` cleanup functions stop media streams (`stream.getTracks().forEach(t => t.stop())`)
- [ ] No hardcoded secrets or API keys — use `process.env`
- [ ] `types/database.ts` updated if new columns added (Row + Insert + Update in lockstep)
- [ ] New `OfflineQueueItem["action"]` types added to the union if new queue actions created

## Code Review Checklist

### Security
- [ ] No anon RLS SELECT policies on `quotes`, `customers`, or `quote_line_items`
- [ ] `createServiceClient()` used only in server-side code, never exposed to browser
- [ ] All user inputs validated (Zod for structured data, type guards for FormData)
- [ ] No SQL injection vectors — use parameterized queries via Supabase SDK
- [ ] CSRF protection automatic via Server Actions (no raw `fetch()` POST without tokens)
- [ ] Column guard trigger in place for anon UPDATE operations (migration `0010`)
- [ ] Rate limiting cannot be bypassed by unauthenticated requests

### Performance
- [ ] No N+1 query patterns — use `.in()` for batch lookups
- [ ] Indexes exist for all foreign key columns used in WHERE/JOIN
- [ ] Independent async operations use `Promise.all` (with concurrency limits for uploads)
- [ ] Large datasets use pagination (`.range()`) or streaming
- [ ] RLS helper functions marked `STABLE` for query planner optimization

### Type Safety
- [ ] No `any` types — use `unknown` with runtime validation
- [ ] Type assertions (`as`) paired with runtime checks
- [ ] Zod schemas for all external data (AI responses, FormData)
- [ ] `types/database.ts` matches actual Supabase schema
- [ ] Unused parameters prefixed with `_` (strict TS config)

---

# Common Vulnerabilities Matrix

| Vulnerability | Example Location | Fix | Severity |
|---|---|---|---|
| UUID enumeration | Anon SELECT on `quotes` | Service role + no anon RLS (migration 0009) | P0 |
| Unlimited AI calls | Optional auth on `generateQuoteFromAI` | Mandatory auth + `checkAIRateLimit()` (FIXED) | P0 |
| Column update bypass | Anon UPDATE all `quotes` columns | Column guard trigger (migration 0010) | P0 |
| Rate limit race condition | Two-step SELECT + UPDATE | Atomic UPSERT function (migration 0012) | P0 |
| Memory leak in audio | `MediaRecorder` stream not stopped | `useEffect` cleanup with `stream.getTracks()` | P1 |
| CSV formula injection | Export with `=SUM()` in data | Strip leading `=`, `+`, `-`, `@` in CSV values | P2 |
| Stale IndexedDB schema | Version mismatch main thread vs SW | Keep version number synced in both files | P2 |

---

# Migration Patterns

### Adding RLS Policies
```sql
-- ALWAYS use SECURITY DEFINER functions for business scoping
-- The get_my_business_id() function is already defined — use it
CREATE POLICY "new_table_select_own"
  ON public.new_table
  FOR SELECT
  USING (business_id = public.get_my_business_id());

-- For complex checks, create a new SECURITY DEFINER function:
CREATE OR REPLACE FUNCTION public.check_custom_access(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND business_id = (SELECT business_id FROM new_table WHERE id = p_resource_id)
  );
$$;
```

### Atomic Rate Limiting
```sql
-- CORRECT: Single atomic operation (from migration 0012)
-- The check_rate_limit() function handles:
-- 1. New bucket: INSERT with tokens=1
-- 2. Expired window: RESET + set tokens=1
-- 3. Within window: INCREMENT (capped at max+1)
-- All in a single UPSERT — no race conditions
SELECT public.check_rate_limit('ai:business-uuid', 10, 60);
-- Returns: {"allowed": true, "remaining": 9, "reset_at": "2026-..."}
```

### Adding New Tables
```sql
-- Always include in every new table migration:
-- 1. Enable RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- 2. Add business_id FK
business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

-- 3. Add RLS policies using get_my_business_id()
CREATE POLICY "select_own" ON public.new_table
  FOR SELECT USING (business_id = public.get_my_business_id());

-- 4. Add updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.new_table
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Add indexes on foreign keys
CREATE INDEX idx_new_table_business_id ON public.new_table (business_id);
```
