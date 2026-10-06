-- Runs once, when the data volume is first created. Development only: the passwords are
-- placeholders; production roles and secrets come from the deployment (docs/deployment.md).
--
-- One database per domain (D17), plus accounts_db for identity. Each domain database is
-- owned by that domain's role and nobody else may connect to it, so a domain cannot read or
-- write another domain's data even by accident. Cross-domain data goes through the owner's
-- API (with an accounts-issued app token) or, later, events.

CREATE DATABASE accounts_db;

-- hr: employees, departments, company administration.
CREATE ROLE hr_app LOGIN PASSWORD 'hr_pw';
CREATE DATABASE hr_db OWNER hr_app;
CREATE DATABASE hr_shadow OWNER hr_app;  -- `prisma migrate dev` only

-- finance: payroll, accounting.
CREATE ROLE finance_app LOGIN PASSWORD 'finance_pw';
CREATE DATABASE finance_db OWNER finance_app;
CREATE DATABASE finance_shadow OWNER finance_app;

-- recruitment: candidates, hiring.
CREATE ROLE recruitment_app LOGIN PASSWORD 'recruitment_pw';
CREATE DATABASE recruitment_db OWNER recruitment_app;
CREATE DATABASE recruitment_shadow OWNER recruitment_app;

-- attendance: time tracking, schedules.
CREATE ROLE attendance_app LOGIN PASSWORD 'attendance_pw';
CREATE DATABASE attendance_db OWNER attendance_app;
CREATE DATABASE attendance_shadow OWNER attendance_app;

-- exam: exams, attempts.
CREATE ROLE exam_app LOGIN PASSWORD 'exam_pw';
CREATE DATABASE exam_db OWNER exam_app;
CREATE DATABASE exam_shadow OWNER exam_app;

-- Postgres lets every role connect to every database by default; only the owner may.
-- accounts connects as postgres in development; no domain role may reach identity data.
REVOKE CONNECT ON DATABASE accounts_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE hr_db, hr_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE finance_db, finance_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE recruitment_db, recruitment_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE attendance_db, attendance_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE exam_db, exam_shadow FROM PUBLIC;
