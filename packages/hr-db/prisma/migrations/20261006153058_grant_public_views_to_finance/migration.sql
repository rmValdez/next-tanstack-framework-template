-- HR decides who may read its published views; each consumer gets a migration like this.
-- Roles are created by docker/postgres/init.sql (cluster-wide, so the shadow replay sees them).

GRANT USAGE ON SCHEMA hr_public TO finance_app;
-- Existing views, and every view HR adds to hr_public later.
GRANT SELECT ON ALL TABLES IN SCHEMA hr_public TO finance_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT SELECT ON TABLES TO finance_app;
