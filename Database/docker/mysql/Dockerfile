FROM mysql:8.4.6
COPY --chmod=0644 20-app-user.sh /docker-entrypoint-initdb.d/20-app-user.sh
COPY --chmod=0644 healthcheck.sh /config/healthcheck.sh
