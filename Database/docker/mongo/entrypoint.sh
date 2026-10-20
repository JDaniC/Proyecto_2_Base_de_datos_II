#!/bin/sh
set -eu
mkdir -p /run/mongodb
install -o mongodb -g mongodb -m 400 /run/secrets/mongo_keyfile /run/mongodb/keyfile
exec /usr/local/bin/docker-entrypoint.sh "$@"
