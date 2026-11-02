# 009 — Preparación de antecedentes pediátricos

Ejecutar `prepararAntecedentesPediatricos(db)` del módulo homónimo desde una
sesión administrativa controlada, con escritores pediátricos detenidos. Requiere
migración clínica 006 LISTO; no sustituye M04 ni cambia su manifiesto.

La extensión mantiene su propio manifiesto `pediatria_configuracion/antecedentes`:
versión 1, contrato `antecedentes-pediatricos-v1-2026-11-01`, estado y cursor.
MIGRANDO no permite habilitar escritores nuevos. LISTO acredita preparación;
RECONCILIAR exige verificar procedencia/autoría del legado antes de habilitarlos.

Por cada menor, copia íntegramente hasta 100 alergias y 100 antecedentes a
`pediatria_respaldo_009/{pacienteId}/{tipo}/{registroId}` sin modificar el origen.
Más registros detienen la migración para reconciliación explícita, sin truncar.
El cursor y cada copia se confirman en una transacción. Reiniciar el mismo módulo
reanuda después del último menor confirmado; no borrar manifiestos ni respaldos.
No ejecutar con escritores activos ni dos migradores simultáneos.

No se atribuye fecha/autor actuales a registros históricos. Todo legado detectado
queda conservado con estado RECONCILIAR. No se convierte un conjunto vacío en una
confirmación médica de «sin alergias». La lectura/escritura del nuevo agregado
se conecta en E04-P2-01; esta preparación por sí sola no acredita ese flujo.

Prueba aislada: `npm --prefix Backend run test:integration:clinica:firestore`.
Subcaso E04 verifica instalación nueva, interrupción/reanudación, reejecución y
legado en proyecto demo independiente con respaldo idéntico al original.
