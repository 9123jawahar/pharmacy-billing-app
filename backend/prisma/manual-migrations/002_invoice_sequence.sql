-- Dedicated Postgres sequence for gap-safe, concurrency-safe invoice numbers
-- (INV-000001, INV-000002, ...). billing.controller.ts calls
-- `nextval('invoice_number_seq')` inside the order transaction and falls
-- back to a COUNT(*)-based number if this sequence hasn't been created yet,
-- so the app works before you run this too — but apply it before go-live to
-- avoid invoice-number collisions under concurrent checkouts. Apply with:
--   psql "$DATABASE_URL" -f prisma/manual-migrations/002_invoice_sequence.sql

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1;
