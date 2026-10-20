#!/bin/sh
(
  set -eu
  PG_APP_PASSWORD="$(cat /run/secrets/postgres_app_password)" \
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --file /config/app-user.sql
)
