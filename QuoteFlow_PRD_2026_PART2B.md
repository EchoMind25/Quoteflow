# QuoteFlow - Product Requirements Document Part 2B (2026)
**Version:** 2.0  
**Last Updated:** February 8, 2026  
**Continuation of:** QuoteFlow_PRD_2026_PART1.md + Part 2A

---

## Table of Contents (Part 2B)

11. Mobile-First UI Patterns
12. Security & Compliance Deep-Dive
13. Pricing Model & Unit Economics
14. Development Phases (Week-by-Week)
15. Testing Strategy
16. Deployment Guide
17. Appendices

---

## 11. Mobile-First UI Patterns (2026 Standards)

### Bottom Navigation (iOS/Android Standard)

**Why Bottom Nav:**
- Thumb-reachable on large phones (6.7"+ screens)
- Native app pattern (users expect it)
- Persistent across all screens

**Implementation:**

```typescript
// components/bottom-nav.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, FileText, Users, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom z-40">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Safe Area Insets (for notched screens):**

```css
/* styles/globals.css */
:root {
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
  --safe-area-inset-left: env(safe-area-inset-left);
  --safe-area-inset-right: env(safe-area-inset-right);
}

.safe-area-inset-bottom {
  padding-bottom: calc(1rem + var(--safe-area-inset-bottom));
}

.safe-area-inset-top {
  padding-top: calc(1rem + var(--safe-area-inset-top));
}
```

### Gesture Controls

**Swipe to Delete (Quote List):**

```typescript
// components/swipeable-quote-item.tsx
'use client';

import { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

export function SwipeableQuoteItem({ quote, onDelete }: {
  quote: any;
  onDelete: (id: string) => void;
}) {
  const [translateX, setTranslateX] = useState(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100)); // Max 100px swipe
    }
  };
  
  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    
    // If swiped more than 50px, trigger delete
    if (translateX < -50) {
      onDelete(quote.id);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };
  
  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6">
        <Trash2 className="w-6 h-6 text-white" />
      </div>
      
      {/* Swipeable content */}
      <div
        className="relative bg-white dark:bg-gray-800 transition-transform touch-pan-y"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {quote.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ${(quote.total_cents / 100).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Pull-to-Refresh:**

```typescript
// components/pull-to-refresh.tsx
'use client';

import { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

export function PullToRefresh({ onRefresh, children }: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const PULL_THRESHOLD = 80; // Trigger refresh at 80px pull
  
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only trigger if scrolled to top
    if (containerRef.current?.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    // Only pull down (positive values)
    if (diff > 0) {
      setPullDistance(Math.min(diff, PULL_THRESHOLD * 1.5));
    }
  };
  
  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD) {
      // Trigger refresh
      await onRefresh();
    }
    
    setIsPulling(false);
    setPullDistance(0);
  };
  
  return (
    <div
      ref={containerRef}
      className="overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center py-4 transition-opacity"
          style={{
            opacity: pullDistance / PULL_THRESHOLD,
          }}
        >
          <RefreshCw
            className={`w-6 h-6 text-blue-600 ${pullDistance >= PULL_THRESHOLD ? 'animate-spin' : ''}`}
          />
        </div>
      )}
      
      {/* Content */}
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}
```

### Haptic Feedback

```typescript
// lib/utils/haptics.ts
export const haptics = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },
  
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 30, 10]); // Pattern: short-gap-short
    }
  },
  
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]); // Pattern: long-gap-long
    }
  },
};

// Usage:
// <button onClick={() => { haptics.medium(); handleClick(); }}>
```

### Native Font Rendering

```css
/* Use system fonts for instant paint (no font download) */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
               'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
               'Helvetica Neue', sans-serif;
}

/* Numbers use tabular nums for alignment in tables */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

---

## 12. Security & Compliance Deep-Dive

### Row-Level Security (RLS) Enforcement

**Core Principle:** Privacy enforced at database level, not application code.

**Example RLS Policy Deep-Dive:**

```sql
-- Policy: Users can only view quotes from their own business

CREATE POLICY "team_view_quotes" ON quotes
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- What this prevents:
-- 1. User A (Business X) cannot query quotes from Business Y
-- 2. Even if app code tries to bypass (SQL injection, bug), database blocks it
-- 3. QuoteFlow admins cannot access business data (no service_role bypass)
```

**Testing RLS Policies:**

```sql
-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Try to access another business's quotes (should return empty)
SELECT * FROM quotes WHERE business_id = 'other-business-id';
-- Result: 0 rows (RLS blocks access)

-- Try to access own business's quotes (should work)
SELECT * FROM quotes WHERE business_id = 'my-business-id';
-- Result: Returns quotes
```

### API Rate Limiting

**Implementation via Vercel Edge Middleware:**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
});

export async function middleware(request: NextRequest) {
  // Get user ID from auth
  const userId = request.headers.get('x-user-id');
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check rate limit
  const { success, limit, reset, remaining } = await ratelimit.limit(userId);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', reset },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*', // Apply to all API routes
};
```

### Encryption (Data at Rest)

**Supabase handles encryption at rest automatically (AES-256).**

**Application-Level Encryption (for sensitive fields):**

```typescript
// lib/crypto/encrypt.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Usage: Encrypt API keys in integrations table
const encrypted = encrypt(apiKey);
await supabase
  .from('integrations')
  .update({ credentials_encrypted: encrypted })
  .eq('id', integrationId);
```

### CSRF Protection (Built-in via Server Actions)

**Next.js 16 Server Actions have automatic CSRF protection:**

- Each form submission includes an anti-CSRF token
- Token validated server-side before execution
- No manual CSRF implementation needed

**For API routes (webhooks), validate signatures:**

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  // Process event...
}
```

### Audit Logging

**All critical actions logged to `activity_logs` table (immutable):**

```typescript
// lib/audit/log.ts
import { createClient } from '@/lib/supabase/server';

export async function logActivity({
  action_type,
  resource_type,
  resource_id,
  description,
  metadata,
}: {
  action_type: string;
  resource_type: string;
  resource_id: string;
  description: string;
  metadata?: any;
}) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from('team_members')
    .select('id, business_id')
    .eq('user_id', user!.id)
    .single();
    
  await supabase.from('activity_logs').insert({
    business_id: member!.business_id,
    user_id: member!.id,
    action_type,
    resource_type,
    resource_id,
    description,
    metadata: metadata || {},
  });
}

