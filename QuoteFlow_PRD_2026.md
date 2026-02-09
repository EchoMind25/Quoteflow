# QuoteFlow - Product Requirements Document (2026)
**Version:** 2.0  
**Last Updated:** February 8, 2026  
**Product Owner:** Braxton | Bedrock AI  
**Target Stack:** Next.js 16 + React 19 + PWA 2.0  
**Target Launch:** Q2 2026 (PWA MVP)

---

## Document Purpose & Scope

This PRD serves as the complete technical and product specification for QuoteFlow, a privacy-first AI-powered quoting platform built with 2026 technology standards. It is optimized for execution by Claude Opus 4.6 and development teams familiar with Next.js 16, React 19, and modern PWA patterns.

**Document Completeness:**
✅ All technical decisions documented with rationale  
✅ Complete database schema with RLS policies and triggers  
✅ Full API architecture with Server Actions + Edge Routes  
✅ PWA 2.0 implementation with offline-first patterns  
✅ AI pipeline architecture with Claude + AssemblyAI  
✅ Security model enforced at database level  
✅ Mobile-first UI patterns and gestures  
✅ Performance targets with measurement strategy  
✅ Complete development phases with timelines

---

## Executive Summary

QuoteFlow transforms job site assessments into accurate, professional quotes using multi-modal AI (vision + voice). Built as a PWA 2.0 application on Next.js 16, it delivers native-app performance while ensuring complete data privacy and ownership for service businesses.

### Core Value Propositions

1. **90-Second Quote Generation:** Photo capture + voice → AI-generated quote → send to customer
2. **Industry-Specific Pricing:** Pre-trained AI models for HVAC, plumbing, electrical, roofing, landscaping, and general (expandable)
3. **Zero Vendor Lock-In:** Businesses own all data, export/delete anytime (GDPR/CCPA compliant)
4. **True Offline Support:** Create quotes without internet via Background Sync API + IndexedDB
5. **White-Label Ready:** Custom branding per business (logo, colors, PWA home screen icon)

### Technical Differentiators (2026)

- **PWA 2.0 Architecture:** Vercel Edge Runtime + Background Sync + IndexedDB = offline-first
- **Privacy-First Design:** Supabase Row-Level Security prevents QuoteFlow from accessing customer data
- **Mobile-First UX:** Bottom navigation, gesture controls, haptic feedback, native font rendering
- **AI Pipeline:** AssemblyAI (voice → text) → Claude Vision (photos) → Structured extraction
- **Next.js 16 Benefits:** Turbopack 40-60% faster builds, React Server Components reduce bundle size

### Success Metrics (90-Day Launch Targets)

**Product:**
- Time to First Quote: < 10 min (signup → first quote sent)
- Quote Creation Speed: < 90s average (capture → delivery)
- AI Accuracy: 95%+ quotes accepted without major edits
- Quote Acceptance Rate: 60%+ of sent quotes accepted
- Offline Success Rate: 100% sync when reconnected

**Business:**
- Monthly Active Users: 500+ by Month 6
- Trial → Paid Conversion: 30%
- Monthly Churn: < 5%
- Net Revenue Retention: 110%+

**Technical:**
- API Response (p95): < 500ms (non-AI), < 15s (AI processing)
- PWA Install Rate: 40%+ mobile users
- Offline Usage: 20%+ quotes created offline
- Uptime: 99.9% (Vercel SLA)

---

## Technology Stack (2026 Standards)

### Core Framework

**Next.js 16.2+**
- **Why:** Turbopack stable (40-60% faster builds), Edge Runtime, React Server Components
- **Breaking Changes from 14:**
  - Async Request APIs (headers, cookies, params must be awaited)
  - Middleware → Proxy pattern (optional migration)
  - Turbopack default for dev/prod
- **Performance Impact:** 500ms faster cold starts, 2x faster HMR

**React 19.0+**
- **Why:** Stable release, Server Actions, improved hydration
- **Breaking Changes:** useFormState → useActionState
- **Bundle Size Impact:** RSC reduces client JS by 30-50%

**TypeScript 5.3+**
- **Config:** Strict mode enabled, path aliases (`@/*`)
- **Why:** Type safety from database → UI via Supabase codegen

