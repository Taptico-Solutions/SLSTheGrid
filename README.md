# The GRID — Southern Lighting Source Portal

> *On Time. On Budget. Beautiful.*

A private, role-based project portal for Southern Lighting Source, rebuilt on the
Taptico tech stack from the Manus original. See the engineering specification
PDFs (`The_GRID_by_Southern_Lighting_Source_1.pdf`, `thegridengineeringspec.pdf`)
for the authoritative product description.

---

## Taptico Tech Stack

| Layer              | Choice                          | Why                                          |
|--------------------|---------------------------------|----------------------------------------------|
| Hosting            | **Vercel**                       | Single-deploy, edge middleware, zero ops     |
| Framework          | **Next.js 14 (App Router)**      | Full-stack, RSC, route handlers              |
| API                | **tRPC v11**                     | End-to-end TS types, no codegen              |
| Database           | **Supabase Postgres**            | Managed Postgres + RLS + Studio              |
| ORM                | **Drizzle ORM**                  | Type-safe schema and migrations              |
| Auth               | **Supabase Auth (OAuth/OTP)**    | No passwords stored, magic-link + Google     |
| Storage            | **Supabase Storage**             | S3-compatible API, signed URLs               |
| LLM                | **Vercel AI SDK (multi-provider)** | Anthropic / OpenAI / OpenRouter via env  |
| Styling            | **Tailwind CSS + shadcn/ui**     | SLS brand tokens + Radix primitives          |
| Source / CI        | **GitHub → Vercel preview**      | Auto-preview every PR                        |

Railway is **not** required for the foundation — Next.js on Vercel covers
both frontend and API. Reserve Railway for a future long-running worker
(background jobs, websockets) if needed.

---

## Repository Layout

```
app/
├── (portal)/              # The GRID — gated portal (uses SLSLayout)
│   ├── layout.tsx         # SLSLayout + Ask The GRID + OnboardingTour
│   ├── page.tsx           # Dashboard (§8.2)
│   ├── projects/          # List + detail (§8.3, §8.4)
│   ├── documents/         # Cross-project vault (§8.5)
│   ├── submittals/        # Workflow tracker (§8.6)
│   ├── budget/            # Cross-project finance (§8.7)
│   ├── timeline/          # Milestone calendar (§8.8)
│   ├── messages/          # Project threads (§8.9)
│   ├── team/              # User directory (§8.10)
│   ├── manufacturers/     # Vendor directory (§8.11)
│   ├── notifications/     # Personal feed (§8.12)
│   ├── copilot/           # Full-page AI (§8.13)
│   ├── reports/           # Analytics (§8.14)
│   ├── settings/          # Profile (§8.15)
│   └── admin/             # System admin (§8.16)
├── login/                 # Split-panel login (§8.1)
├── auth/callback/         # Supabase OAuth callback + user upsert (§7)
├── api/
│   ├── trpc/[trpc]/       # Single tRPC endpoint
│   └── waitlist/          # Legacy GHL waitlist endpoint
├── waitlist/              # Legacy TapticoAI waitlist landing
├── layout.tsx             # Root layout (fonts + Providers)
└── globals.css            # SLS brand tokens

src/
├── components/            # SLSLayout, AskTheGrid, OnboardingTour, ui/*
├── lib/
│   ├── supabase/          # Browser / server / middleware clients
│   ├── trpc/              # tRPC React client
│   └── utils.ts
└── server/
    ├── context.ts         # tRPC ctx (joins Supabase auth → users table)
    ├── trpc.ts            # public / protected / admin tiers
    ├── llm/               # Model-agnostic chat() (Anthropic / OpenAI / OpenRouter)
    ├── storage/           # Supabase Storage helpers
    ├── db/
    │   ├── schema.ts      # All 13 tables (§4) + relations
    │   └── index.ts       # Drizzle client
    └── routers/           # Feature routers (§6) — one file per area

drizzle/                   # generated migrations
middleware.ts              # Refresh session + redirect unauthenticated to /login
```

---

## First-Time Setup