// Usage in Server Action:
export async function sendQuoteToCustomer(quoteId: string) {
  // ... send quote logic ...
  
  await logActivity({
    action_type: 'quote_sent',
    resource_type: 'quote',
    resource_id: quoteId,
    description: `Sent quote #${quote.quote_number} to ${customer.email}`,
    metadata: { delivery_method: 'email' },
  });
}
```

---

## 13. Pricing Model & Unit Economics

### Pricing Plans

**Solo Plan: $60/month**
- Unlimited quotes
- Unlimited customers
- AI quote generation (photos + voice)
- Email + SMS delivery
- Basic reporting
- 1 user

**Team Plan: $100/month**
- Everything in Solo
- 2 users included
- $15/month per additional user
- Approval workflows
- Team performance reports
- Role-based permissions
- Priority support

**Enterprise Plan: Custom**
- Everything in Team
- Unlimited users
- Custom integrations (ServiceTitan, QuickBooks, etc.)
- White-label API access
- Dedicated success manager
- SLA guarantees (99.99% uptime)

### Unit Economics (Solo Plan)

**Revenue Per User Per Month (RPUPM):**

```
Subscription: $60.00
Total Revenue: $60.00
```

**Cost of Goods Sold (COGS):**

```
AI Processing (avg 100 quotes/month):
- Claude API: 100 quotes × $0.03 = $3.00
- AssemblyAI: 100 quotes × $0.02 = $2.00
AI Total: $5.00

Infrastructure:
- Vercel (pro-rated): $1.50
- Supabase (pro-rated): $0.50
- Upstash Redis (rate limiting): $0.20
Infrastructure Total: $2.20

