# MedStore Pharmacy — Billing & Management Suite

A production-ready pharmacy store billing and management web application.

- **Frontend:** React 18 + Vite + TypeScript, Tailwind CSS, shadcn/ui-style components (Radix primitives), Lucide icons, TanStack Query, React Router.
- **Backend:** Node.js + Express + TypeScript, modular route/controller architecture, Zod validation, JWT auth with RBAC.
- **Database:** PostgreSQL via Prisma ORM (schema, migrations, type-safe client).

## 1. Architecture

```
pharma-project/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Full relational schema (see below)
│   │   ├── seed.ts                # Demo data: users, drugs, customers, orders...
│   │   └── manual-migrations/     # Optional SQL upgrades (search indexes, invoice sequence)
│   └── src/
│       ├── config/env.ts          # Zod-validated environment config
│       ├── lib/                   # prisma client singleton, JWT helpers
│       ├── middleware/            # auth (JWT+RBAC), validation, error handling
│       ├── utils/                 # ApiError, asyncHandler, audit logging, pagination
│       └── modules/                # one folder per domain, each with routes/controller/schema
│           ├── auth/  users/  customers/  subscriptions/  loyalty/
│           ├── inventory/  doctors/  billing/  audit/  dashboard/
└── frontend/
    └── src/
        ├── components/ui/         # shadcn-style primitives (Button, Card, Dialog, Table...)
        ├── components/layout/     # Sidebar, Topbar, AppLayout
        ├── components/inventory/  # Drug form & stock adjustment dialogs
        ├── lib/                   # axios client, auth context, utils
        ├── pages/                 # one page per module (Dashboard, Billing/POS, Inventory...)
        └── types/                 # shared TS types mirroring the API
```

Each backend module follows the same shape: `*.schema.ts` (Zod validation) → `*.controller.ts` (business logic, wrapped in `asyncHandler`) → `*.routes.ts` (wires up middleware: `requireAuth`, `requireRole`, `validate`). Every mutating action calls `recordAudit(...)`, which writes to the `audit_logs` table without ever blocking or rolling back the underlying transaction.

## 2. Database design highlights (`backend/prisma/schema.prisma`)

- **RBAC & audit:** `User.role` (`ADMIN` / `PHARMACIST` / `BILLING_CLERK`), immutable `AuditLog` table indexed on `(entity, entityId)`, `userId`, and `createdAt`.
- **Customers:** `chronicConditions` and `allergies` as Postgres string arrays, used both for the UI display and a live allergy-conflict check at checkout. `loyaltyPoints` is a denormalized balance backed by an immutable `LoyaltyTransaction` ledger.
- **Subscriptions:** chronic-refill tracking with `nextDueDate`, indexed as `(nextDueDate, status)` for the "due for refill" dashboard sweep.
- **Inventory:** `Drug` has `stockQuantity`/`reorderLevel` (low-stock alert), `expiryDate` (expired/expiring alert), and a self-referencing `substitutes` many-to-many for "same active ingredient, different brand." Indexes on `genericName`, `name`, `expiryDate`, `stockQuantity`, `batchNumber`.
- **Doctors:** referral tracking via `Order.doctorId`; `/doctors/referral-metrics` aggregates order count & revenue per doctor.
- **Billing:** `Order` → `OrderItem` (price/GST snapshotted at sale time, so historical invoices never change if a drug's price changes later), plus `Coupon` and `Notification` (the mock SMS/WhatsApp gateway log). All foreign keys have deliberate `onDelete` behavior (`Cascade` for line items/notifications, `Restrict` for sold drugs, `SetNull` for soft-optional references like a voided doctor or coupon).
- **Concurrency-safe invoicing:** `nextInvoiceNumber()` uses a dedicated Postgres sequence (`prisma/manual-migrations/002_invoice_sequence.sql`) with a safe COUNT-based fallback if that migration hasn't been applied yet.

## 3. Getting started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally (or a connection string to a hosted instance)

### Backend

```bash
cd backend
cp .env.example .env         # edit DATABASE_URL / JWT_SECRET as needed
npm install
npx prisma migrate dev --name init   # creates tables from schema.prisma
npm run seed                          # loads demo users, drugs, customers, orders
npm run dev                           # http://localhost:4000
```

Optional but recommended before go-live — apply the two manual SQL upgrades once your tables exist:

```bash
psql "$DATABASE_URL" -f prisma/manual-migrations/001_search_indexes.sql   # trigram indexes for fuzzy search at scale
psql "$DATABASE_URL" -f prisma/manual-migrations/002_invoice_sequence.sql # gap-safe invoice numbering
```

### Frontend

```bash
cd frontend
cp .env.example .env         # VITE_API_URL, defaults to http://localhost:4000/api
npm install
npm run dev                  # http://localhost:5173
```

### Demo logins (after `npm run seed`)

| Role           | Email                     | Password     |
|----------------|---------------------------|--------------|
| Admin          | admin@pharmacy.test       | Admin@123    |
| Pharmacist     | pharmacist@pharmacy.test  | Pharma@123   |
| Billing Clerk  | clerk@pharmacy.test       | Clerk@123    |

## 4. Feature map → code

| Requirement | Where |
|---|---|
| RBAC, JWT sessions, audit logs | `backend/src/middleware/auth.ts`, `utils/audit.ts`, `modules/auth`, `modules/audit` |
| Customer profiles + allergy/condition tracking | `modules/customers` (`checkInteractions` does a live allergy-vs-cart-drug scan) |
| Subscription / refill alerts | `modules/subscriptions` (`GET /subscriptions/due`), surfaced on `DashboardPage` |
| Loyalty points + coupons | `modules/loyalty`, redemption/earning logic inside `billing.controller.ts`'s transaction |
| Inventory CRUD, low-stock & expired dashboards | `modules/inventory` (`/alerts/low-stock`, `/alerts/expired`) |
| Smart combination search (ingredient/symptom → brands + substitutes) | `inventory.controller.ts#smartSearch`, `Drug.substitutes` self-relation |
| Doctor directory + referral metrics | `modules/doctors` |
| POS with live stock check, tax/discount/loyalty math | `modules/billing` (`createOrder` runs the whole checkout in one DB transaction) |
| Mock SMS/WhatsApp invoice notification | `modules/billing/notification.service.ts` (console log + `Notification` row + UI toast in `BillingPage.tsx`) |
| Printable invoice | `frontend/src/pages/InvoicePage.tsx` (`window.print()`, print-only CSS in `index.css`) |

## 5. A note on this build environment

This project was generated inside a sandboxed cloud container that cannot reach `binaries.prisma.sh`, so the Prisma CLI (`prisma generate` / `migrate` / `validate`) could not be executed here. Everything was still verified as thoroughly as the sandbox allowed:

- The **backend** was type-checked against a hand-written stand-in for the generated Prisma Client (to catch real TypeScript/Express bugs) — this stub is *not* part of the delivered code.
- The **frontend** was fully installed, type-checked, and **production-built successfully** (`npm run build` completes with zero errors).
- A local Postgres instance was created and is ready for `prisma migrate dev` to run against on your machine, where network access to Prisma's engine binaries is normal.

On your machine, `npm install && npx prisma migrate dev --name init && npm run seed && npm run dev` in `backend/` will generate the real, fully-typed Prisma Client and should work out of the box. If you hit anything unexpected there, it's worth a quick look — that's the one part of the stack this sandbox couldn't fully rehearse.
