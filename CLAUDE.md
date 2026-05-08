# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

## Project: SkillBridge

AI-powered test and evaluation platform (SaaS). Nx monorepo with a Next.js frontend and Express backend.

## Commands

```bash
# Development servers
npm run dev:web          # Next.js on :3000  (nx dev web)
npm run dev:api          # Express on :3001  (nx serve api)

# Build both apps
npm run build            # nx run-many --target=build --projects=web,api

# Database
npm run db:generate      # prisma generate
npm run db:push          # push schema without migration
npm run db:migrate       # create + apply migration
npm run db:studio        # Prisma Studio UI
npm run db:seed          # tsx prisma/seed.ts

# Type-check web app only
npx tsc --noEmit -p apps/web/tsconfig.json

# Lint
npm exec nx lint web
npm exec nx lint api
```

> **Note:** `nx serve web` does NOT work — the @nx/next plugin registers the dev target as `dev`, not `serve`. Always use `npm run dev:web` or `npx nx dev web`.

## Architecture

### Monorepo layout

```
apps/
  api/          Express API (port 3001)
  web/          Next.js 16 App Router (port 3000)
libs/
  database/     @org/database — exports singleton `prisma` client (PrismaClient + pg adapter)
  shared-types/ @org/shared-types — placeholder, currently unused
prisma/
  schema.prisma Single schema for the whole platform
  seed.ts       Seed data
```

### API (`apps/api`)

- **Entry:** `src/main.ts` → `src/app.ts` (Express factory)
- **Routes index:** `src/routes/index.ts` mounts all routers under `/api`
- **Route → Service mapping:**

| Prefix | File | Service |
|--------|------|---------|
| `/auth` | `auth.routes.ts` | `auth.controller.ts` → `auth.service.ts` |
| `/documents` | `documents.routes.ts` | `documents.controller.ts` → `documents.service.ts` |
| `/ai` | `ai.routes.ts` | `ai-document.service.ts` |
| `/tests` | `tests.routes.ts` | `tests.service.ts` |
| `/credits` | `credits.routes.ts` | `utils/credit.ts` |
| `/taxonomy` | `taxonomy.routes.ts` | inline Prisma queries |
| `/sessions` | `sessions.routes.ts` | `sessions.service.ts` + `templates.service.ts` |

**Not yet implemented on API (UI panels exist, routes need building):**
- `POST /api/invitations` — single candidate invite (email + testId + expiresInDays)
- `POST /api/invitations/bulk` — multi-email invite
- `POST /api/invitations/url` — shareable test URL
- `POST /api/evaluations/360` — 360° evaluation kickoff
- `POST /api/ai/cv-jd-match` — CV + JD match analysis (returns matchScore, strengths, gaps, recommendation)

- **Auth middleware:** `src/middleware/auth.middleware.ts` — reads JWT from `Authorization: Bearer` header or cookie, attaches `req.user = { id, role, companyId }`. Use `requireRole(...roles)` for role-gating.
- **Error handling:** Throw `new AppError(statusCode, message)` anywhere; `errorMiddleware` catches it and returns `{ error: message }`.
- **Credits:** All AI actions go through `deductCredits(userId, amount, type)` in `utils/credit.ts`.

### Web (`apps/web`)

- **Framework:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui components in `src/components/ui/`
- **Auth state:** Zustand store at `src/store/auth.store.ts`, persisted to localStorage (key `skillbridge-auth`, only `accessToken` persisted). User roles: `INDIVIDUAL | CORPORATE_ADMIN | PLATFORM_ADMIN`.
- **API calls:** All go through `src/lib/api-client.ts` (Axios, baseURL from `NEXT_PUBLIC_API_URL`, auto-refresh on 401).

**API client modules:**
- `lib/documents.api.ts` — document CRUD
- `lib/ai-document.api.ts` — AI document generation/save
- `lib/sessions.api.ts` — test sessions, templates, AI analysis (`requestAIAnalysis`)
- `lib/tests.api.ts` — test draft creation, question generation

**Pages:**
- `app/page.tsx` — landing hero page with canvas cursor animation, links to `/login` and `/register`
- `app/(auth)/login|register|forgot-password` — auth forms, shared layout with centered card
- `app/dashboard/page.tsx` — main dashboard with 6 stacking-card rows
- `app/documents/page.tsx` — document library
- `app/tests/library/page.tsx` — test library/templates

