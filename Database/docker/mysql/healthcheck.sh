#!/bin/sh
set -eu
MYSQL_PWD="$(cat /run/secrets/mysql_app_password)" \
  mysql --connect-timeout=3 -h127.0.0.1 -uclinica_app --database=clinica_odontologica --batch --skip-column-names \
  -e 'SELECT 1 FROM paciente LIMIT 0' >/dev/null