### PWA Stack (PWA 2.0)

**Serwist 9.0+** (replaces next-pwa)
- **Why:** Active maintenance, Turbopack compatible, Edge Runtime support
- **Features:** Precaching, runtime caching, Background Sync integration
- **Bundle Impact:** 30% smaller than next-pwa

**Manifest:** Native `app/manifest.ts` (Next.js 16 built-in)

**IndexedDB:** `idb` 8.0+ for offline storage
- **Schema:** Offline queue, quotes cache, photos cache, customers cache
- **Max Storage:** 50MB default (browser-dependent)

**Background Sync API:** Native browser API (Service Worker)
- **Supported:** Chrome/Edge 49+, Safari 15.4+ (iOS PWA only)
- **Fallback:** Manual sync button if unsupported

**Web Push:** VAPID keys + Push API
- **Supported:** Chrome/Edge, Firefox, Safari 16.4+ (iOS PWA)

### Styling & UI

**Tailwind CSS 3.4+**
- **Config:** Mobile-first breakpoints, dark mode support
- **Why:** Utility-first, small bundle (tree-shaken)

**Radix UI** (headless components)
- **Components:** Dialog, Dropdown, Select, Toast
- **Why:** Accessible (ARIA), unstyled (full Tailwind control)

**Lucide React** (icons)
- **Why:** Tree-shakeable, 300+ icons, 2KB per icon

**System UI Font:** `font-family: system-ui`
- **Why:** No web font download, native rendering, instant paint

### Backend & Database

**Supabase (PostgreSQL 15+)**
- **Auth:** JWT + refresh tokens, magic links, OAuth
- **Database:** Row-Level Security (RLS) enforces privacy at DB level
- **Storage:** S3-compatible, CDN-backed, 50GB free tier
- **Edge Functions:** Deno runtime for serverless compute

**Why Supabase:**
- RLS = privacy enforced in database, not application code
- Auto-generated TypeScript types from schema
- Real-time subscriptions (future: live quote updates)
- $25/month scales to 100K users

### AI & Processing

**Claude Sonnet 4.5 (Anthropic)**
- **Model:** `claude-sonnet-4-5-20250929`
- **Use Case:** Vision analysis (photos) + text extraction (transcripts)
- **Cost:** ~$3 per 1M tokens input, ~$15 per 1M output
- **Performance:** 50 images/sec, 200K tokens/min

**AssemblyAI 4.3+**
- **Use Case:** Real-time voice transcription
- **Cost:** ~$0.00015 per second ($0.009 per minute)
- **Performance:** 5x realtime (1 min audio transcribed in 12s)

### Third-Party Integrations

**Resend** (email delivery)
- **Why:** React Email templates, 100 emails/day free
- **Cost:** $20/month for 50K emails

**Twilio** (SMS delivery)
- **Cost:** $0.0079 per SMS (US)

**Stripe** (payments)
- **Fee:** 2.9% + $0.30 per transaction

### Development & Deployment

**Vercel** (hosting)
- **Features:** Edge Network, auto-scaling, previews
- **Cost:** $20/month Hobby (commercial use allowed)

**GitHub Actions** (CI/CD)
- **Workflows:** Lint, test, deploy to Vercel preview

**Sentry** (error tracking)
- **Cost:** $26/month for 50K events

**Vitest** (unit tests), **Playwright** (e2e tests)

---

## System Architecture (PWA 2.0 Pattern)

