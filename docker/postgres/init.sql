-- Runs once, when the data volume is first created. Each service owns its own database;
-- no service reads another's tables.
CREATE DATABASE accounts_db;
CREATE DATABASE web_db;