Third-Party Services:
- Resend (100 emails): $0.20
- Twilio (50 SMS): $0.40
Third-Party Total: $0.60

Payment Processing:
- Stripe fee (2.9% + $0.30): $2.04
Payment Total: $2.04

Total COGS: $9.84
```

**Gross Margin:**

```
Revenue: $60.00
COGS: $9.84
Gross Profit: $50.16
Gross Margin: 83.6%
```

**Break-Even Analysis:**

```
Fixed Costs (per month):
- Support (0.25 FTE @ $4k/month): $1,000
- Engineering (1 FTE @ $10k/month): $10,000
- Sales/Marketing: $5,000
Total Fixed: $16,000

Break-even users: $16,000 / $50.16 = 319 users
```

**Target Economics at Scale (1,000 users):**

```
Revenue: $60,000/month ($720k/year)
COGS: $9,840/month
Gross Profit: $50,160/month
Fixed Costs: $16,000/month
Net Profit: $34,160/month ($410k/year)

Net Margin: 56.9%
```

### Team Plan Economics

**Revenue (avg 5 users per team):**

```
Base: $100.00
Additional users (3 × $15): $45.00
Total Revenue: $145.00/team
```

**COGS (5x AI usage, same infra):**

```
AI: $5.00 × 5 = $25.00
Infrastructure: $2.20 (shared)
Third-Party: $0.60 × 5 = $3.00
Payment: $4.51
Total COGS: $35.31

