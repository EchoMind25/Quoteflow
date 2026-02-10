# Quotestream

Privacy-first AI-powered quoting platform for service businesses. Next.js 16 + Supabase + Tailwind CSS.

## Quick Reference

### Commands
```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run type-check   # TypeScript (both tsconfigs)
npm run lint         # ESLint
npm run format       # Prettier
```

### Critical Rules
- **No `middleware.ts`** — use `proxy.ts` instead (Next.js 16 change)
- **No anon RLS SELECT** on `quotes`, `customers`, `quote_line_items`
- **Service role for public routes** — `createServiceClient()`, not `createClient()`
- **Auth required for rate-limited ops** — never optional
- **IndexedDB version = 3** — sync between `lib/db/indexed-db.ts` and `app/sw.ts`
- **Table is `profiles`** — not `team_members`
- **Table is `activity_logs`** — not `audit_logs`

---

## Architecture

### Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router, React 19) |
| Database | Supabase (Postgres + Auth + Storage) |
| Styling | Tailwind CSS 3.4 + CSS custom properties |
| PWA | Serwist 9.5 (offline-first IndexedDB queue) |
| AI | AssemblyAI (transcription), Claude Sonnet (vision + generation) |
| Icons | lucide-react |

### Project Structure
```
app/
  (auth)/                 # Auth layout (login, signup)
  app/                    # Authenticated shell (dashboard, quotes, customers, settings)
  public/quotes/[id]/     # Public quote view (no auth)
  api/                    # API routes (webhooks, sync only)
  sw.ts                   # Service worker (separate tsconfig.sw.json)
components/               # By domain (auth/, dashboard/, quotes/)
lib/
  actions/                # Server actions (ai.ts, quotes.ts, customers.ts, settings.ts)
  ai/                     # AI integrations (vision.ts, transcription.ts, prompts/)
  db/                     # IndexedDB (indexed-db.ts)
  sync/                   # Offline sync orchestrator
  supabase/               # Client/server/service helpers
types/database.ts         # Supabase types (manually maintained)
supabase/migrations/      # SQL migrations
proxy.ts                  # Request proxy (auth guards)
```

### Key Conventions

| Convention | Details |
|------------|---------|
| Server actions | `lib/actions/` (business logic), `app/actions/` (auth only) |
| Client pattern | `useActionState` — see `components/auth/login-form.tsx` |
| Database types | Update `Row`, `Insert`, `Update` in lockstep |
| TypeScript | `strict`, `noUncheckedIndexedAccess`, prefix unused params with `_` |
| CSS theming | `hsl(var(--...))` properties, `brand-600` etc. for colors |
| Console | Only `console.warn`/`console.error` allowed |

---

## Core Flows

### Voice Recording → Transcription
1. `/app/quotes/new` — `VoiceRecorder` captures audio (webm/opus or mp4 fallback)
2. Blob cached in IndexedDB `audio_cache`
3. `transcribeVoiceNote` → AssemblyAI → transcript + confidence
4. `TranscriptEditor` shows editable transcript
5. On sync, `uploadCachedAudio()` → Supabase Storage `quote-audio` bucket

### AI Quote Generation
1. "Generate with AI" → `generateQuoteFromAI` server action
2. Photos + transcript + industry → `analyzePhotosAndTranscript()`
3. `lib/ai/vision.ts` builds multi-modal Claude message
4. Industry prompts in `lib/ai/prompts/quote-analysis.ts`
5. Response validated by Zod → line items with confidence
6. Low-confidence items get fallback pricing (`FALLBACK_LABOR_RATES`)

### Quote Delivery
1. Business sends via Email, SMS, or Both
2. `sendQuote` action → `lib/email/send-quote.ts` (nodemailer) or `lib/sms/send-quote.ts` (Twilio)
3. Status → `"sent"`, `sent_at` timestamp
4. Public link: `/public/quotes/[id]` (branded, mobile-optimized)
5. First view sets `viewed_at` (fire-and-forget)
6. Accept/decline → status update + notification email

### Offline-First Sync
1. Actions enqueued in IndexedDB `offline_queue` when offline
2. `lib/sync/offline-sync.ts` orchestrates: photos (3 concurrent) → audio → queue → cache
3. Background Sync POSTs to `/api/sync/offline-queue`
4. Optimistic quotes: temp UUID with `_pending: true`, swapped after sync
5. Conflicts: `_cached_updated_at` compared, last-write-wins, dialog shown

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude Vision |
| `ASSEMBLYAI_API_KEY` | Voice transcription |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Email (Resend) |
| `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER` | SMS |
| `NEXT_PUBLIC_APP_URL` | Public quote links |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) |

---

## Anti-Patterns & Correct Patterns

### 1. Public Route Security

❌ **Wrong:** `createClient()` with anon key for public pages
```typescript
const supabase = await createClient(); // Enables UUID enumeration
```

✅ **Correct:** Service role with explicit columns
```typescript
import { createServiceClient } from "@/lib/supabase/service";
const supabase = createServiceClient();
const { data } = await supabase
  .from("quotes")
  .select("id, business_id, status, title, ...")  // Never SELECT *
  .eq("id", id)
  .in("status", ["sent", "viewed", "accepted", "declined", "expired"])
  .single();
```

### 2. Rate Limiting