```
┌─────────────────────────────────────────────────────────┐
│              User Device (PWA Installed)                 │
│  ┌────────────────────────────────────────────────┐     │
│  │  Next.js 16 Client (React 19)                  │     │
│  │  - Photo capture → IndexedDB                   │     │
│  │  - Voice recording → IndexedDB                 │     │
│  │  - Offline quote creation                      │     │
│  └────────────────────┬───────────────────────────┘     │
│  ┌────────────────────┴───────────────────────────┐     │
│  │  Service Worker (Serwist)                      │     │
│  │  - Precache app shell                          │     │
│  │  - Cache API responses (5 min TTL)             │     │
│  │  - Queue offline operations                    │     │
│  │  - Background Sync on reconnect                │     │
│  └────────────────────┬───────────────────────────┘     │
│  ┌────────────────────┴───────────────────────────┐     │
│  │  IndexedDB (idb)                               │     │
│  │  - offline_queue (sync queue)                  │     │
│  │  - quotes_cache (offline quotes)               │     │
│  │  - photos_cache (unuploaded photos)            │     │
│  │  - customers_cache (local directory)           │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS/TLS 1.3
                       ▼
┌─────────────────────────────────────────────────────────┐
│          Vercel Edge Network (300+ Locations)            │
│  ┌────────────────────────────────────────────────┐     │
│  │  Next.js App Router (React Server Components)  │     │
│  │  ┌──────────────────────────────────────────┐  │     │
│  │  │  Server Actions (no API routes)          │  │     │
│  │  │  - createQuote()                         │  │     │
│  │  │  - updateQuote()                         │  │     │
│  │  │  - sendQuoteToCustomer()                 │  │     │
│  │  └──────────────────────────────────────────┘  │     │
│  │  ┌──────────────────────────────────────────┐  │     │
│  │  │  Edge API Routes (< 20ms cold start)     │  │     │
│  │  │  - POST /api/ai/process-quote            │  │     │
│  │  │  - POST /api/sync/offline-queue          │  │     │
│  │  │  - POST /api/webhooks/stripe             │  │     │
│  │  └──────────────────────────────────────────┘  │     │
│  │  ┌──────────────────────────────────────────┐  │     │
│  │  │  Node.js Routes (heavy compute)          │  │     │
│  │  │  - POST /api/pdf/generate                │  │     │
│  │  │  - POST /api/upload/photo                │  │     │
│  │  └──────────────────────────────────────────┘  │     │
│  └────────────┬───────────────────┬───────────────┘     │
└───────────────┼───────────────────┼──────────────────────┘
                │                   │
                ▼                   ▼
┌──────────────────────┐   ┌────────────────────────────┐
│  Supabase Platform   │   │  AI Processing Pipeline    │
│  ┌────────────────┐  │   │  ┌──────────────────────┐  │
│  │ PostgreSQL 15  │  │   │  │  AssemblyAI          │  │
│  │ (RLS enabled)  │  │   │  │  - Transcribe voice  │  │
│  └────────────────┘  │   │  └───────┬──────────────┘  │
│  ┌────────────────┐  │   │          │                 │
│  │ Auth (JWT)     │  │   │          ▼                 │
│  └────────────────┘  │   │  ┌──────────────────────┐  │
│  ┌────────────────┐  │   │  │  Claude Sonnet 4.5   │  │
│  │ Storage (S3)   │  │   │  │  - Analyze photos    │  │
│  │ - Photos       │  │   │  │  - Extract items     │  │
│  │ - Voice files  │  │   │  │  - Suggest pricing   │  │
│  │ - PDFs         │  │   │  │  - JSON output       │  │
│  └────────────────┘  │   │  └───────┬──────────────┘  │
│  ┌────────────────┐  │   │          │                 │
│  │ Edge Functions │◄─┼───┼──────────┘                 │
│  │ (Deno)         │  │   │                            │
│  └────────────────┘  │   │                            │
└──────────────────────┘   └────────────────────────────┘
                │
                │ Webhooks
                ▼
┌─────────────────────────────────────────────────────────┐
│             External Integrations                        │
│  - Stripe (payments)                                     │
│  - Twilio (SMS)                                          │
│  - Resend (email)                                        │
│  - QuickBooks (accounting, Phase 3)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Core Features (MVP Scope)

### 1. Multi-Modal Quote Input

**User Flow:**
1. User selects service category (e.g., "HVAC Repair - Residential")
2. User captures 1-10 photos of job site
3. User provides context via:
   - Voice recording (up to 5 min) OR
   - Text form (optional, manual entry)
4. Photos + transcript sent to AI pipeline (Edge Route)
5. Claude analyzes photos + transcript → structured line items + pricing
6. User reviews, edits, approves
7. User sends quote to customer via email/SMS

**Technical Implementation:**

**Photo Capture (Mobile-First):**
```typescript
// components/photo-capture.tsx
'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { cachePhoto } from '@/lib/db/indexed-db';