Gross Profit: $109.69/team
Gross Margin: 75.6%
```

**Why Team Plans Are More Profitable:**
- Higher revenue per account
- Infrastructure costs don't scale linearly
- Lower churn (team accounts more sticky)

---

## 14. Development Phases (Week-by-Week)

### Phase 1: MVP Core (10 weeks)

#### Week 1-2: Foundation & Setup

**Goals:**
- Next.js 16 project initialized
- Supabase project created
- Core database schema deployed
- Authentication working
- RLS policies tested

**Tasks:**

**Week 1:**
- [ ] Initialize Next.js 16 project with Turbopack
- [ ] Set up Vercel project + GitHub integration
- [ ] Create Supabase project (US region)
- [ ] Generate Supabase types from schema
- [ ] Implement auth pages (login, signup, magic link)
- [ ] Set up Tailwind CSS + dark mode
- [ ] Configure environment variables (local + Vercel)

**Week 2:**
- [ ] Deploy `businesses`, `team_members`, `customers` tables
- [ ] Write RLS policies for all 3 tables
- [ ] Test RLS policies with different user roles
- [ ] Implement business creation flow (signup)
- [ ] Build onboarding wizard (4 steps: profile, industry, pricing, first quote)
- [ ] Set up Sentry error tracking
- [ ] Deploy staging environment

**Deliverables:**
- Working auth system
- Business creation flow
- Core tables with RLS

---

#### Week 3-4: Quote Creation (Offline-First)

**Goals:**
- Photo capture working
- Voice recording working
- Offline storage (IndexedDB)
- Background Sync implemented

**Tasks:**

**Week 3:**
- [ ] Implement photo capture component (mobile camera API)
- [ ] Photo compression (resize to 1920px, WebP format)
- [ ] IndexedDB setup (quotes_cache, photos_cache)
- [ ] Save photos to IndexedDB when offline
- [ ] Voice recording component (MediaRecorder API)
- [ ] Save recordings to IndexedDB
- [ ] Service Worker setup with Serwist
- [ ] Precache app shell

**Week 4:**
- [ ] Background Sync registration
- [ ] Offline queue implementation
- [ ] Sync queue processor (upload photos → create quote)
- [ ] Deploy `quotes`, `quote_line_items`, `quote_photos` tables
- [ ] Quote creation Server Action
- [ ] Quote list page (with offline indicator)
- [ ] Quote detail page
- [ ] Test offline → online sync flow

**Deliverables:**
- Full offline quote creation
- Background Sync working
- Photos uploaded when online

---

#### Week 5-6: AI Processing

**Goals:**
- AssemblyAI transcription working
- Claude Vision analysis working
- Line item extraction accurate (95%+ for HVAC)

**Tasks:**

**Week 5:**
- [ ] AssemblyAI account setup + API key
- [ ] Implement voice transcription Edge route
- [ ] Anthropic Claude account + API key
- [ ] Implement photo analysis Edge route
- [ ] Write HVAC system prompt (detailed, tested)
- [ ] Test Claude Vision on 20 real HVAC photos
- [ ] Tune prompt for accuracy

**Week 6:**
- [ ] Implement full AI pipeline Edge route
- [ ] Combine transcription + vision results
- [ ] Extract line items with pricing
- [ ] Display AI suggestions in quote builder
- [ ] Allow user to edit/approve AI suggestions
- [ ] Calculate confidence scores
- [ ] Deploy `voice_recordings` table
- [ ] Test AI pipeline end-to-end

**Deliverables:**
- AI quote generation working
- 95%+ accuracy on HVAC test set

---

#### Week 7-8: Pricing & Templates

**Goals:**
- Default pricing data seeded
- Business pricing catalog working
- Templates functional

**Tasks:**

**Week 7:**
- [ ] Seed `default_pricing_data` (HVAC, plumbing, electrical)
- [ ] Research market pricing (RSMeans, HomeAdvisor)
- [ ] Build pricing catalog UI (CRUD)
- [ ] Deploy `pricing_catalog` table
- [ ] Implement pricing override logic
- [ ] AI prompt uses business pricing

**Week 8:**
- [ ] Build template creation UI
- [ ] Seed pre-built templates (5 HVAC, 3 plumbing, 3 electrical)
- [ ] Template selection during quote creation
- [ ] Auto-fill line items from template
- [ ] Test template → AI enhancement flow
- [ ] Quote PDF generation (React-PDF)

**Deliverables:**
- Pricing catalog functional
- 11 pre-built templates
- PDF quotes generated

---

#### Week 9-10: Customer Delivery & Testing

**Goals:**
- Email delivery working
- SMS delivery working
- Public quote view working
- Beta testing with pest control user

**Tasks:**

**Week 9:**
- [ ] Resend account setup
- [ ] React Email templates (quote email)
- [ ] Twilio account setup
- [ ] SMS delivery implementation
- [ ] Public quote view page (customer-facing)
- [ ] Quote acceptance flow (e-signature)
- [ ] Stripe account setup
- [ ] Payment link generation

**Week 10:**
- [ ] End-to-end testing (offline quote → AI → send → customer accepts)
- [ ] Performance testing (Lighthouse score 90+)
- [ ] Security audit (RLS, CSRF, encryption)
- [ ] Beta user onboarding (pest control owner)
- [ ] ServiceTitan integration (basic sync)
- [ ] Fix critical bugs from beta testing
- [ ] Launch prep (monitoring, alerts)

**Deliverables:**
- Full quote-to-payment flow working
- Beta user live on system
- Production-ready MVP

---

### Phase 2: Team Features (4 weeks post-launch)

**Week 11-12:**
- [ ] Team invite system
- [ ] Role-based permissions
- [ ] Approval workflow configuration

**Week 13-14:**
- [ ] Team performance dashboard
- [ ] Activity logs viewer
- [ ] Bulk operations (export, delete)

---

### Phase 3: Integrations (6 weeks)

**Week 15-17:**
- [ ] Stripe payment processing (full integration)
- [ ] QuickBooks sync (invoices, payments)
- [ ] ServiceTitan sync (jobs, estimates)

**Week 18-20:**
- [ ] Housecall Pro integration
- [ ] Zapier/Make webhooks
- [ ] Custom API access (enterprise)

---

## 15. Testing Strategy

### Unit Tests (Vitest)

**What to Test:**
- Server Actions (createQuote, sendQuote, etc.)
- Utility functions (encryption, pricing calculations)
- Validation schemas (Zod)

**Example:**

```typescript
// __tests__/actions/quotes.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createQuote } from '@/app/actions/quotes';

