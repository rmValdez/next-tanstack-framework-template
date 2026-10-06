-- HR's published read API for other domains (finance, attendance, ...). Hand-written:
-- Prisma Migrate does not create views.
--
-- Contract rules: additive changes only; a breaking change ships as _v2 next to _v1, and
-- _v1 is dropped only after every consumer has moved. Salary and HR's auth tables are
-- deliberately not exposed. A migration that alters a column used here must drop and
-- recreate the view in the same file (Postgres blocks the ALTER otherwise).

-- Needed so the shadow database replay works; the real schema comes from init.sql.
CREATE SCHEMA IF NOT EXISTS "hr_public";

CREATE VIEW hr_public.employee_directory_v1 AS
SELECT
  e.id,
  e.employee_no,
  e.full_name,
  e.email,
  e.position,
  d.code AS department_code,
  d.name AS department_name,
  e.status::text AS status
FROM hr.employees e
JOIN hr.departments d ON d.id = e.department_id;