export function PhotoCapture({ quoteId }: { quoteId: string }) {
  const [photos, setPhotos] = useState<File[]>([]);
  
  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Compress and cache locally
    for (const file of files) {
      const compressed = await compressImage(file);
      await cachePhoto(quoteId, compressed);
    }
    
    setPhotos(prev => [...prev, ...files]);
  };
  
  return (
    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
      <Camera className="w-12 h-12 text-gray-400" />
      <span className="mt-2 text-sm text-gray-600">
        Tap to capture photos ({photos.length}/10)
      </span>
      <input
        type="file"
        accept="image/*"
        capture="environment" // Use rear camera
        multiple
        onChange={handleCapture}
        className="hidden"
      />
    </label>
  );
}

async function compressImage(file: File): Promise<Blob> {
  // Use browser Image API to compress to max 1MB
  const img = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(1920, (1920 / img.width) * img.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
```

**Voice Recording:**
```typescript
// components/voice-recorder.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';

export function VoiceRecorder({ onRecordingComplete }: { onRecordingComplete: (blob: Blob) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // SEC-010: Clean up media tracks on unmount to release microphone
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });
    
    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onRecordingComplete(blob);
      chunksRef.current = [];
    };
    
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };
  
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };
  
  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-4 rounded-full ${isRecording ? 'bg-red-600' : 'bg-blue-600'} text-white`}
    >
      {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
    </button>
  );
}
```

**AI Processing (Server Action — preferred; API route shown for reference):**
```typescript
// app/api/ai/process-quote/route.ts
// NOTE: Uses Node.js runtime (default) because AssemblyAI SDK requires node:http.
// In the actual codebase, AI processing is done via Server Actions (lib/actions/ai.ts),
// not API routes. This route is shown for architectural reference only.
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AssemblyAI } from 'assemblyai';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const assemblyai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! });

export async function POST(req: NextRequest) {
  // SEC-004: Authentication check — AI routes must require auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { photo_urls, audio_url, service_category } = await req.json();
  
  // Step 1: Transcribe voice (if provided)
  let transcript = '';
  if (audio_url) {
    const transcription = await assemblyai.transcripts.transcribe({
      audio: audio_url,
      language_code: 'en_us',
    });
    transcript = transcription.text || '';
  }
  
  // Step 2: Get industry-specific prompt
  const systemPrompt = await getPromptForCategory(service_category);
  
  // Step 3: Call Claude with photos + transcript
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          ...photo_urls.map((url: string) => ({
            type: 'image' as const,
            source: { type: 'url' as const, url },
          })),
          {
            type: 'text' as const,
            text: transcript
              ? `Voice context: ${transcript}\n\nAnalyze photos and generate quote line items.`
              : 'Analyze photos and generate quote line items.',
          },
        ],
      },
    ],
  });
  
  // Step 4: Parse structured output
  const textBlock = response.content.find(b => b.type === 'text');
  const lineItems = JSON.parse(textBlock?.text || '[]');
  
  return Response.json({ line_items: lineItems });
}

async function getPromptForCategory(category: string): Promise<string> {
  // Fetch from pricing_catalog or use default
  return `You are an HVAC pricing expert. Extract line items from photos/transcript in JSON format...`;
}
```

### 2. Industry-Specific Pricing Intelligence

**Pricing Data Sources:**
1. **Default Pricing (QuoteFlow curated):** Stored in `default_pricing_data` table
2. **Business Overrides:** Stored in `pricing_catalog` table per business
3. **AI Suggestions:** Claude recommends based on photos + market data

**Pricing Hierarchy:**
```
User manual override (highest priority)
  ↓
Business custom pricing (pricing_catalog)
  ↓
Default market pricing (default_pricing_data)
  ↓
AI suggested pricing (Claude API)
```

**Example: HVAC AC Repair Pricing**

```sql
-- Seed data in default_pricing_data
INSERT INTO default_pricing_data (
  industry, service_type, service_tier,
  region, zip_code_prefix,
  price_min_cents, price_avg_cents, price_max_cents,
  labor_rate_min_cents, labor_rate_avg_cents, labor_rate_max_cents,
  data_source, confidence_score
) VALUES (
  'hvac', 'ac_capacitor_replacement', 'residential',
  'US-West', '84',
  12000, 18500, 25000, -- $120 - $250
  9500, 12000, 15000,   -- $95 - $150/hr labor
  'echo_mind_clients', 0.92
);
```

