-- Dedicated Postgres sequence for gap-safe, concurrency-safe invoice numbers
-- (INV-000001, INV-000002, ...). billing.controller.ts calls
-- `nextval('invoice_number_seq')` inside the order transaction and falls
-- back to a COUNT(*)-based number if this sequence hasn't been created yet,
-- so the app works before you run this too — but apply it before go-live to
-- avoid invoice-number collisions under concurrent checkouts. Apply with:
--   psql "$DATABASE_URL" -f prisma/manual-migrations/002_invoice_sequence.sql

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1;

-- Advance the sequence past any invoice numbers that already exist (e.g. from
-- `npm run seed`, which is documented to run before this migration) so the
-- next nextval() doesn't collide with an existing "orders"."invoiceNumber".
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING("invoiceNumber" FROM 5) AS INTEGER)), 0)
    INTO max_num
    FROM orders
    WHERE "invoiceNumber" ~ '^INV-[0-9]+$';

  PERFORM setval('invoice_number_seq', max_num + 1, false);
END $$;
