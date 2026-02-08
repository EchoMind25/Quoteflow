# QuoteFlow

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
  email/                # Email sending (Resend integration)
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
   - **Email:** `lib/email/send-quote.ts` uses Resend SDK with `emails/quote-email.tsx` (table-based HTML template, branded with business color + logo)
   - **SMS:** `lib/sms/send-quote.ts` uses Twilio SDK, message kept under 160 chars
4. Quote status updates to `"sent"` with `sent_at` timestamp
5. Public link: `/public/quotes/[id]` — no auth required, mobile-optimized, branded with business primary color
6. `PublicQuoteView` shows accept/decline buttons; first view sets `viewed_at` (fire-and-forget)
7. `acceptQuote` / `declineQuote` server actions update status + send acceptance notification email to business owner

Key files:
- `emails/quote-email.tsx` — React email template (table-based for cross-client compatibility)
- `lib/email/send-quote.ts` — Resend integration (`sendQuoteEmail`, `sendAcceptanceNotification`)
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
- `RESEND_API_KEY` — Required for email delivery (Resend)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` — Required for SMS delivery (Twilio)
- `NEXT_PUBLIC_APP_URL` — Base URL for public quote links (e.g. `https://quoteflow.app`)
- Server action body size limit is set to `10mb` in `next.config.ts`
