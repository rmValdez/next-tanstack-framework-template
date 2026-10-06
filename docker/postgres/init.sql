-- Runs once, when the data volume is first created. Development only: the passwords are
-- placeholders; production roles and secrets come from the deployment (docs/deployment.md).
--
-- accounts_db: identity (passwords, sessions, OAuth clients). Always its own database.
-- company_db:  every business domain, one schema each. Postgres roles enforce that a
--              domain writes only its own schema and reads others only through their
--              published <domain>_public views (D13; replaced by one database per domain in roadmap step 1).

CREATE DATABASE accounts_db;
CREATE DATABASE company_db;

-- One role per domain, plus a shadow database for `prisma migrate dev` (a restricted role
-- cannot create one on the fly).
CREATE ROLE hr_app LOGIN PASSWORD 'hr_pw';
CREATE DATABASE hr_shadow OWNER hr_app;
CREATE ROLE finance_app LOGIN PASSWORD 'finance_pw';
CREATE DATABASE finance_shadow OWNER finance_app;
CREATE ROLE recruitment_app LOGIN PASSWORD 'recruitment_pw';
CREATE DATABASE recruitment_shadow OWNER recruitment_app;
CREATE ROLE attendance_app LOGIN PASSWORD 'attendance_pw';
CREATE DATABASE attendance_shadow OWNER attendance_app;
CREATE ROLE exam_app LOGIN PASSWORD 'exam_pw';
CREATE DATABASE exam_shadow OWNER exam_app;

\c company_db

-- Nobody uses public; nobody creates schemas unless granted below.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON DATABASE company_db FROM PUBLIC;

-- <domain>: private tables. <domain>_public: the read-only views it publishes for others.
CREATE SCHEMA hr AUTHORIZATION hr_app;
CREATE SCHEMA hr_public AUTHORIZATION hr_app;
CREATE SCHEMA finance AUTHORIZATION finance_app;
CREATE SCHEMA finance_public AUTHORIZATION finance_app;
CREATE SCHEMA recruitment AUTHORIZATION recruitment_app;
CREATE SCHEMA recruitment_public AUTHORIZATION recruitment_app;
CREATE SCHEMA attendance AUTHORIZATION attendance_app;
CREATE SCHEMA attendance_public AUTHORIZATION attendance_app;
CREATE SCHEMA exam AUTHORIZATION exam_app;
CREATE SCHEMA exam_public AUTHORIZATION exam_app;

-- Prisma migrations start with `CREATE SCHEMA IF NOT EXISTS`, and Postgres checks this
-- privilege even when the schema already exists.
GRANT CREATE ON DATABASE company_db TO hr_app, finance_app, recruitment_app, attendance_app, exam_app;

-- Cross-domain reads are granted per consumer, for example finance reading HR's views:
--   GRANT USAGE ON SCHEMA hr_public TO finance_app;
--   ALTER DEFAULT PRIVILEGES FOR ROLE hr_app IN SCHEMA hr_public GRANT SELECT ON TABLES TO finance_app;
