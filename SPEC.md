# Crypto Presale Analyzer — SPEC (Codex Optimized)

## Goal

Build a web MVP that aggregates crypto presale projects and assigns a transparent score with AI explanations.

This is a **research tool**, not financial advice.

---

## Stack

* Next.js
* TypeScript
* Tailwind CSS
* Postgres
* Prisma
* Redis (optional for jobs/cache)

---

## Core Features

### 1. Project Ingestion

* Support multiple sources (mock first)
* Normalize project data
* Deduplicate projects

### 2. Scoring Engine

Score (0–100) based on:

* Tokenomics (25)
* Team/Credibility (20)
* Narrative (15)
* Liquidity/Exit Risk (20)
* Transparency (10)
* Hype (10)

Return:

* total_score
* category_scores
* reasons

---

### 3. Red Flag Engine

Detect:

* no vesting
* high insider allocation
* unclear utility
* weak docs
* inconsistent data

Return:

* flags[]
* severity

---

### 4. AI Explanation

Generate:

* score explanation
* risk summary

Constraints:

* no financial advice
* no hallucination
* use only structured data

---

### 5. Pages

#### / (Landing)

* simple intro

#### /projects

* list + filters + sort

#### /projects/[slug]

* score
* breakdown
* red flags
* AI explanation

#### /compare

* compare 2–4 projects

#### /admin (basic)

* ingestion status

---

## Database Models

### Project

* id
* name
* slug
* ticker
* description
* status
* website
* twitter
* whitepaper
* start_date
* end_date
* fdv
* sale_price
* total_supply
* vesting_summary
* created_at
* updated_at

### ProjectScore

* project_id
* total_score
* tokenomics_score
* credibility_score
* narrative_score
* liquidity_score
* transparency_score
* hype_score

### RedFlag

* project_id
* type
* severity
* description

### ProjectSummary

* project_id
* ai_summary
* ai_risk_explanation

---

## API Routes

* GET /api/projects
* GET /api/projects/:slug
* GET /api/projects/:slug/score
* GET /api/projects/:slug/redflags
* POST /api/internal/sync

---

## Architecture

Frontend → API → Services:

* ingestion/
* scoring/
* redflags/
* ai/

---

## Build Principles

* keep simple
* modular services
* no over-engineering
* mock data first
* async jobs later

---

## Success Criteria

* 20–50 projects displayed
* scoring works
* red flags visible
* AI explanation readable
* UI usable

---

## Instructions for Codex

Read this file and:

1. Scaffold Next.js app
2. Setup Prisma + schema
3. Create folder structure
4. Add mock data
5. Implement:

   * project list page
   * project detail page
6. Stub scoring + AI modules
7. Add env.example + README
