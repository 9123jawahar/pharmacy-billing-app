-- Optional performance upgrade for the drug "smart search" endpoint at
-- catalog scale (tens of thousands of SKUs). Not required for correctness —
-- inventory.controller.ts already works with plain ILIKE + array `has`
-- filters — this just makes fuzzy/typo-tolerant search fast via trigram
-- indexes. Apply with:
--   psql "$DATABASE_URL" -f prisma/manual-migrations/001_search_indexes.sql
-- (Run this AFTER `prisma migrate deploy` has created the `drugs` table.)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_drugs_name_trgm ON drugs USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drugs_generic_name_trgm ON drugs USING GIN ("genericName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drugs_composition_trgm ON drugs USING GIN (composition gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drugs_symptoms_gin ON drugs USING GIN (symptoms);
