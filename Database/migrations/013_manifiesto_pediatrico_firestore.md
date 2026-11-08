# 013 — Huella canónica de los manifiestos pediátricos

Los archivos del modelo se leen con finales LF canónicos para que una copia
Windows y una Unix calculen la misma huella. La migración actualiza
`configuracion/modelo` y `clinica_configuracion/modelo` cuando ambos conservan
una de las huellas CRLF conocidas (reglas CRLF o los tres archivos CRLF). Una instalación nueva preparada con 006, o un
volumen existente con ambas huellas LF, no necesita una escritura adicional.

En un volumen existente, detener escritores y verificar el respaldo externo.
En un proyecto cloud, publicar y verificar el índice de
[010](010_indice_crecimiento_firestore.md) antes de cualquiera de estas rutas.

- Origen LF anterior a 010: ejecutar 010 y luego 013. La primera migra a la huella canónica y la segunda confirma el estado sin escribir.
- Ambas huellas coinciden con una variante CRLF conocida: ejecutar 013 antes de 010 y antes de reaplicar `inicializarFirestore`. Después, 010 comprueba la huella LF y no vuelve a escribir.
- Instalación nueva: inicializar el modelo y preparar 006. Con la huella LF canónica, 010 y 013 verifican sin cambiar los manifiestos.

Ejecutar 013 mediante `prepararManifiestoPediatricoFirestore(db)`. Se comprueban versión, institución, contrato clínico, estado
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
