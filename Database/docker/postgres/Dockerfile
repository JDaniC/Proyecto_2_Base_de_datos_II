FROM postgres:18.6
# No ejecutable: el entrypoint oficial lo carga con su usuario de inicializacion.
COPY --chmod=0644 20-app-user.sh /docker-entrypoint-initdb.d/20-app-user.sh
COPY --chmod=0644 app-user.sql healthcheck.sh /config/
# COPY --chmod tambien afecta el directorio destino: permitir lectura al usuario postgres.
RUN chmod 0755 /config