**Dashboard stacking-card rows** (`app/dashboard/page.tsx`):

| Row | Label | Cards |
|-----|-------|-------|
| 1 | Dashboard | Credits · Recent sessions · Company rank |
| 2 | Doküman İşlemleri | Dokümanlar → `/documents` · Yükle · AI Yarat |
| 3 | Test İşlemleri | Testler → `/tests/library` · Belgeden · Konulardan · CV'ye göre |
| 4 | Aday İşlemleri | Davetler → `/invitations` · Tek davet · Toplu · URL |
| 5 | Değerlendirme | Sonuçlar → `/sessions` · AI Analizi · 360° · CV+JD |
| 6 | Yönetim | Admin · Taxonomy · Kullanıcılar · Şirket (CORPORATE_ADMIN / PLATFORM_ADMIN only) |

### UI component patterns

**`AbovePanel`** (`components/ui/AbovePanel.tsx`): floating panel anchored `bottom: calc(100% + 16px)` above a `position: relative` row wrapper. Use for any action that opens inline without page navigation. Props: `title`, `icon`, `iconColor`, `badge?`, `onClose`, `width?`.

```
// Adding a new panel to a dashboard row:
// 1. Create panel component in components/<domain>/MyPanel.tsx using AbovePanel
// 2. Add panel state to DashboardPage
// 3. Render inside the row's panel={<>...</>} prop
```

**Panel files by domain:**
- `components/documents/` — `UploadPanel`, `AiDocPanel`
- `components/tests/TestPanels.tsx` — `FromDocPanel`, `FromTopicsPanel`, `FromCvPanel`
- `components/candidates/CandidatePanels.tsx` — `InvitePanel`, `BulkInvitePanel`, `InviteUrlPanel`
- `components/evaluation/EvaluationPanels.tsx` — `AiAnalysisPanel`, `Assessment360Panel`, `CvJdMatchPanel`

**Stacking card constants** (defined at top of `dashboard/page.tsx`):
```typescript
const W = 250;    // card width px
const H = 125;    // card height px
const GAP = 38;   // ~1 cm gap
const OFFSET = W; // each card peeks GAP (38px ≈ 1cm) to the right when stacked
```

**`CanvasCursor`** (`components/ui/canvas.tsx`): rainbow particle trail that follows the mouse. Used on the landing page. `pointerEvents: none` — does not block clicks.

### Database (Prisma + PostgreSQL)

Schema at `prisma/schema.prisma`. Key relationships:

- `User` belongs to optional `Company` (`CORPORATE_ADMIN`'s credits come from company pool)
- `Test` optionally references a `Document` (for AI question generation from doc content)
- `TestSession` → `Answer[]` tracks per-question responses and auto-scores on complete
- `CreditLog` is the audit trail — never modify credits without creating a log entry
- `Invitation` has a token + `InvitationStatus` enum for the candidate invite flow

### Credit economy

| Action | Cost | `CreditLogType` |
|--------|------|----------------|
| Welcome bonus | +50 | `WELCOME_BONUS` |
| AI test generation | 50 | `TEST_GENERATION` |
| AI document generation | 50 | `DOC_GENERATION` |
| AI result analysis | 10 | `AI_ANALYSIS` |
| Ready test usage | 1/question | `READY_TEST` |
| Level exam | 100 | `LEVEL_EXAM` |

### Environment variables

Copy `.env.example` to `.env` at the repo root. Required for local dev:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — ≥32 random chars each
- `ANTHROPIC_API_KEY` — used by `ai-document.service.ts` and `tests.service.ts` (model: `claude-sonnet-4-6`)
- `NEXT_PUBLIC_API_URL` — frontend axios baseURL (default `http://localhost:3001`)

### Adding new API routes

1. Create `src/services/foo.service.ts` with Prisma logic
2. Create `src/routes/foo.routes.ts`, apply `authenticate` middleware
3. Register in `src/routes/index.ts`: `router.use('/foo', fooRoutes)`
4. Add matching API client in `apps/web/src/lib/foo.api.ts`
