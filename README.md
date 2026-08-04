# Office Asset & Inventory Management System — All 5 Phases

See `ARCHITECTURE_AND_SCHEMA_PLAN.md` for the full system design.

## What's included

**Phase 0 — Foundation:** full Prisma schema, JWT authentication, dashboard shell.

**Phase 1 — Asset Management:** categories/locations/departments (`/settings`), full asset
CRUD with search/filter, QR code auto-generation, single/bulk label printing, photo & invoice
attachments.

**Phase 2 — Maintenance & Notifications:** recurring schedules, service logs that roll the
schedule forward automatically, daily 8am alert cron (7/3 days before due), notification bell,
`/maintenance` overview with a manual test trigger.

**Phase 3 — Movement & Circulation:** from each asset's detail page — Check-Out (assign to a
person, added under Settings → Users), Check-In, Transfer (between locations), and Dispose.
Every action is logged with who processed it. `/movements` shows the full accountability log
across all assets.

**Phase 4 — Physical Audit:** `/audits` → start a new audit (snapshots every active asset's
expected location) → `/audits/[id]/scan` opens a mobile-first camera view (uses your phone's
camera via `html5-qrcode`) to scan QR labels in the field. Each scan is checked against the
asset's expected location (Matched / Mismatch), and completing an audit flags anything never
scanned as Not Found.

**Phase 5 — Reporting:** the dashboard now shows live totals (asset count, damaged/under-repair
count, service due in 30 days). `/reports` adds a maintenance cost chart and a straight-line
depreciation estimate (10yr default for fixed assets, 4yr for electronics — clearly labeled as
an estimate, not an accounting record).

No new database migration is needed for any of this — the schema was fully designed in Phase 0.

## A note on the audit scan camera

`html5-qrcode` needs an HTTPS context (or `localhost`) to access the camera — `localhost:3000`
in dev is fine. Your browser will prompt for camera permission the first time you open a scan
page; if you accidentally deny it, you'll need to re-allow it in your browser's site settings.

## Prerequisites

- Node.js 20+
- Docker (for local Postgres) — or a Postgres instance you point `DATABASE_URL` at instead

## Setup

```bash
# 1. Start Postgres
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed        # creates the initial Admin user (admin@example.com / ChangeMe123!)
npm run start:dev          # http://localhost:3001/api

# 3. Frontend (separate terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

Sign in at `http://localhost:3000/login` with the seeded Admin credentials, then change the
password via the `users` endpoint (a dedicated "change password" screen is a Phase 0 follow-up
if you want it before Phase 1 starts).

## Project structure

```
asset-management-system/
├── docker-compose.yml
├── backend/                # NestJS API
│   ├── prisma/schema.prisma
│   └── src/
│       ├── auth/
│       ├── users/
│       └── prisma/
└── frontend/                # Next.js app
    ├── app/
    │   ├── login/
    │   └── dashboard/
    └── lib/
```

## Optional follow-ups

Everything from the original spec is now built. A few things worth considering if you want to
keep going:
- A dedicated "change password" screen for the seeded Admin account
- Per-category useful-life configuration for depreciation, instead of the fixed 10yr/4yr default
- A responsive mobile nav (the header nav currently hides below `sm` breakpoint outside the
  audit scan view, which was built mobile-first on purpose)
- Deploying somewhere beyond local dev, once you're ready
