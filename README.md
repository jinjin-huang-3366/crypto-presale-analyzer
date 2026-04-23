# Crypto Presale Analyzer

Crypto presale research dashboard with:
- project list and detail pages
- score breakdowns and red-flag analysis
- side-by-side comparison
- ingestion/admin workflows

## Local Setup

1. Install dependencies:
```bash
npm install
```
2. Configure environment:
```bash
cp .env.example .env
```
3. Ensure `DATABASE_URL` points to a running PostgreSQL instance.
4. Apply schema and seed:
```bash
npm run db:migrate
npm run db:seed
```
5. Run the app:
```bash
npm run dev
```

## Build Check

```bash
npm run build
```

## API Health Endpoint

`GET /api/health`
- `200`: app + DB are healthy
- `503`: app is running but DB is unavailable

## Smoke Tests (API + UI)

Run against local app:
```bash
npm run test:smoke
```

Run against deployed app:
```bash
BASE_URL=https://your-app.vercel.app npm run test:smoke:prod
```

## Phase 12 Deploy Workflow (Vercel)

1. Login and link project:
```bash
npx vercel login
npx vercel link
```
2. Pull env metadata locally:
```bash
npm run vercel:pull
```
3. Set required Vercel environment variables:
- `DATABASE_URL`
- `OPENAI_API_KEY` (if AI summary generation is used in prod)
- `OPENAI_MODEL` (optional override, default from app env)
- `NEXT_PUBLIC_SITE_URL` (set to your production URL)
4. Deploy:
```bash
npm run vercel:build
npm run vercel:deploy
```
5. Validate deployment:
```bash
BASE_URL=https://your-app.vercel.app npm run test:smoke:prod
```
