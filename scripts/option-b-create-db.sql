-- Option B: Run once in pgAdmin → Query Tool (connected as postgres superuser)

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'peblo') THEN
    CREATE USER peblo WITH PASSWORD 'peblo' CREATEDB LOGIN;
  END IF;
END
$$;

-- If database already exists, this line will error — safe to ignore
CREATE DATABASE peblo_infinityos OWNER peblo;

GRANT ALL PRIVILEGES ON DATABASE peblo_infinityos TO peblo;