**Claude Pricing Prompt (HVAC Example):**

```
You are an HVAC pricing expert analyzing a service call. Extract line items in JSON format.

DETECTED EQUIPMENT (from photos):
- Brand: [from model plate photo]
- Model: [from model plate photo]
- Age: [estimate from wear]
- Problem: [from user transcript or visible damage]

PRICING RULES (Salt Lake City, UT):
- Diagnostic fee: $89-$99 (first line item)
- Labor rate: $95-$150/hour
- Emergency surcharge: +50% (after hours)

COMMON PARTS & PRICES:
- Capacitor: $120-$250 installed
- Contactor: $150-$300 installed
- Compressor: $800-$1500 installed
- Refrigerant R-410A: $75-$100/lb

OUTPUT FORMAT (JSON):
{
  "line_items": [
    {
      "title": "Diagnostic Fee",
      "quantity": 1,
      "unit": "job",
      "unit_price_cents": 8900,
      "item_type": "service",
      "confidence": 1.0,
      "reasoning": "Standard diagnostic fee"
    },
    {
      "title": "AC Capacitor Replacement - Dual Run 35/5",
      "quantity": 1,
      "unit": "ea",
      "unit_price_cents": 18500,
      "item_type": "material",
      "confidence": 0.95,
      "reasoning": "Capacitor visible in photo 3, bulging indicates failure"
    }
  ],
  "detected_equipment": "Carrier 24ACB3 3-ton AC unit, approx 8 years old",
  "recommended_follow_up": "Schedule annual maintenance to prevent future failures"
}

IMPORTANT:
- Include diagnostic fee as first item
- Be conservative with pricing (use avg, not max)
- Flag low-confidence items (< 0.8) for user review
- If unsure about part, mark confidence < 0.7 and ask user to verify
```

### 3. Customer Management & Quote Delivery

**Customer Profile (Auto-Created or Selected):**

```typescript
// app/actions/customers.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function findOrCreateCustomer(address: {
  line1: string;
  city: string;
  state: string;
  zip: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}) {
  const supabase = await createClient();

  // SEC-012: Verify the caller is authenticated before accessing customer data
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  // Try to find existing customer by address
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('address_line1', address.line1)
    .eq('zip_code', address.zip)
    .single();
    
  if (existing) return existing;
  
  // Create new customer
  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      first_name: address.first_name,
      last_name: address.last_name,
      email: address.email,
      phone: address.phone,
      address_line1: address.line1,
      city: address.city,
      state: address.state,
      zip_code: address.zip,
    })
    .select()
    .single();
    
  if (error) throw error;
  return customer;
}
```

**Quote Delivery Options:**

1. **Email (Resend + React Email):**

```typescript
// lib/email/send-quote.ts
import { Resend } from 'resend';
import { QuoteEmail } from '@/emails/quote-email';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendQuoteEmail(quote: Quote, customer: Customer, business: Business) {
  await resend.emails.send({
    from: `${business.name} <quotes@quoteflow.app>`,
    to: customer.email,
    subject: `Quote #${quote.quote_number} from ${business.name}`,
    react: QuoteEmail({ quote, customer, business }),
  });
}
```

```typescript
// emails/quote-email.tsx
import { Html, Button, Section, Text } from '@react-email/components';