describe('createQuote', () => {
  it('should create quote with valid data', async () => {
    const formData = new FormData();
    formData.append('customer_id', 'customer-uuid');
    formData.append('title', 'AC Repair');
    formData.append('service_category', 'hvac_repair');
    formData.append('line_items', JSON.stringify([
      { title: 'Diagnostic', quantity: 1, unit_price_cents: 8900 },
    ]));
    
    const result = await createQuote(formData);
    
    expect(result.success).toBe(true);
    expect(result.quote.total_cents).toBe(8900);
  });
  
  it('should reject quote with invalid data', async () => {
    const formData = new FormData();
    formData.append('title', 'AB'); // Too short (min 3 chars)
    
    await expect(createQuote(formData)).rejects.toThrow();
  });
});
```

**Run Tests:**
```bash
npm run test
```

---

### E2E Tests (Playwright)

**What to Test:**
- Full user flows (signup → create quote → send → customer accepts)
- Offline functionality (disable network, create quote, re-enable, verify sync)
- Mobile gestures (swipe to delete, pull to refresh)

**Example:**

```typescript
// e2e/quote-flow.spec.ts
import { test, expect } from '@playwright/test';

test('create and send quote', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Navigate to new quote
  await page.click('a[href="/quotes/new"]');
  
  // Select customer
  await page.click('button:has-text("Select Customer")');
  await page.click('text=John Doe');
  
  // Fill quote details
  await page.fill('input[name="title"]', 'AC Capacitor Replacement');
  await page.selectOption('select[name="service_category"]', 'hvac_repair');
  
  // Upload photo
  await page.setInputFiles('input[type="file"]', './test-assets/ac-unit.jpg');
  
  // Add voice note
  // (Complex: would need to mock MediaRecorder API)
  
  // AI processing (mock)
  await page.click('button:has-text("Generate Quote")');
  await page.waitForSelector('text=Diagnostic Fee');
  
  // Review and send
  await page.click('button:has-text("Send to Customer")');
  await expect(page.locator('text=Quote sent successfully')).toBeVisible();
});

test('offline quote creation', async ({ page, context }) => {
  await page.goto('/quotes/new');
  
  // Go offline
  await context.setOffline(true);
  
  // Create quote
  await page.fill('input[name="title"]', 'Offline Test Quote');
  await page.click('button:has-text("Save Draft")');
  
  // Verify saved to IndexedDB
  const idbQuotes = await page.evaluate(() => {
    return window.indexedDB.databases();
  });
  expect(idbQuotes).toContain('quoteflow-db');
  
  // Go online
  await context.setOffline(false);
  
  // Wait for sync
  await page.waitForSelector('text=Sync Complete');
  
  // Verify quote now in Supabase
  await page.goto('/quotes');
  await expect(page.locator('text=Offline Test Quote')).toBeVisible();
});
```

**Run E2E:**
```bash
npx playwright test
```

---

### Performance Testing

**Lighthouse Targets:**
- Performance: 90+
- Accessibility: 100
- Best Practices: 95+
- SEO: 95+
- PWA: Installable

**Lighthouse CI (in GitHub Actions):**

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/quotes/new
          uploadArtifacts: true
```

---

## 16. Deployment Guide

### Prerequisites

**Accounts Needed:**
1. Vercel (hosting)
2. Supabase (database)
3. Anthropic (Claude API)
4. AssemblyAI (transcription)
5. Resend (email)
6. Twilio (SMS)
7. Stripe (payments)
8. Upstash Redis (rate limiting)

---

### Step 1: Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Initialize project
supabase init

# Link to cloud project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Generate types
supabase gen types typescript --project-id your-project-ref > lib/database.types.ts
```

**Enable RLS on all tables:**
```sql
-- In Supabase SQL Editor
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
-- ... (all tables)
```

---

### Step 2: Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Environment Variables (in Vercel Dashboard):**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# AssemblyAI
ASSEMBLYAI_API_KEY=...

# Resend
RESEND_API_KEY=re_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Upstash Redis
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...

# Encryption
ENCRYPTION_KEY=... # 64-char hex string (32 bytes)

# App
NEXT_PUBLIC_APP_URL=https://quoteflow.app
```

