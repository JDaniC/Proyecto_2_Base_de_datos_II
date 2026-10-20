#!/bin/sh
(
  set -eu
  app_password="$(cat /run/secrets/mysql_app_password)"
  # El generador produce 64 caracteres hexadecimales; validar antes de formar SQL.
  case "$app_password" in *[!0-9a-f]*|'') echo 'FORMATO_CREDENCIAL_INVALIDO' >&2; exit 1;; esac
  [ "${#app_password}" -eq 64 ] || { echo 'FORMATO_CREDENCIAL_INVALIDO' >&2; exit 1; }
  administrar() {
    MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" mysql --protocol=socket -uroot --batch --skip-column-names "$@"
  }
  administrar -e "CREATE USER 'clinica_app'@'%' IDENTIFIED BY '$app_password';"
  tablas="$(administrar -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='clinica_odontologica' AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'modelo_database'")"
  for tabla in $tablas; do
    case "$tabla" in
      auditoria|operaciones|revisiones) permisos='SELECT, INSERT';;
      *) permisos='SELECT, INSERT, UPDATE, DELETE';;
    esac
    administrar -e "GRANT $permisos ON clinica_odontologica.\`$tabla\` TO 'clinica_app'@'%';"
  done
  administrar -e "GRANT EXECUTE ON PROCEDURE clinica_odontologica.validar_consulta_clinica TO 'clinica_app'@'%'; GRANT EXECUTE ON FUNCTION clinica_odontologica.instantanea_receta_valida TO 'clinica_app'@'%';"
)
