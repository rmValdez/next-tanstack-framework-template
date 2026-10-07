-- Runs once, when the data volume is first created. Development only: the passwords are
-- placeholders; production roles and secrets come from the deployment (docs/deployment.md).
--
-- One database per domain (D17), plus accounts_db for identity. Each domain database is
-- owned by that domain's role and nobody else may connect to it, so a domain cannot read or
-- write another domain's data even by accident. Cross-domain data goes through the owner's
-- API (with an accounts-issued app token) or, later, events.

CREATE DATABASE accounts_db;

-- people: employees, departments, recruitment, attendance, company administration (D21).
CREATE ROLE people_app LOGIN PASSWORD 'people_pw';
CREATE DATABASE people_db OWNER people_app;
CREATE DATABASE people_shadow OWNER people_app;

-- hr: retained for backwards-compatibility during migration.
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

-- CRM.
CREATE ROLE crm_app LOGIN PASSWORD 'crm_pw';
CREATE DATABASE crm_db OWNER crm_app;
CREATE DATABASE crm_shadow OWNER crm_app;

-- Operations.
CREATE ROLE operations_app LOGIN PASSWORD 'operations_pw';
CREATE DATABASE operations_db OWNER operations_app;
CREATE DATABASE operations_shadow OWNER operations_app;

-- Analytics.
CREATE ROLE analytics_app LOGIN PASSWORD 'analytics_pw';
CREATE DATABASE analytics_db OWNER analytics_app;
CREATE DATABASE analytics_shadow OWNER analytics_app;

-- Collaboration.
CREATE ROLE collaboration_app LOGIN PASSWORD 'collaboration_pw';
CREATE DATABASE collaboration_db OWNER collaboration_app;
CREATE DATABASE collaboration_shadow OWNER collaboration_app;

-- Workspace.
CREATE ROLE workspace_app LOGIN PASSWORD 'workspace_pw';
CREATE DATABASE workspace_db OWNER workspace_app;
CREATE DATABASE workspace_shadow OWNER workspace_app;

-- Postgres lets every role connect to every database by default; only the owner may.
-- accounts connects as postgres in development; no domain role may reach identity data.
REVOKE CONNECT ON DATABASE accounts_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE people_db, people_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE hr_db, hr_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE finance_db, finance_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE recruitment_db, recruitment_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE attendance_db, attendance_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE exam_db, exam_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE crm_db, crm_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE operations_db, operations_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE analytics_db, analytics_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE collaboration_db, collaboration_shadow FROM PUBLIC;
REVOKE CONNECT ON DATABASE workspace_db, workspace_shadow FROM PUBLIC;
