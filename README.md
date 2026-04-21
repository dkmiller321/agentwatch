# AgentWatch

AI Agent Governance Platform — vendor-neutral discovery, inventory, and compliance for enterprise AI agents.

## Overview

AgentWatch gives security teams visibility into every AI agent running in their environment, regardless of provider. Upload proxy logs or connect your SIEM, and within minutes see a full inventory of shadow AI agents with risk scores, ownership tracking, and compliance-ready exports.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** Supabase (Postgres + Auth + Storage)
- **Billing:** Stripe
- **Detection:** Rule-based fingerprinting + Anthropic Claude fallback
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Supabase account (project created)
- Stripe account (test mode)
- Anthropic API key

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in all values in .env.local

# Apply database migrations
# (use Supabase CLI or dashboard to run supabase/migrations/0001_initial_schema.sql)

# Run development server
pnpm dev
```

### Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PRICE_PRO` | Stripe Price ID for Pro plan |
| `ANTHROPIC_API_KEY` | Anthropic API key for LLM classification |
| `RESEND_API_KEY` | Resend key for transactional email |
| `CRON_SECRET` | Shared secret for cron job authentication |

## Project Structure

```
app/                    # Next.js App Router pages
  (marketing)/          # Public pages (landing, pricing, security)
  (auth)/               # Login, signup, callback
  dashboard/            # Authenticated product screens
  api/                  # Route handlers (upload, cron, webhooks, export)
  onboarding/           # Free scan wizard
components/
  ui/                   # shadcn/ui components
  dashboard/            # Dashboard-specific components
  inventory/            # Agent table components
  reports/              # PDF report templates
lib/
  detection/            # Detection pipeline (parsers, fingerprint, classify, score)
  supabase/             # Supabase client helpers
  stripe/               # Stripe client
detection/
  providers.yml         # AI provider signature rules
supabase/
  migrations/           # SQL migrations
```

## Detection Pipeline

1. **Parse** — CSV/JSONL log files into structured events
2. **Filter** — Remove internal/CDN traffic
3. **Fingerprint** — Match against known AI provider signatures (providers.yml)
4. **Classify** — LLM fallback for ambiguous events (Anthropic Claude)
5. **Correlate** — Group events into agent records
6. **Score** — Compute risk scores with explainable factors
7. **Alert** — Generate notifications for new/changed agents

## Scripts

```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Run tests (Vitest)
pnpm typecheck    # TypeScript check
```

## Deployment

Deployed via Vercel. Every push to `main` triggers a production deploy. PRs get preview URLs.

Cron jobs configured in `vercel.json`:
- `/api/cron/ingest` — every 2 minutes (process pending uploads)
- `/api/cron/retention` — daily at 3am UTC (prune expired events)
