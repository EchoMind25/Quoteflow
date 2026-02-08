# QuoteFlow Production Testing Plan

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Vercel Deployment Guide](#2-vercel-deployment-guide)
3. [Test Cases](#3-test-cases)
4. [Testing Spreadsheet](#4-testing-spreadsheet)
5. [Performance Validation](#5-performance-validation)
6. [Security Checks](#6-security-checks)
7. [Bug Tracking Workflow](#7-bug-tracking-workflow)

---

## 1. Pre-Deployment Checklist

### Environment Variables

Set all of these in Vercel Project Settings > Environment Variables:

| Variable | Required | Where to Get |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Dashboard > Settings > API (keep secret!) |
| `ANTHROPIC_API_KEY` | Yes | console.anthropic.com > API Keys |
| `ASSEMBLYAI_API_KEY` | Yes | assemblyai.com > Dashboard |
| `RESEND_API_KEY` | Yes | resend.com > API Keys |
| `TWILIO_ACCOUNT_SID` | Yes | twilio.com > Console |
| `TWILIO_AUTH_TOKEN` | Yes | twilio.com > Console |
| `TWILIO_PHONE_NUMBER` | Yes | twilio.com > Phone Numbers (E.164 format) |
| `STRIPE_SECRET_KEY` | No* | stripe.com > Developers > API Keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No* | stripe.com > Developers > API Keys |
| `STRIPE_WEBHOOK_SECRET` | No* | stripe.com > Developers > Webhooks |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No* | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | No* | Same as above |
| `SENTRY_DSN` | Yes | sentry.io > Project Settings > Client Keys |
| `SENTRY_AUTH_TOKEN` | Yes | sentry.io > Settings > Auth Tokens |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Same DSN as `SENTRY_DSN` |
| `NEXT_PUBLIC_APP_URL` | Yes | Your production URL (e.g. `https://quoteflow.app`) |

\* Stripe and VAPID are optional for initial launch; required for payments and push notifications.

### Supabase Configuration

- [ ] All 4 migrations applied in order (0001-0004, plus 0005 for performance indexes)
- [ ] RLS enabled on all tables (verify in Supabase Dashboard > Authentication > Policies)
- [ ] Storage buckets created: `quote-photos`, `quote-audio`, `business-logos`
- [ ] Storage bucket policies: authenticated users can upload; public read for `quote-photos` and `business-logos`
- [ ] Auth email templates configured (magic link template)
- [ ] Auth redirect URL set to `https://your-domain.com/auth/callback`

### Database Indexes Verified

After running migration 0005, verify indexes are used by running the EXPLAIN ANALYZE queries
in `supabase/migrations/0005_performance_indexes.sql` (SQL Editor in Supabase Dashboard).
Each query should show "Index Scan" not "Seq Scan".

### External Services

- [ ] Sentry project created (Next.js platform), DSN copied
- [ ] Resend domain verified (or using sandbox for testing)
- [ ] Twilio phone number provisioned and verified
- [ ] AssemblyAI account active with API key
- [ ] Anthropic API key with sufficient credits

---

## 2. Vercel Deployment Guide

### Step 1: Push to GitHub

```bash
git add -A
git commit -m "Initial QuoteFlow deployment"
git remote add origin https://github.com/YOUR_USERNAME/quoteflow.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository
3. Framework Preset: **Next.js** (auto-detected)
4. Build Command: `next build --webpack` (from vercel.json)
5. Output Directory: `.next` (default)
6. Install Command: `npm install --legacy-peer-deps`

### Step 3: Environment Variables

Add all variables from the checklist above in Vercel's project settings.
Set scope to **Production** (and optionally **Preview** with test values).

### Step 4: Deploy

Click "Deploy". Vercel will:
1. Install dependencies
2. Run `next build --webpack`
3. Deploy to production URL

### Step 5: Post-Deploy Verification

- [ ] Visit production URL - landing page loads
- [ ] Visit `/login` - login page renders
- [ ] Check Vercel Analytics tab - page views appearing
- [ ] Check Sentry dashboard - no startup errors
- [ ] Check browser DevTools > Application > Service Worker - SW registered

### Step 6: Custom Domain (Optional)

1. Vercel Dashboard > Project > Settings > Domains
2. Add your domain (e.g. `quoteflow.app`)
3. Configure DNS (CNAME to `cname.vercel-dns.com`)
4. Update `NEXT_PUBLIC_APP_URL` env var to match
5. Update Supabase Auth redirect URL to new domain

---

## 3. Test Cases

### 3.1 Authentication (TC-AUTH)

#### TC-AUTH-01: Email Signup
- **Precondition:** No existing account
- **Steps:**
  1. Navigate to `/signup`
  2. Enter first name, last name, valid email, password
  3. Submit form
  4. Check email for confirmation
  5. Click confirmation link
- **Expected:** Account created, redirected to `/app`, profile exists in DB, business created
- **Devices:** Desktop Chrome, Mobile Safari, Mobile Chrome

#### TC-AUTH-02: Magic Link Login
- **Precondition:** Existing account
- **Steps:**
  1. Navigate to `/login`
  2. Enter registered email
  3. Submit form
  4. Check email for magic link
  5. Click magic link
- **Expected:** Logged in, redirected to `/app` dashboard
- **Devices:** Desktop Chrome, Mobile Safari

#### TC-AUTH-03: Session Persistence
- **Steps:**
  1. Log in successfully
  2. Close browser tab
  3. Reopen and navigate to `/app`
- **Expected:** Still authenticated, no login redirect
- **Validate:** proxy.ts refreshes session cookie

#### TC-AUTH-04: Auth Redirect Guard
- **Steps:**
  1. Log out (or use incognito)
  2. Navigate directly to `/app/quotes`
- **Expected:** Redirected to `/login`
- **Also test:** `/app/settings`, `/app/customers`

---

### 3.2 Quote Creation (TC-QUOTE)

#### TC-QUOTE-01: Voice Recording
- **Precondition:** Logged in, on `/app/quotes/new`
- **Steps:**
  1. Click "Record Voice Note"
  2. Grant microphone permission
  3. Speak for 15 seconds about an HVAC repair
  4. Click "Stop Recording"
  5. Verify audio playback works
- **Expected:** Audio blob created, waveform displays, playback works
- **Devices:** Desktop Chrome, iPhone Safari (test both codecs), Android Chrome

#### TC-QUOTE-02: Voice Transcription
- **Precondition:** Voice recording completed
- **Steps:**
  1. Click "Transcribe" (or auto-transcribes)
  2. Wait for AssemblyAI processing
  3. Review transcript text
  4. Check confidence badge color
  5. Edit a word in the transcript
- **Expected:** Transcript appears within 30s, confidence shown, edits persist
- **Edge cases:** Poor audio quality, background noise, short (<5s) recording

#### TC-QUOTE-03: AI Quote Generation
- **Precondition:** Transcript ready (optionally with photos)
- **Steps:**
  1. Click "Generate with AI"
  2. Wait for Claude processing (target: <15s)
  3. Review generated line items
  4. Check confidence badges on each item
  5. Verify pricing is reasonable for the industry
- **Expected:** Line items generated with titles, quantities, prices; confidence shown per item
- **Edge cases:** Very short transcript, transcript with no actionable work, multiple trades

#### TC-QUOTE-04: Line Item Editing
- **Precondition:** AI-generated line items displayed
- **Steps:**
  1. Edit a line item title
  2. Change quantity
  3. Change unit price
  4. Delete a line item
  5. Add a new line item manually
  6. Verify totals recalculate
- **Expected:** All edits persist, subtotal/tax/total update in real-time

#### TC-QUOTE-05: Quote Save
- **Precondition:** Line items reviewed and edited
- **Steps:**
  1. Click "Save Quote"
  2. Verify redirect to quote detail or quotes list
  3. Navigate to `/app/quotes` and find the new quote
  4. Open the quote detail
- **Expected:** Quote saved with correct number (prefix-00001), all line items stored, totals correct

#### TC-QUOTE-06: Photo Upload (Single)
- **Precondition:** On quote creation wizard
- **Steps:**
  1. Click "Add Photos"
  2. Select a 5MB JPEG from camera roll
  3. Wait for upload
  4. Verify thumbnail appears
- **Expected:** Image compressed to <1MB WebP, thumbnail generated, preview shows
- **Edge cases:** PNG, HEIC from iPhone, very large (>10MB should fail)

#### TC-QUOTE-07: Multi-Photo Upload
- **Steps:**
  1. Upload 5 photos in sequence
  2. Verify all 5 thumbnails appear
  3. Generate AI quote with all 5 photos
  4. Verify Claude analysis references details from multiple photos
- **Expected:** All 5 processed and visible, AI uses all photos in analysis

---

### 3.3 Quote Delivery (TC-SEND)

#### TC-SEND-01: Email Delivery
- **Precondition:** Quote saved with customer email
- **Steps:**
  1. Open quote detail (`/app/quotes/[id]`)
  2. Click "Send Quote"
  3. Select "Email" delivery method
  4. Confirm send
  5. Check recipient inbox
- **Expected:** Email received within 60s, branded with business color/logo, "View Quote" link works
- **Also verify:** Quote status changes to "sent", `sent_at` timestamp set

#### TC-SEND-02: SMS Delivery
- **Precondition:** Quote saved with customer phone
- **Steps:**
  1. Open quote detail
  2. Click "Send Quote"
  3. Select "SMS" delivery method
  4. Confirm send
  5. Check recipient phone
- **Expected:** SMS received within 30s, message under 160 chars, includes public quote link

#### TC-SEND-03: Public Quote View
- **Precondition:** Quote sent via email or SMS
- **Steps:**
  1. Open the public link (from email or SMS) in incognito browser
  2. Verify business branding (logo, primary color)
  3. Verify all line items and totals display
  4. Verify expiry countdown shows
  5. Check mobile responsiveness
- **Expected:** Full quote visible without login, branded header, responsive on mobile
- **Security:** URL should not expose other quotes or business internal data

#### TC-SEND-04: Accept Quote
- **Precondition:** Public quote page open
- **Steps:**
  1. Click "Accept Quote"
  2. Verify confirmation message
  3. Check business owner's email for acceptance notification
  4. Navigate to quote in app - verify status = "accepted"
- **Expected:** Status updates, `accepted_at` set, notification sent to business

#### TC-SEND-05: Decline Quote
- **Precondition:** Public quote page open
- **Steps:**
  1. Click "Decline Quote"
  2. Verify confirmation/status change
  3. Navigate to quote in app - verify status = "declined"
- **Expected:** Status updates, `declined_at` set

---

### 3.4 Customer Management (TC-CUST)

#### TC-CUST-01: Create Customer
- **Steps:**
  1. Navigate to `/app/customers/new`
  2. Fill in: first name, last name, email, phone, company, address
  3. Submit
  4. Verify customer appears in list
- **Expected:** Customer created, shown in `/app/customers`

#### TC-CUST-02: Search Customer
- **Steps:**
  1. Navigate to `/app/customers`
  2. Type partial name in search
  3. Verify results filter in real-time (trigram search)
  4. Try searching by email, phone, company name
- **Expected:** Results appear within 200ms, partial matches work

#### TC-CUST-03: Edit Customer
- **Steps:**
  1. Open customer detail
  2. Edit phone number
  3. Save
  4. Refresh page and verify change persisted
- **Expected:** Update saves, `updated_at` changes

---

### 3.5 Settings (TC-SET)

#### TC-SET-01: Business Profile
- **Steps:**
  1. Navigate to `/app/settings/profile`
  2. Change business name
  3. Change phone and email
  4. Fill in address fields
  5. Wait for autosave (1s debounce)
  6. Verify toast "Settings saved"
  7. Refresh page - verify fields persisted
- **Expected:** All fields save, toast confirms, data persists across refresh

#### TC-SET-02: Logo Upload
- **Steps:**
  1. On profile page, click logo upload
  2. Select PNG < 2MB
  3. Wait for upload
  4. Verify logo preview updates
  5. Navigate to public quote - verify logo appears
- **Expected:** Logo uploaded to Supabase Storage, preview shows, public quotes use it
- **Edge cases:** SVG, JPEG, >2MB (should fail), non-image file (should fail)

#### TC-SET-03: Brand Color
- **Steps:**
  1. On profile page, click a preset color swatch
  2. Verify preview updates immediately
  3. Enter custom hex in text input
  4. Navigate to public quote - verify header uses new color
- **Expected:** Color saves, preview reflects change, public quotes branded

#### TC-SET-04: Quote Defaults
- **Steps:**
  1. Navigate to `/app/settings/defaults`
  2. Change quote prefix to "INV"
  3. Set default tax rate to 8.5%
  4. Change expiration to 14 days
  5. Add default terms text
  6. Create a new quote
  7. Verify: quote number uses "INV-" prefix, tax rate 8.5%, expires in 14 days
- **Expected:** New quotes inherit all defaults from settings

#### TC-SET-05: Service Catalog CRUD
- **Steps:**
  1. Navigate to `/app/settings/catalog`
  2. Click "Add Item"
  3. Fill: title "AC Filter Replacement", category "HVAC", unit "ea", price $49.99
  4. Save
  5. Verify item appears in list
  6. Edit the price to $54.99
  7. Delete the item
  8. Verify item disappears (soft delete)
- **Expected:** Full CRUD works, category filter works, soft delete hides item

#### TC-SET-06: Notification Preferences
- **Steps:**
  1. Navigate to `/app/settings/notifications`
  2. Toggle email notifications on/off
  3. Refresh page - verify toggles persist (localStorage)
  4. Click "Enable push notifications"
  5. Grant browser permission
- **Expected:** Toggle states persist via localStorage, push permission requested

---

### 3.6 Offline & Sync (TC-OFFLINE)

#### TC-OFFLINE-01: Offline Quote Creation
- **Steps:**
  1. Load app normally while online
  2. Enable airplane mode (or DevTools > Network > Offline)
  3. Navigate to `/app/quotes/new`
  4. Create a quote with manual line items (AI requires network)
  5. Save the quote
  6. Navigate to `/app/quotes`
  7. Verify quote appears with amber "Pending sync" badge
- **Expected:** Quote saved to IndexedDB, visible in list as pending

#### TC-OFFLINE-02: Sync on Reconnect
- **Steps:**
  1. While still offline, verify SyncStatus shows "Offline"
  2. Disable airplane mode / re-enable network
  3. Watch SyncStatus change: Offline -> Syncing -> Done
  4. Refresh quotes list
  5. Verify quote now has real quote number (e.g., QF-00001) and no pending badge
- **Expected:** Background sync processes queue, temp IDs replaced with server IDs

#### TC-OFFLINE-03: Conflict Resolution
- **Steps:**
  1. Create a quote while online
  2. Go offline
  3. Edit the quote title offline
  4. In a second browser tab (still online), edit the same quote with a different title
  5. Go back online in the first tab
  6. Verify conflict dialog appears
  7. Test "Keep My Changes" option
  8. Repeat and test "Reload Server Data" option
- **Expected:** Conflict detected, dialog shown, both resolution options work

#### TC-OFFLINE-04: Background Sync (Service Worker)
- **Steps:**
  1. Create multiple items offline (2 quotes, 1 customer edit)
  2. Close the browser entirely
  3. Reopen the browser
  4. Verify sync happens automatically (check network tab for POST to /api/sync/offline-queue)
- **Expected:** Service Worker Background Sync processes queue even after browser restart

---

## 4. Testing Spreadsheet

### How to Use

Copy this table to a spreadsheet. For each test, fill in Status, Tester, Date, and Notes.

**Status Key:** PASS | FAIL | BLOCKED | SKIP

| ID | Test Case | Priority | Area | Status | Device/Browser | Tester | Date | Bug # | Notes |
|----|-----------|----------|------|--------|----------------|--------|------|-------|-------|
| TC-AUTH-01 | Email signup | P0 | Auth | | Desktop Chrome | | | | |
| TC-AUTH-01 | Email signup | P0 | Auth | | Mobile Safari | | | | |
| TC-AUTH-02 | Magic link login | P0 | Auth | | Desktop Chrome | | | | |
| TC-AUTH-02 | Magic link login | P0 | Auth | | Mobile Safari | | | | |
| TC-AUTH-03 | Session persistence | P1 | Auth | | Desktop Chrome | | | | |
| TC-AUTH-04 | Auth redirect guard | P0 | Auth | | Desktop Chrome | | | | |
| TC-QUOTE-01 | Voice recording | P0 | Quote | | Desktop Chrome | | | | |
| TC-QUOTE-01 | Voice recording | P0 | Quote | | iPhone Safari | | | | |
| TC-QUOTE-01 | Voice recording | P0 | Quote | | Android Chrome | | | | |
| TC-QUOTE-02 | Transcription | P0 | Quote | | Desktop Chrome | | | | |
| TC-QUOTE-03 | AI generation | P0 | Quote | | Desktop Chrome | | | | |
| TC-QUOTE-04 | Line item editing | P1 | Quote | | Desktop Chrome | | | | |
| TC-QUOTE-04 | Line item editing | P1 | Quote | | Mobile Safari | | | | |
| TC-QUOTE-05 | Quote save | P0 | Quote | | Desktop Chrome | | | | |
| TC-QUOTE-06 | Photo upload (single) | P1 | Quote | | Desktop Chrome | | | | |
| TC-QUOTE-06 | Photo upload (single) | P1 | Quote | | iPhone Safari | | | | |
| TC-QUOTE-07 | Multi-photo upload | P1 | Quote | | Desktop Chrome | | | | |
| TC-SEND-01 | Email delivery | P0 | Send | | Desktop Chrome | | | | |
| TC-SEND-02 | SMS delivery | P0 | Send | | Desktop Chrome | | | | |
| TC-SEND-03 | Public quote view | P0 | Send | | Desktop Chrome | | | | |
| TC-SEND-03 | Public quote view | P0 | Send | | Mobile Safari | | | | |
| TC-SEND-04 | Accept quote | P0 | Send | | Mobile Chrome | | | | |
| TC-SEND-05 | Decline quote | P1 | Send | | Mobile Chrome | | | | |
| TC-CUST-01 | Create customer | P1 | Customer | | Desktop Chrome | | | | |
| TC-CUST-02 | Search customer | P1 | Customer | | Desktop Chrome | | | | |
| TC-CUST-03 | Edit customer | P2 | Customer | | Desktop Chrome | | | | |
| TC-SET-01 | Business profile | P1 | Settings | | Desktop Chrome | | | | |
| TC-SET-02 | Logo upload | P1 | Settings | | Desktop Chrome | | | | |
| TC-SET-03 | Brand color | P2 | Settings | | Desktop Chrome | | | | |
| TC-SET-04 | Quote defaults | P1 | Settings | | Desktop Chrome | | | | |
| TC-SET-05 | Catalog CRUD | P2 | Settings | | Desktop Chrome | | | | |
| TC-SET-06 | Notifications | P3 | Settings | | Desktop Chrome | | | | |
| TC-OFFLINE-01 | Offline quote creation | P0 | Offline | | Desktop Chrome | | | | |
| TC-OFFLINE-01 | Offline quote creation | P0 | Offline | | Mobile Chrome | | | | |
| TC-OFFLINE-02 | Sync on reconnect | P0 | Offline | | Desktop Chrome | | | | |
| TC-OFFLINE-03 | Conflict resolution | P1 | Offline | | Desktop Chrome | | | | |
| TC-OFFLINE-04 | Background sync | P1 | Offline | | Desktop Chrome | | | | |
| TC-PERF-01 | Lighthouse audit | P1 | Perf | | Desktop Chrome | | | | |
| TC-PERF-01 | Lighthouse audit | P1 | Perf | | Mobile Chrome | | | | |
| TC-PERF-02 | Core Web Vitals | P1 | Perf | | Desktop Chrome | | | | |
| TC-PERF-03 | PWA installability | P1 | Perf | | Desktop Chrome | | | | |
| TC-PERF-03 | PWA installability | P1 | Perf | | Android Chrome | | | | |
| TC-SEC-01 | RLS isolation | P0 | Security | | Desktop Chrome | | | | |
| TC-SEC-02 | Public URL leakage | P0 | Security | | Desktop Chrome | | | | |
| TC-SEC-03 | File upload validation | P1 | Security | | Desktop Chrome | | | | |
| TC-SEC-04 | Input sanitization | P1 | Security | | Desktop Chrome | | | | |

**Summary:** 45 test executions across 34 unique test cases.

---

## 5. Performance Validation

### 5.1 Lighthouse Audit (TC-PERF-01)

Run in Chrome DevTools > Lighthouse (or PageSpeed Insights) for each page:

| Page | Target (Mobile) | Key Metrics |
|------|----------------|-------------|
| `/` (Landing) | 95+ | LCP, CLS |
| `/login` | 95+ | LCP, CLS |
| `/app` (Dashboard) | 90+ | LCP, TBT |
| `/app/quotes` | 85+ | LCP, TBT (dynamic data) |
| `/app/quotes/new` | 85+ | TBT (dynamic imports) |
| `/public/quotes/[id]` | 90+ | LCP, CLS (customer-facing) |

**Scoring targets:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+
- PWA: All checks pass

### 5.2 Core Web Vitals (TC-PERF-02)

| Metric | Target | How to Measure |
|--------|--------|---------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Lighthouse, CrUX, Vercel Analytics |
| **INP** (Interaction to Next Paint) | < 200ms | Vercel Analytics (replaces FID) |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| **TTFB** (Time to First Byte) | < 800ms | Vercel Analytics |
| **FCP** (First Contentful Paint) | < 1.8s | Lighthouse |

**Measurement approach:**
1. Vercel Analytics > Web Vitals tab (real user data)
2. PageSpeed Insights for lab data
3. Chrome DevTools Performance tab for debugging

### 5.3 API Response Times

| Endpoint | Target | Method |
|----------|--------|--------|
| `/app` (dashboard) | < 500ms | DevTools Network |
| `/app/quotes` (list) | < 500ms | DevTools Network |
| `/app/quotes/[id]` (detail) | < 500ms | DevTools Network |
| `/api/customers/search` | < 300ms | DevTools Network |
| `/api/ai/process-quote` (AI gen) | < 15s | DevTools Network |
| `/api/sync/offline-queue` | < 2s | DevTools Network |

### 5.4 PWA Installability (TC-PERF-03)

**Desktop (Chrome):**
1. Navigate to production URL
2. Look for install icon in address bar
3. Click to install
4. Verify app opens in standalone window
5. Verify offline page works when network disabled

**Android (Chrome):**
1. Navigate to production URL
2. Look for "Add to Home Screen" banner or menu option
3. Install to home screen
4. Open from home screen
5. Verify standalone mode (no browser chrome)
6. Test offline mode

**iOS (Safari):**
1. Navigate to production URL
2. Tap Share > Add to Home Screen
3. Open from home screen
4. Verify standalone mode
5. Note: Background Sync not supported on iOS

---

## 6. Security Checks

### TC-SEC-01: RLS Business Isolation

This is the most critical security test. Two separate accounts must not access each other's data.

**Setup:** Create two test accounts (User A and User B) with separate businesses.

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Log in as User A, create a quote | Quote visible in User A's list |
| 2 | Copy the quote UUID from URL | Note the UUID |
| 3 | Log in as User B | User B's dashboard shows |
| 4 | Navigate to `/app/quotes/{User A's quote ID}` | 404 or empty page (not User A's data) |
| 5 | Open Supabase SQL editor, run: `SELECT * FROM quotes WHERE business_id = '{User A biz}'` as User B's JWT | 0 rows returned |
| 6 | Try to access User A's customers via API | 0 rows returned |
| 7 | Try to update User A's quote via Supabase client | RLS error |

**Browser DevTools test:**
```javascript
// In User B's logged-in session, open DevTools console:
const { data, error } = await supabase
  .from('quotes')
  .select('*')
  .eq('id', 'USER_A_QUOTE_UUID');
// data should be null or empty array, error should be null (filtered, not errored)
```

### TC-SEC-02: Public URL Data Leakage

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Open a sent quote's public URL in incognito | Quote displays correctly |
| 2 | Check page source for business email/phone | Only what's intended to be shown |
| 3 | Check network requests for API calls | No authenticated data leaked |
| 4 | Modify the UUID in the URL slightly | 404 / no data (UUIDs are unguessable) |
| 5 | Try to access a draft quote's public URL | Should not display (draft status excluded by RLS) |
| 6 | Check if public page includes other quote IDs | No links to other quotes |

### TC-SEC-03: File Upload Validation

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Upload a valid JPEG (< 2MB) as logo | Success |
| 2 | Upload a 15MB PNG as logo | Error: "File must be under 2MB" |
| 3 | Upload a .exe file renamed to .jpg | Error: MIME type check rejects |
| 4 | Upload a valid SVG as logo | Success |
| 5 | Upload a quote photo > 10MB | Compressed automatically (or rejected if > server limit) |
| 6 | Upload a PDF as a quote photo | Error: not an image type |

### TC-SEC-04: Input Sanitization

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Enter `<script>alert('xss')</script>` as business name | Stored as text, rendered escaped (no alert) |
| 2 | Enter `'; DROP TABLE quotes;--` as customer name | Stored as literal string (Supabase parameterizes) |
| 3 | Enter `<img src=x onerror=alert(1)>` in quote notes | Rendered as text, not HTML |
| 4 | Search customers with `%` and `_` characters | No SQL injection, characters treated literally |
| 5 | Enter extremely long string (10,000 chars) in description | Handled gracefully (truncated or error) |

---

## 7. Bug Tracking Workflow

### Priority Definitions

| Priority | Definition | Response Time | Examples |
|----------|-----------|--------------|---------|
| **P0 - Blocking** | App crashes, data loss, security hole, auth bypass | Fix immediately | Login broken, quotes deleted, XSS vulnerability |
| **P1 - High** | Feature completely broken, major UX regression | Fix within 24h | AI generation fails, email not sending, offline sync broken |
| **P2 - Medium** | Feature partially broken, workaround exists | Fix within 1 week | Photo upload slow, search results incorrect, styling issue |
| **P3 - Low** | Cosmetic, minor inconvenience | Fix in next sprint | Color slightly off, animation janky, typo |

### Bug Report Template

Use the GitHub Issue template at `.github/ISSUE_TEMPLATE/bug_report.yml` which includes:
- Priority dropdown (P0-P3)
- Feature area
- Steps to reproduce
- Expected vs actual behavior
- Environment details (device, browser, OS, network, PWA status)
- Screenshots/videos
- Console logs / Sentry link
- Related test case ID

### Workflow

```
Discovery -> File Issue -> Triage -> Fix -> Verify -> Close
    |            |           |        |       |
    v            v           v        v       v
  Test case    Bug #      Assign   PR/Fix  Re-test
  fails       created    priority  merged  same steps
```

1. **Discovery:** Tester runs test case, documents failure
2. **File Issue:** Create GitHub issue using bug report template
3. **Triage:** Label with priority (P0-P3) and area tag
4. **Fix:** Developer picks up issue, creates fix
5. **Verify:** Tester re-runs the original test case steps
6. **Close:** Mark issue as closed, update testing spreadsheet

### Labels to Create in GitHub

```
bug, P0-blocking, P1-high, P2-medium, P3-low,
area:auth, area:quotes, area:delivery, area:customers,
area:settings, area:offline, area:performance, area:security
```

---

## End-to-End Critical Path Test

This is the single most important test. If this flow works, the core product works.

### The "Happy Path"

1. **Sign up** at `/signup` with a new email
2. **Verify email** and complete onboarding
3. Navigate to **Settings > Profile**, upload a logo, set brand color to green
4. Navigate to **Settings > Defaults**, set tax rate to 8.25%, prefix to "EST"
5. Navigate to **Customers > New**, create a test customer with email and phone
6. Navigate to **Quotes > New**
7. **Record a voice note**: "I need to replace the AC unit in the client's office. It's a 3-ton unit, about 15 years old. Also need to replace the thermostat and clean the ductwork."
8. **Review transcript**, make minor edits
9. **Upload 2 photos** of the job site
10. Click **"Generate with AI"**
11. **Review AI line items** - should see AC unit, thermostat, ductwork cleaning, labor
12. **Edit** one line item price
13. **Save** the quote
14. Verify quote number is **EST-00001**
15. Open quote detail, click **Send Quote > Email**
16. Check your email - click the **public link**
17. Verify: green branding, logo, all line items, 8.25% tax, 14-day expiry
18. Click **Accept Quote**
19. Go back to app - verify status changed to **Accepted**

**Time target for steps 6-13:** Under 90 seconds (excluding AI processing wait).