---

### Step 3: Monitoring Setup

**Sentry (Error Tracking):**

```bash
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard@latest -i nextjs
```

**Vercel Analytics (already enabled):**
- Automatically tracks Core Web Vitals
- Real User Monitoring (RUM)

---

## 17. Appendices

### File Structure

```
quoteflow/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── quotes/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── customers/
│   │   ├── team/
│   │   └── settings/
│   ├── public/
│   │   └── quotes/
│   │       └── [id]/page.tsx
│   ├── api/
│   │   ├── ai/
│   │   │   ├── process-quote/route.ts (Edge)
│   │   │   └── transcribe/route.ts (Edge)
│   │   ├── upload/
│   │   │   └── photo/route.ts (Node.js)
│   │   ├── sync/
│   │   │   └── offline-queue/route.ts (Edge)
│   │   └── webhooks/
│   │       └── stripe/route.ts (Edge)
│   ├── actions/
│   │   ├── quotes.ts
│   │   ├── customers.ts
│   │   ├── team.ts
│   │   └── branding.ts
│   ├── manifest.ts
│   └── sw.ts
├── components/
│   ├── ui/
│   ├── quotes/
│   ├── customers/
│   └── layout/
│       └── bottom-nav.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── database.types.ts
│   ├── ai/
│   │   ├── claude.ts
│   │   └── assemblyai.ts
│   ├── offline/
│   │   └── db.ts (IndexedDB)
│   ├── email/
│   │   └── send-quote.ts
│   ├── sms/
│   │   └── send-quote.ts
│   └── utils/
│       ├── haptics.ts
│       └── currency.ts
├── emails/
│   └── quote-email.tsx
├── supabase/
│   ├── migrations/
│   │   ├── 20260208000001_initial_schema.sql
│   │   └── 20260208000002_rls_policies.sql
│   └── seed.sql
├── public/
│   ├── icons/
│   └── sw.js (generated)
├── __tests__/
│   ├── actions/
│   └── components/
├── e2e/
│   └── quote-flow.spec.ts
├── .env.local
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

### SQL Migration Scripts

**Initial Schema:**

```sql
-- supabase/migrations/20260208000001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  -- ... (full schema from Part 1)
);

-- ... (all other tables)

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (all triggers)
```

---

### Environment Variables Template

```env
# .env.local.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic Claude
ANTHROPIC_API_KEY=

# AssemblyAI
ASSEMBLYAI_API_KEY=

# Resend (Email)
RESEND_API_KEY=

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Encryption (32-byte hex key)
ENCRYPTION_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Conclusion

**QuoteFlow PRD Complete.**

This document covers:
✅ Complete technical architecture (Next.js 16 + React 19 + PWA 2.0)  
✅ Full database schema (13 tables with RLS + triggers)  
✅ API implementation (Server Actions + Edge Routes)  
✅ AI pipeline (Claude + AssemblyAI)  
✅ Offline-first architecture (IndexedDB + Background Sync)  
✅ Mobile-first UI patterns (gestures, haptics, bottom nav)  
✅ Security & compliance (RLS, encryption, GDPR)  
✅ Pricing model ($60 solo, $100 team, 83.6% margin)  
✅ 10-week development roadmap  
✅ Testing strategy (unit, e2e, performance)  
✅ Deployment guide (step-by-step)

**Next Steps:**
1. Review PRD with team
2. Set up Supabase + Vercel projects
3. Start Week 1 tasks
4. Ship MVP in 10 weeks
5. Onboard pest control beta user
6. Launch publicly

**Success Criteria:**
- < 90s quote creation time
- 95%+ AI accuracy
- 60%+ quote acceptance rate
- 40%+ PWA install rate
- 99.9% uptime

**Questions?** Refer to specific sections by number (e.g., "See Section 14 for development phases").

---

**Document Version:** 2.0  
**Total Pages:** Part 1 + Part 2A + Part 2B = ~150 pages (rendered)  
**Last Updated:** February 8, 2026