### 1. Supabase project
1. Create a new Supabase project.
2. **Storage** → create a **private** bucket called `grid-documents`.
3. **Auth** → enable Google (and email OTP) under *Providers*.
4. Add `https://<your-domain>/auth/callback` to the **Redirect URLs**.

### 2. Local env
```bash
cp .env.example .env.local
# Fill in DATABASE_URL, NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, LLM keys
```

### 3. Schema
```bash
npm install
npm run db:push     # creates all 13 tables in Supabase
```

### 4. Run
```bash
npm run dev         # http://localhost:3000
```

The first time you sign in, the user is upserted into the `users` table. If
your `auth.users.id` matches `OWNER_OPEN_ID` in `.env.local`, you are
auto-promoted to `admin`.

---

## LLM Provider Switching

The AI features (Ask The GRID, Copilot) call a single helper:
`src/server/llm/index.ts → chat(messages)`. Provider and model are chosen
purely by environment variables. To swap providers:

```bash
# Anthropic (default)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...

# Or OpenAI
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o
OPENAI_API_KEY=sk-...

# Or OpenRouter (one key, hundreds of models)
LLM_PROVIDER=openrouter
LLM_MODEL=anthropic/claude-sonnet-4-6
OPENROUTER_API_KEY=sk-or-...
```

No code changes required.

---

## Deploy to Vercel

1. Push to GitHub → import the repo in Vercel.
2. Add the env vars from `.env.example` under **Project → Settings → Environment Variables**.
3. Deploy. The first request runs `db:push` lazily? **No** — run migrations
   from your machine: `npm run db:push` against the production DB url.
4. In Supabase, add `https://<your-vercel-domain>/auth/callback` to allowed
   redirects.

DNS for `theslsgrid.com`:

| Type  | Name | Value                |
|-------|------|----------------------|
| A     | @    | 76.76.21.21          |
| CNAME | www  | cname.vercel-dns.com |

---

## What This Foundation Scaffold Includes

- ✅ All 13 tables modeled in Drizzle (Postgres port of §4)
- ✅ Role-based tRPC (public / protected / admin) per §6.1
- ✅ All 17 feature routers (§6) with Zod-typed signatures
- ✅ Supabase Auth + OAuth callback + user upsert (§7)
- ✅ SLSLayout, login page, brand CSS (§8.1, §11)
- ✅ Dashboard + Projects list + Project detail (header) rendered live
- ✅ Notifications + Settings + Admin (working CRUD UI)
- ✅ AI Copilot + Ask The GRID (chat working when keys are set)
- ✅ Onboarding tour (§9.1) wired to `onboarding.complete`
- ✅ Demo seed scaffold with safe `[DEMO]%` clear (§10) — load body TODO
- ✅ Legacy waitlist preserved at `/waitlist`

## What's Next (subsequent commits)

- Project detail tabs 2–8 (Products / Timeline / Budget / Submittals /
  Documents / Messages / Team)
- Documents page with drag-drop upload UI
- Submittals approval workflow UI
- Reports charts (Recharts)
- `seed.load` full Ponce City Market dataset
- Vitest unit tests on protected procedures (per §12 step 14)
- Postgres RLS policies as a second line of defense alongside tRPC checks

---

## Migration Notes vs. Original Manus Build

| Original (Manus)            | Now (Taptico)                            |
|-----------------------------|------------------------------------------|
| React 19 + Vite SPA         | Next.js 14 App Router (RSC + Client)     |
| Wouter                      | Next.js routing                          |
| Express + tRPC              | Next.js route handler + tRPC             |
| MySQL / TiDB                | Supabase Postgres                        |
| AWS S3                      | Supabase Storage                         |
| Manus OAuth + JOSE JWT      | Supabase Auth (cookies handled by SSR)   |
| Manus LLM proxy             | Vercel AI SDK (provider-agnostic)        |
| pnpm                        | npm                                      |

Data model, API contract, and feature logic remain authoritative to the
engineering spec — only the plumbing changed.

---

Built by [Taptico Solutions](https://taptico.ai) for Southern Lighting Source.