export function QuoteEmail({ quote, customer, business }) {
  const acceptUrl = `https://quoteflow.app/public/quotes/${quote.id}/accept`;
  
  return (
    <Html>
      <Section style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>
          {business.name}
        </Text>
        <Text style={{ fontSize: '18px', marginTop: '20px' }}>
          Hi {customer.first_name},
        </Text>
        <Text>
          Thank you for your interest! Here's your quote for {quote.title}:
        </Text>
        
        {/* Quote line items */}
        <table style={{ width: '100%', marginTop: '20px' }}>
          {quote.line_items.map(item => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td style={{ textAlign: 'right' }}>
                ${(item.line_total_cents / 100).toFixed(2)}
              </td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', fontSize: '18px' }}>
            <td>Total:</td>
            <td style={{ textAlign: 'right' }}>
              ${(quote.total_cents / 100).toFixed(2)}
            </td>
          </tr>
        </table>
        
        <Button
          href={acceptUrl}
          style={{
            backgroundColor: '#3B82F6',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            marginTop: '30px',
          }}
        >
          View & Accept Quote
        </Button>
        
        <Text style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
          This quote is valid until {new Date(quote.expires_at).toLocaleDateString()}.
        </Text>
      </Section>
    </Html>
  );
}
```

2. **SMS (Twilio):**

```typescript
// lib/sms/send-quote.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendQuoteSMS(quote: Quote, customer: Customer, business: Business) {
  const viewUrl = `https://quoteflow.app/public/quotes/${quote.id}`;
  
  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: customer.phone,
    body: `${business.name}: Your quote for ${quote.title} is ready! View here: ${viewUrl}`,
  });
}
```

3. **Public Quote View (Customer-Facing Page):**

```typescript
// app/public/quotes/[id]/page.tsx
import { createServiceClient } from '@/lib/supabase/service';
import { AcceptQuoteButton } from './accept-button';

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Service role bypasses RLS. Quote access is validated by UUID secrecy.
  // Using anon client here would fail because RLS policies require
  // an authenticated user with a matching business_id.
  const supabase = createServiceClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      *,
      line_items:quote_line_items(*),
      customer:customers(*),
      business:businesses(name, logo_url, primary_color)
    `)
    .eq('id', id)
    .single();
    
  if (!quote) return <div>Quote not found</div>;
  
  return (
    <div style={{ '--brand-color': quote.business.primary_color }}>
      {/* Branded quote view */}
      <header className="bg-[var(--brand-color)] text-white p-6">
        {quote.business.logo_url && (
          <img src={quote.business.logo_url} alt={quote.business.name} className="h-12" />
        )}
        <h1 className="text-2xl font-bold mt-4">{quote.business.name}</h1>
      </header>
      
      <main className="p-6">
        <h2 className="text-xl font-semibold">Quote #{quote.quote_number}</h2>
        <p className="text-gray-600">{quote.title}</p>
        
        {/* Line items table */}
        <table className="w-full mt-6">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Item</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Price</th>
            </tr>
          </thead>
          <tbody>
            {quote.line_items.map(item => (
              <tr key={item.id} className="border-b">
                <td className="py-3">
                  <div className="font-medium">{item.title}</div>
                  {item.description && (
                    <div className="text-sm text-gray-600">{item.description}</div>
                  )}
                </td>
                <td className="text-right">
                  {item.quantity} {item.unit}
                </td>
                <td className="text-right">
                  ${(item.line_total_cents / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold text-lg">
              <td colSpan={2} className="text-right py-4">Total:</td>
              <td className="text-right py-4">
                ${(quote.total_cents / 100).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
        
        <div className="mt-8 flex gap-4">
          <AcceptQuoteButton quoteId={quote.id} />
          <button className="px-6 py-3 border border-gray-300 rounded-lg">
            Decline
          </button>
        </div>
      </main>
    </div>
  );
}
```

---

*Due to character limits, I'm creating Part 1 here. The full PRD continues with:*

- **Team Management & Approval Workflows**
- **White-Label Branding**
- **Templates & Service Catalogs**
- **Data Ownership & Export**
- **Integrations (Stripe, QuickBooks, ServiceTitan)**
- **Complete AI Pipeline with Prompts**
- **Mobile-First UI Patterns (Bottom Nav, Gestures, Haptics)**
- **Security & Compliance (RLS Policies, GDPR, SOC 2)**
- **Development Phases (Weeks 1-10 Detailed)**
- **Testing Strategy (Unit, E2E, Performance)**
- **Deployment Guide (Vercel, Supabase, Monitoring)**
- **Appendices (File Structure, Env Variables, Scripts)**

Would you like me to:
1. **Continue with Part 2** (remaining sections in a second file)?
2. **Generate specific sections** you need most urgently?
3. **Create implementation examples** for specific features?