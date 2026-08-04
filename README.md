# Office Asset & Inventory Management System — Phases 0–2

See `ARCHITECTURE_AND_SCHEMA_PLAN.md` for the full system design and phased roadmap.

## What's included so far

**Phase 0 — Foundation:** full Prisma schema for every module, JWT authentication, base
dashboard shell, `RolesGuard` ready for future roles.

**Phase 1 — Asset Management:**
- Categories, Locations, Departments (simple CRUD, managed from `/settings`)
- Assets: full CRUD, search/filter by name/code/serial, category/status filters
- QR code auto-generated on asset creation (`GET /assets/code/:assetCode` for scan lookups)
- Label printing: select assets on `/assets` → `/assets/print` → browser print dialog
- Attachments: photo/invoice upload per asset, stored locally under `backend/uploads/`

**Phase 2 — Maintenance & Notifications:**
- Maintenance schedules per asset (interval in months, auto-computed next due date)
- Service log entries — logging a service rolls the schedule forward and resets asset
  status to "Good"
- Daily cron (8am) creates in-app notifications 7 and 3 days before each due date
- Notification bell in the header; `/maintenance` page lists all schedules with
  overdue/due-soon highlighting, plus a "Run Alert Check Now" button to test the alert
  logic without waiting for the cron

No new database migration is needed for these — the schema was fully designed in Phase 0.

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

## Next steps (Phase 3)

Asset Movement & Circulation: inbound/procurement logging, outbound/disposal, and
check-in/check-out/transfer with accountability logs for the current holder.