❌ **Wrong:** `middleware.ts`, in-memory `Map`, optional auth
```typescript
// middleware.ts — DO NOT CREATE
const rateLimitMap = new Map(); // Race condition in serverless
if (authUser) { checkLimit(); } // Bypass if unauthenticated
```

✅ **Correct:** Postgres atomic function + mandatory auth
```typescript
// Server actions — Postgres-backed
const limit = await checkAIRateLimit(profile.business_id);
if (!limit.allowed) return { error: `Rate limit exceeded.` };

// API routes — Upstash Redis
const blocked = await checkRateLimit(request, userId);
if (blocked) return blocked;
```

**Rate limits:** AI=10/60s, Photo=20/60s, Email=100/24h (per business)

### 3. AI Runtime

❌ **Wrong:** Edge runtime for AI
```typescript
export const runtime = "edge"; // Buffer, crypto unavailable
```

✅ **Correct:** Default Node.js (no export needed)
```typescript
"use server";
// Server actions default to Node.js
```

### 4. Authentication

❌ **Wrong:** RLS-only, optional auth on rate-limited ops

✅ **Correct:** Explicit auth guard
```typescript
// Shared helper in lib/actions/settings.ts
async function getBusinessId(): Promise<{ businessId: string | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { businessId: null, error: "Not authenticated." };
  // ... get profile.business_id
}

// Public actions use service role
export async function acceptQuote(formData: FormData) {
  const serviceClient = createServiceClient();
  // UUID is access control
}
```

### 5. Encryption

✅ **Correct:** AES-256-GCM, 16-byte random IV
```typescript
const iv = crypto.randomBytes(16); // Fresh every time
// Output: iv:authTag:ciphertext (hex)
// Key: 64 hex chars from ENCRYPTION_KEY env var
```

### 6. IndexedDB Types

❌ **Wrong:** Boolean in numeric index
```typescript
uploaded: boolean // Index queries fail
```

✅ **Correct:** Use 0/1 for indexed boolean-like fields
```typescript
uploaded: number // 0 = false, 1 = true
```

### 7. Audit Logging

✅ **Correct:** `activity_logs` table, `user_id` FK (not denormalized names)
```typescript
await supabase.from("activity_logs").insert({
  user_id: user.id,        // FK to profiles
  business_id,
  action_type: "quote.sent",
  resource_type: "quote",
  resource_id: quoteId,
});
```

### 8. Performance

❌ **Wrong:** N+1 queries, sequential independent ops
```typescript
for (const quote of quotes) {
  await supabase.from("items").select().eq("quote_id", quote.id);
}
```

✅ **Correct:** Batch queries, parallel with limits
```typescript
const { data } = await supabase.from("items").in("quote_id", ids);

// Parallel upload (3 concurrent)
for (let i = 0; i < photos.length; i += 3) {
  await Promise.all(photos.slice(i, i + 3).map(uploadPhoto));
}
```

---

## Checklists

### Pre-Implementation
- [ ] Server actions have `getUser()` or use `createServiceClient()`
- [ ] Rate limiting on AI/email ops via `lib/rate-limit.ts`
- [ ] No `middleware.ts` — use `proxy.ts`
- [ ] IndexedDB version synced (lib + sw)
- [ ] `types/database.ts` updated if schema changed
- [ ] Error handling on all async ops
- [ ] MediaRecorder cleanup in `useEffect`

### Code Review — Security
- [ ] No anon RLS SELECT on sensitive tables
- [ ] `createServiceClient()` server-side only
- [ ] Inputs validated (Zod for structured, type guards for FormData)
- [ ] Rate limiting cannot be bypassed

### Code Review — Performance
- [ ] No N+1 queries — use `.in()`
- [ ] Indexes on FK columns
- [ ] `Promise.all` with concurrency limits
- [ ] RLS functions marked `STABLE`

---

## Vulnerabilities Matrix

| Issue | Fix | Severity |
|-------|-----|----------|
| UUID enumeration | Service role + no anon RLS | P0 |
| Unlimited AI calls | Mandatory auth + rate limit | P0 |
| Column update bypass | Column guard trigger (migration 0010) | P0 |
| Rate limit race | Atomic UPSERT (migration 0012) | P0 |
| Audio memory leak | `useEffect` cleanup | P1 |
| CSV formula injection | Strip `=`, `+`, `-`, `@` prefix | P2 |
| IndexedDB version mismatch | Sync version in both files | P2 |

---

## Migration Patterns

### New Table Template
```sql
CREATE TABLE public.new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  -- columns
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.new_table
  FOR SELECT USING (business_id = public.get_my_business_id());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.new_table
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_new_table_business_id ON public.new_table (business_id);
```

### Rate Limit Check
```sql
SELECT public.check_rate_limit('ai:business-uuid', 10, 60);
-- Returns: {"allowed": true, "remaining": 9, "reset_at": "..."}
```

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Service client | `lib/supabase/service.ts` |
| Rate limiting | `lib/rate-limit.ts` |
| AI vision | `lib/ai/vision.ts` |
| AI prompts | `lib/ai/prompts/quote-analysis.ts` |
| Offline sync | `lib/sync/offline-sync.ts` |
| IndexedDB | `lib/db/indexed-db.ts` |
| Encryption | `lib/crypto/encrypt.ts` |
| Audit logging | `lib/audit/log.ts` |
| Email sending | `lib/email/send-quote.ts` |
| SMS sending | `lib/sms/send-quote.ts` |
| Service worker | `app/sw.ts` |
| Database types | `types/database.ts` |