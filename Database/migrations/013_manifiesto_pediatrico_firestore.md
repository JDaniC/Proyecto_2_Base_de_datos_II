# 013 — Manifiesto pediátrico Firestore vigente

La ampliación del modelo M04 cambió la huella calculada del plan sin modificar
datos clínicos. Esta migración sincroniza atómicamente `configuracion/modelo` y
`clinica_configuracion/modelo` desde la huella 010 conocida hacia la huella del
plan vigente. Conserva el estado `LISTO` o `RECONCILIAR`, crea un respaldo
íntegro en `clinica_migracion_013_respaldo/modelo` y no toca pacientes,
consultas, responsables, historia, auditoría ni operaciones.

Con escritores detenidos y respaldo externo verificado, ejecutar
`prepararManifiestoPediatricoFirestore(db)`. Una instalación nueva preparada
por 006 ya tiene la huella objetivo y produce un no-op. Un volumen existente
debe tener exactamente la huella objetivo de 010 en ambos manifiestos; una
deriva, huellas discordantes, estado `MIGRANDO` o respaldo previo incompatible
falla cerrado. Un fallo inyectado revierte respaldo y manifiestos.

Verificación: `npm run test:integration:clinica:firestore` y el recorrido
integral de E05-P1-04 con Firestore emulado. El emulador no acredita IAM ni el
despliegue de índices en un proyecto real.
