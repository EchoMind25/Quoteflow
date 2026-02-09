# Quotestream

Privacy-first AI-powered quoting platform for service businesses (HVAC, plumbing, electrical, roofing, landscaping).

Built with Next.js 16, Supabase, Tailwind CSS, and Claude AI.

## Prerequisites

You need accounts with the following services:

| Service | Purpose | Required |
|---|---|---|
| [Supabase](https://supabase.com) | Database, auth, file storage | Yes |
| [Anthropic](https://console.anthropic.com) | AI quote generation (Claude) | Yes |
| [AssemblyAI](https://www.assemblyai.com) | Voice transcription | Yes |
| [Vercel](https://vercel.com) | Hosting & deployment | Yes (production) |
| [Resend](https://resend.com) | Email delivery (SMTP) | Yes (quote sending) |
| [Twilio](https://www.twilio.com) | SMS delivery | Optional |
| [Stripe](https://stripe.com) | Subscription billing | Optional |
| [Upstash](https://upstash.com) | Redis rate limiting | Optional |
| [Sentry](https://sentry.io) | Error tracking | Optional |
| [Google AI](https://aistudio.google.com) | Fallback AI provider | Optional |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-org/quotestream.git
cd quotestream
npm ci
```

### 2. Environment setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your API keys. At minimum you need:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `ASSEMBLYAI_API_KEY`

### 3. Database setup

Create a new Supabase project, then run migrations:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or apply migrations manually in the Supabase SQL editor from `supabase/migrations/` in order.

### 4. Start development

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build (webpack) |
| `npm run start` | Start production server |
| `npm run type-check` | TypeScript check (both tsconfigs) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier format all files |
| `npm run format:check` | Check formatting |
| `npm run analyze` | Bundle analyzer |

## Deployment

### Vercel (recommended)

1. Push your repo to GitHub
2. Import the project in the [Vercel dashboard](https://vercel.com/new)
3. Add all environment variables from `.env.local.example` to Vercel project settings
4. Deploy — Vercel auto-detects Next.js and uses `vercel.json` config

The project deploys to US East (`iad1`) by default. Change `regions` in `vercel.json` for other regions.

### Environment variables in Vercel

Add these in **Settings > Environment Variables**. Mark server-only vars (without `NEXT_PUBLIC_` prefix) as available only for "Production" and "Preview" environments.

### Database migrations

Run migrations before the first deployment and after adding new migration files:

```bash
npx supabase db push
```

### Generate encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set the output as `ENCRYPTION_KEY` in your environment.

## Monitoring

### Sentry

1. Create a Sentry project (Next.js platform)
2. Set `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, and `SENTRY_AUTH_TOKEN` in your environment
3. Error tracking and session replay are configured in `sentry.client.config.ts` and `sentry.server.config.ts`

Sample rates (configurable in Sentry config files):
- **Traces:** 10% of transactions
- **Replay on error:** 100% of error sessions
- **Replay sampling:** 10% of all sessions

### Vercel Analytics

Already integrated via `@vercel/analytics`. Works automatically on Vercel deployments.

## Troubleshooting

### Build fails with OOM

TypeScript checking is intentionally skipped during build (`ignoreBuildErrors: true` in `next.config.ts`). Run type-checking separately:

```bash
npm run type-check
```

### Service worker not updating

The service worker (`sw.js`) is served with `no-cache` headers. Hard-refresh or clear site data in DevTools to force an update.

### Voice recording not working

- Ensure HTTPS (required for `MediaRecorder` API)
- Check microphone permissions in browser
- `audio/webm;codecs=opus` is preferred; falls back to `audio/mp4` on Safari

### Offline sync not processing

- Check IndexedDB in DevTools > Application > Storage
- The `offline_queue` store shows pending items
- Sync triggers on `online` event or manual refresh

### Rate limiting not working

Upstash Redis vars are optional. Without them, rate limiting is disabled and a warning is logged. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to enable.

## Architecture

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation, conventions, and file structure.
