-- Option B (simple): Use YOUR existing postgres login — only create the database.
-- pgAdmin → connect as postgres → Query Tool → Execute

CREATE DATABASE peblo_infinityos;

-- Then set apps/api/.env to (replace YOUR_PASSWORD):
-- DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/peblo_infinityos?schema=public
