# Office Asset & Inventory Management System — Phase 0

Foundation scaffold: repo structure, database schema, authentication, and a base dashboard shell.
See `ARCHITECTURE_AND_SCHEMA_PLAN.md` for the full system design and phased roadmap.

## What's included in Phase 0

- Full Prisma schema for every module (assets, movements, maintenance, audits, attachments,
  notifications, depreciation) — only Users/Auth are wired up to endpoints yet.
- JWT authentication (`POST /api/auth/login`) and a `RolesGuard` ready for when more roles
  are introduced (v1 uses a single Admin role, per your sign-off).
- Basic user management endpoints.
- Next.js app shell: login page and a dashboard placeholder showing the module roadmap.

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

## Next steps (Phase 1)

Asset Management module: CRUD for assets/categories/locations, QR code generation on asset
creation, and the label-printing screen. Confirm you're happy with Phase 0 before that starts.
