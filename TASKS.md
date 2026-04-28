# TASKS.md — Crypto Presale Analyzer MVP

## Phase 1 — Project Setup

* [x] Initialize Next.js (TypeScript)
* [x] Install Tailwind CSS
* [x] Setup Prisma
* [x] Create Postgres connection
* [x] Create basic folder structure

Folders:

* /lib/scoring
* /lib/ingestion
* /lib/redflags
* /lib/ai
* /app/projects
* /app/compare
* /app/admin

---

## Phase 2 — Database

* [x] Define Prisma schema:

  * Project
  * ProjectScore
  * RedFlag
  * ProjectSummary

* [x] Run migration

* [x] Seed mock data (10–20 projects)

---

## Phase 3 — UI (Core Pages)

### Projects List

* [x] /projects page
* [x] table or cards
* [x] show:

  * name
  * score
  * status

### Project Detail

* [x] /projects/[slug]
* [x] show:

  * score
  * breakdown
  * red flags
  * basic info

---

## Phase 4 — Scoring Engine

* [x] Create scoring module

* [x] Implement simple rules:

  * FDV sanity
  * allocation %
  * vesting presence

* [x] Return:

  * total score
  * category scores

* [x] Store in DB

---

## Phase 5 — Red Flag Engine

* [x] Implement rule checks:

  * missing vesting
  * high insider %
  * unclear utility

* [x] Return flags list

* [x] Display in UI

---

## Phase 6 — API Layer

* [x] GET /api/projects
* [x] GET /api/projects/:slug
* [x] GET /api/projects/:slug/score
* [x] GET /api/projects/:slug/redflags

---

## Phase 7 — AI Integration

* [x] Create AI service

* [x] Input:

  * project data
  * scores
  * flags

* [x] Output:

  * explanation
  * risk summary

* [x] Store in ProjectSummary

---

## Phase 8 — Compare Feature

* [x] /compare page
* [x] select 2–4 projects
* [x] display side-by-side:

  * scores
  * flags

---

## Phase 9 — Ingestion (Basic)

* [x] Create mock ingestion service
* [x] Add "sync" endpoint
* [x] Insert/update projects

---

## Phase 10 - Admin

* [x] /admin page
* [x] show:

  * last sync time
  * project count

---

## Phase 11 — Polish

* [x] loading states
* [x] error handling
* [x] clean UI
* [x] basic SEO

---

## Phase 12 — Deploy

* [x] add health endpoint (`/api/health`)
* [x] add smoke test script (`scripts/smoke-test.mjs`)
* [x] add Vercel deploy scripts (`vercel:pull`, `vercel:build`, `vercel:deploy`)
* [x] add deployment runbook (`README.md`)
* [x] deploy to Vercel
* [x] connect DB
* [x] test API
* [x] test UI

---

## Optional (After MVP)

* [ ] watchlist
* [ ] alerts
* [ ] better scoring weights
* [ ] real data sources
* [ ] caching
* [ ] queue system

---

## How to Use with Codex

1. Open empty project
2. Add SPEC.md + TASKS.md
3. Prompt:

"Read SPEC.md and TASKS.md.
Start with Phase 1 and scaffold the project."

Then iterate:

"Now complete Phase 2"

"Now implement Phase 3"

---

## Important Rule

Do NOT ask Codex to build everything at once.

Always:

* small steps
* verify
* continue

---

## after dev and mvp

* use openclaw for promoting in all channels


