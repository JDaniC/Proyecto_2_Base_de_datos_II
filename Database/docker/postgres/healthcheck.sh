#!/bin/sh
set -eu
PGPASSWORD="$(cat /run/secrets/postgres_app_password)" \
  psql -X -h 127.0.0.1 -U hospital_app -d hospital_general -v ON_ERROR_STOP=1 -tAc 'SELECT 1 FROM hospital_general.paciente LIMIT 0' >/dev/null
