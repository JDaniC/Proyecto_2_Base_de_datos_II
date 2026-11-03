# 010 — Índice descendente de crecimiento y huella clínica

El manifiesto de índices forma parte de la huella M04v2. El índice nuevo requiere
sincronizar las dos huellas, sin reescribir pacientes, consultas o historia.

En instalación nueva ejecutar inicialización M04 y preparación004/006/009 según
sus guías;006 utiliza el plan actual.010 comprueba esa instalación y no escribe.

En un proyecto Firestore cloud, publicar primero el índice descendente de
`Database/firebase/firestore.indexes.json` y confirmar que está listo (no en
construcción) antes de habilitar la huella nueva. Mantener los escritores
detenidos durante la actualización. Reanudarlos solo si010 devuelve `LISTO`.
Si devuelve `RECONCILIAR`, mantenerlos detenidos y completar la reconciliación
verificable antes de reanudarlos; finalizar010 no convierte ese estado en LISTO.
La disponibilidad se comprueba en el proyecto de destino; los resultados del
emulador no verifican esa condición. Ver la [guía oficial de índices](https://firebase.google.com/docs/firestore/query-data/indexing).

En volumen existente, detener escritores y respaldar el entorno. Con el índice
listo si se trata de cloud, desde sesión
administrativa controlada ejecutar `prepararIndiceCrecimientoFirestore(db)` del
módulo010 **antes de reejecutar el inicializador o006 del código nuevo**. Acepta
solo el origen conocido `a39fdac43acefecf82145f3dfde06c89a3adbfe96240f637cf79c0a1a6073e08`
en ambos manifiestos, con modelo2, contrato clínico1 y estado LISTO/RECONCILIAR.
El objetivo es `34517ff024a5d455a8579571f66b881ccaa58b7657e5101a14eeab6755d64de3`.
MIGRANDO, deriva desconocida o huellas discordantes se rechazan sin escrituras.

La transacción respalda ambos manifiestos íntegros en
`clinica_migracion_010_respaldo/modelo` y actualiza las huellas juntas. Conserva
LISTO/RECONCILIAR, permisos y todos los datos; no infiere reconciliación clínica.
Un fallo revierte también el respaldo; reintentar es seguro. Con objetivo ya
vigente no cambia revisión ni sobrescribe respaldos. No borrar datos/manifiestos
para evitar errores. La publicación de reglas/índices e IAM en Firestore cloud
sigue siendo configuración de despliegue separada; no se ejecutó en un proyecto real.

Verificación: prueba contractual de huella/índices y runner
`node Backend/scripts/run-clinica-firestore-integration.mjs`, con instalación
nueva, volumen con consulta/receta, fallo inyectado, recuperación, reejecución y
rechazo de deriva. El emulador no comprueba disponibilidad de índices cloud.
