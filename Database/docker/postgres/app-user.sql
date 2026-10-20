\getenv app_password PG_APP_PASSWORD
CREATE USER hospital_app PASSWORD :'app_password';
GRANT CONNECT ON DATABASE hospital_general TO hospital_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA hospital_general TO hospital_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hospital_general TO hospital_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hospital_general TO hospital_app;
REVOKE ALL ON hospital_general.modelo_database FROM hospital_app;
REVOKE UPDATE, DELETE ON hospital_general.auditoria, hospital_general.operaciones, hospital_general.revisiones FROM hospital_app;
ALTER ROLE hospital_app SET search_path = hospital_general, public;
ALTER ROLE hospital_app SET timezone = 'UTC';
