# SkillSnap Workspace

## Overview

pnpm workspace monorepo using TypeScript. Primary app: **SkillSnap** — a service marketplace mobile app (Expo/React Native) for Kuala Lumpur connecting consumers with verified service providers.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile framework**: Expo (React Native) with Expo Router
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS bundle for backend), Expo Metro (mobile)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (PORT=8080)
│   └── skillsnap/          # Expo mobile app (PORT=22172)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seed script
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Demo Accounts

- **Consumer**: `consumer@skillsnap.my` / `password123`
- **Provider**: `tan.wei.ming@skillsnap.my` / `password123`

## Demo Mode (no DB)

Backend (Express):
- `artifacts/api-server/.env` has `USE_MOCK_DATA=true` by default.
- This enables in-memory demo users + data, so `/api/auth/login` works without Postgres.

Mobile app (Expo / React Native):
- Native builds require an **absolute** API URL.
- Set `EXPO_PUBLIC_API_URL` (must include `/api`) in `artifacts/skillsnap/.env`, e.g.
    - `http://localhost:8080/api` (iOS Simulator)
    - `http://10.149.141.183:8080/api` (physical device on same Wi-Fi)
    - `http://10.0.2.2:8080/api` (Android Emulator)

Run seed: `pnpm --filter @workspace/scripts run seed`

## SkillSnap App Routes

### Consumer app `(tabs)/`
- `index` — Home (active bookings, categories, top providers)
- `bookings` — Booking list by status
- `notifications` — Notification center
- `profile` — Account settings

### Provider app `(provider-tabs)/`
- `dashboard` — KPI cards, today's schedule, recent activity
- `inbox` — Pending booking requests (accept/decline)
- `jobs` — Active/completed jobs with status workflow
- `earnings` — Revenue breakdown and monthly chart
- `profile` — Business info, services, schedule, availability toggle

### Shared screens
- `auth/login` — Login with dual demo buttons (consumer + provider)
- `auth/register` — Registration with consumer/provider role toggle
- `provider-setup` — Provider profile creation/edit form
- `onboarding` — 3-slide onboarding carousel

## API Routes (backend)

- `/api/auth/*` — Register, login, me
- `/api/categories` — Service categories (8 seeded)
- `/api/providers/*` — Provider listing and reviews
- `/api/matching/:requestId` — AI matching algorithm
- `/api/service-requests/*` — Consumer service request CRUD
- `/api/bookings/*` — Booking lifecycle management
- `/api/provider/*` — Provider self-service (me, inbox, bookings, earnings, schedule, dashboard, setup)
- `/api/reviews/*` — Review submission
- `/api/notifications/*` — Notification management
- `/api/payments/initiate` — Mock payment processing

## Booking Status Flow

```
requested → accepted → on_the_way → arrived → in_progress → completed
                    ↘ cancelled
```

## DB Schema Tables

- `users` — Consumer/provider/admin accounts
- `provider_profiles` — Business info, ratings, verification
- `provider_services` — Categories and pricing per provider
- `provider_availability` — Weekly schedule per provider
- `categories` — Service categories (Electrical, Plumbing, etc.)
- `service_requests` — Consumer job requests
- `bookings` — Core transaction table (request → provider → status)
- `payments` — Mock payment records
- `reviews` — Consumer ratings for completed bookings
- `notifications` — System notifications

## Workflows

- `Start Backend` — `PORT=8080 pnpm --filter @workspace/api-server run dev`
- `Start SkillSnap` — `PORT=22172 pnpm --filter @workspace/skillsnap run dev`
