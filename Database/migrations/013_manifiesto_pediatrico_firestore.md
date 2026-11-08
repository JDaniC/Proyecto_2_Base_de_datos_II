# 013 — Huella canónica de los manifiestos pediátricos

Los archivos del modelo se leen con finales LF canónicos para que una copia
Windows y una Unix calculen la misma huella. La migración actualiza
`configuracion/modelo` y `clinica_configuracion/modelo` cuando ambos conservan
una de las huellas CRLF conocidas (reglas CRLF o los tres archivos CRLF). Una instalación nueva preparada con 006, o un
volumen existente con ambas huellas LF, no necesita una escritura adicional.

En un volumen existente, detener escritores y verificar el respaldo externo
antes de ejecutar `prepararManifiestoPediatricoFirestore(db)`. Aplicarla antes
de reaplicar `inicializarFirestore` o iniciar el backend si el volumen tiene
la huella CRLF. Se comprueban versión, institución, contrato clínico, estado
`LISTO` o `RECONCILIAR`, igualdad del conjunto de rutas con `obtenerPlan()`,
huellas conocidas y revisión positiva antes de actualizar. Huellas
discordantes, rutas diferentes, `MIGRANDO` y respaldo previo incompatible
impiden la escritura. La transacción crea un respaldo de ambos manifiestos,
preserva el estado clínico y no altera datos clínicos. Un fallo revierte
el respaldo y la actualización juntos.

Verificación desde la raíz:
`npm --prefix Backend run test:integration:clinica:firestore` y el recorrido
integral de E05-P1-04 con Firestore emulado. El emulador acredita la operación
local; IAM y el despliegue de índices en un proyecto real quedan fuera.
