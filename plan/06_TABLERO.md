# Tablero de ejecución

Actualizado: 28/10/2026. Las tareas de implementación empiezan **PENDIENTE**; la existencia de este plan no acredita su ejecución. Estados: PENDIENTE → EN_CURSO → EN_REVISION → HECHA; BLOQUEADA exige causa/dependencia y permite avanzar trabajo independiente. HECHA exige criterios y evidencia verificados por el responsable; no requiere aprobación del compañero. La revisión automática se comprueba realmente según plan/10 y plan/11; no se presume por un check verde.

| ID | Lote original | Ejecutor actual | Estado | Dependencias internas | Evidencia / rama / commit / bloqueo |
|---|---|---|---|---|---|
| [E00-P1-01](entregas/E00_base_y_contratos/01_P1.md#e00-p1-01) | P1 | JDaniC | HECHA | Puerta de fase | PR #4 (`3dffdd8`); [acta](evidencias/E00/E00-P1-01.md); 24/10/2026 |
| [E00-P1-02](entregas/E00_base_y_contratos/01_P1.md#e00-p1-02) | P1 | JDaniC | HECHA | E00-P1-01 | PR #11 (`39714de`); [evidencia](evidencias/E00/E00-P1-02.md); 24/10/2026 |
| [E00-P1-03](entregas/E00_base_y_contratos/01_P1.md#e00-p1-03) | P1 | JDaniC | HECHA | E00-P1-01, E00-P2-02 | [PR #15 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/15) (`445974f`); Codex limpio sobre `679ecc9`; `revision-codex` y `contrato-pr` success; [evidencia](evidencias/E00/E00-P1-03.md), [revalidación](evidencias/E00/auditoria-E00-P1-03-2026-10-25/REVALIDACION.md) 29 PASS; 25/10/2026 |
| [E00-P2-01](entregas/E00_base_y_contratos/02_P2.md#e00-p2-01) | P2 | JDaniC | HECHA | Puerta de fase | PR #7 (`8c85f30`); [evidencia](evidencias/E00/E00-P2-01.md); 24/10/2026 |
| [E00-P2-02](entregas/E00_base_y_contratos/02_P2.md#e00-p2-02) | P2 | JDaniC | HECHA | E00-P1-01 | PR #13 (`484d5bf`); [evidencia](evidencias/E00/E00-P2-02.md); 25/10/2026 |
| [E00-P2-03](entregas/E00_base_y_contratos/02_P2.md#e00-p2-03) | P2 | JDaniC | HECHA | E00-P1-03, E00-P2-01 | [PR #17 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/17), squash merge `c3898f3`; implementación `404c0d4`; `contrato-pr` success y `revision-codex` sin hallazgos sobre `aebe841`; 32 pruebas locales PASS; [evidencia](evidencias/E00/E00-P2-03.md) y [auditoría](evidencias/E00/auditoria-E00-P2-03-2026-10-25.md); 25/10/2026 |
| [E01-P1-01](entregas/E01_fundacion_backend/01_P1.md#e01-p1-01) | P1 | JDaniC | HECHA | Puerta de fase | Implementación [PR #22 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/22), merge `8d77e1a`, SHA `6545dbe`; cierre [PR #23 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/23), merge `755a2b3`; Codex sin hallazgos y verificación postintegración 58/58; [evidencia](evidencias/E01/E01-P1-01.md) y [auditoría](evidencias/E01/auditoria-E01-P1-01-2026-10-25/INFORME.md) |
| [E01-P1-02](entregas/E01_fundacion_backend/01_P1.md#e01-p1-02) | P1 | JDaniC | HECHA | E01-P1-01 | [PR #25 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/25), squash `84967e0`; cierre [PR #26 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/26), squash `497f317`; Codex sin hallazgos, `contrato-pr` success; verificación 83/83, lint y build; [evidencia](evidencias/E01/E01-P1-02.md), [auditoría](evidencias/E01/auditoria-E01-P1-02-2026-10-25/INFORME.md) |
| [E01-P1-03](entregas/E01_fundacion_backend/01_P1.md#e01-p1-03) | P1 | JDaniC | HECHA | E01-P1-02, E01-P2-01, E01-P2-02 | [PR #32 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/32), merge `81946b1`; [PR #35 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/35), merge `753576c`; auditoría RF-014 en provisión implementada y verificada en los 4 motores; Codex limpio en `0cdb368`; 165 pruebas (133 runtime/unitarias + 32 contractuales), lint/build e integraciones SQL/NoSQL PASS; rutas clínicas diferidas a E02–E06 según alcance; [evidencia](evidencias/E01/E01-P1-03.md); 26/10/2026 |
| [E01-P2-01](entregas/E01_fundacion_backend/02_P2.md#e01-p2-01) | P2 | JDaniC | HECHA | E01-P1-02 | [PR #28 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/28), squash merge `f7cb9f9`; Codex sin hallazgos ("Didn't find any major issues. Bravo"); 65 unitarias/runtime + 32 contractuales PASS, integración Docker PG/MySQL PASS; F-01–F-06 y F-08–F-12 cerrados; F-07 preflight pendiente para E01-P1-03 con persistencia apagada; [evidencia](evidencias/E01/E01-P2-01.md) y [auditoría](evidencias/E01/auditoria-E01-P2-01-2026-10-25/INFORME.md); 26/10/2026 |
| [E01-P2-02](entregas/E01_fundacion_backend/02_P2.md#e01-p2-02) | P2 | JDaniC | HECHA | E01-P1-02 | [PR #30 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/30), squash merge `377c249`; Codex sin hallazgos ("Didn't find any major issues. More of your lovely PRs please"); 102 unitarias/runtime + 32 contractuales PASS (134 PASS), integración Docker replica set MongoDB y emulador Firestore PASS; F-01–F-14 resueltos; [evidencia](evidencias/E01/E01-P2-02.md) y [auditoría](evidencias/E01/auditoria-E01-P2-02-2026-10-26/INFORME.md); 26/10/2026 |
| [E01-P2-03](entregas/E01_fundacion_backend/02_P2.md#e01-p2-03) | P2 | JDaniC | HECHA | E01-P1-03 | [PR #37 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/37), squash merge `85397a4`; Codex sin hallazgos sobre `4ed36b5` ("Didn't find any major issues. :tada:"); 66 pruebas frontend (28 HTTP + 38 producto) PASS, bundle audit PASS; 165 backend PASS; [evidencia](evidencias/E01/E01-P2-03.md) y [auditoría](evidencias/E01/auditoria-E01-P2-03-2026-10-26/INFORME.md); 26/10/2026 |
| [E02-P1-01](entregas/E02_pacientes_historial/01_P1.md#e02-p1-01) | P1 | JDaniC | HECHA | Puerta de fase | [PR #40 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/40), squash merge `29300de`; Codex sin hallazgos ("Didn't find any major issues. More of your lovely PRs please"); 196 unitarias/runtime + 32 contractuales PASS (228 PASS); 12 rondas resueltas; [evidencia](evidencias/E02/E02-P1-01.md) y [auditoría](evidencias/E02/auditoria-E02-P1-01-2026-10-26/INFORME.md); 27/10/2026 |
| [E02-P1-02](entregas/E02_pacientes_historial/01_P1.md#e02-p1-02) | P1 | JDaniC | HECHA | E02-P1-01 | [PR #41 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/41), squash merge `aaff4d4`; Codex sin hallazgos ("Didn't find any major issues. Can't wait for the next one!"); 204 unitarias/runtime + 32 contractuales PASS (236 PASS), 4 suites integración SQL PASS, 17 resultados MongoDB real PASS; [evidencia](evidencias/E02/E02-P1-02.md), [seguimiento](seguimiento/E02-P1-02.md); 27/10/2026 |
| [E02-P1-03](entregas/E02_pacientes_historial/01_P1.md#e02-p1-03) | P1 | JDaniC | HECHA | E02-P1-02, E02-P2-01, E02-P2-02, E02-P2-03 | [PR #47 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/47), squash `41082c9`; Codex sin hallazgos sobre `bfbc38a`; contrato-pr/revision-codex SUCCESS; 99 frontend + 250 backend + 32 recorrido aislado PASS; [evidencia](evidencias/E02/E02-P1-03.md) y [seguimiento](seguimiento/E02-P1-03.md); 28/10/2026 |
| [E02-P2-01](entregas/E02_pacientes_historial/02_P2.md#e02-p2-01) | P2 | Davidix888 | HECHA | E02-P1-01 | [PR #42 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/42), squash `56752b2`; Codex sin hallazgos sobre `9b8c543`, contrato-pr/revision-codex PASS; 17 resultados MongoDB real + 196 runtime/unitarias + 32 contractuales PASS; build/lint y build postintegración PASS; [evidencia](evidencias/E02/E02-P2-01.md), [seguimiento](seguimiento/E02-P2-01.md); 27/10/2026 |
| [E02-P2-02](entregas/E02_pacientes_historial/02_P2.md#e02-p2-02) | P2 | JDaniC | HECHA | E02-P1-01 | [PR #44 integrado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/44), squash `1a1d1f3`; Codex sin hallazgos sobre `7a0a14c`; 206 unitarias/runtime + 32 contractuales PASS, 8 integración emulador Firestore PASS; [evidencia](evidencias/E02/E02-P2-02.md), [seguimiento](seguimiento/E02-P2-02.md); 28/10/2026 |
| [E02-P2-03](entregas/E02_pacientes_historial/02_P2.md#e02-p2-03) | P2 | JDaniC | HECHA | E02-P1-02, E02-P2-01, E02-P2-02 | PR #45 integrado (`4217236`); Codex sin hallazgos sobre `f0a4750`; [seguimiento](seguimiento/E02-P2-03.md); 28/10/2026 |
| [E03-P1-01](entregas/E03_nucleo_clinico/01_P1.md#e03-p1-01) | P1 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E03-P1-02](entregas/E03_nucleo_clinico/01_P1.md#e03-p1-02) | P1 | — | PENDIENTE | E03-P1-01 | Sin ejecución registrada |
| [E03-P1-03](entregas/E03_nucleo_clinico/01_P1.md#e03-p1-03) | P1 | — | PENDIENTE | E03-P1-02, E03-P2-01, E03-P2-02 | Sin ejecución registrada |
| [E03-P2-01](entregas/E03_nucleo_clinico/02_P2.md#e03-p2-01) | P2 | — | PENDIENTE | E03-P1-01 | Sin ejecución registrada |
| [E03-P2-02](entregas/E03_nucleo_clinico/02_P2.md#e03-p2-02) | P2 | — | PENDIENTE | E03-P1-01 | Sin ejecución registrada |
| [E03-P2-03](entregas/E03_nucleo_clinico/02_P2.md#e03-p2-03) | P2 | — | PENDIENTE | E03-P1-03 | Sin ejecución registrada |
| [E04-P1-01](entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-01) | P1 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E04-P1-02](entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-02) | P1 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E04-P1-03](entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-03) | P1 | — | PENDIENTE | E04-P1-02 | Sin ejecución registrada |
| [E04-P2-01](entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-01) | P2 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E04-P2-02](entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-02) | P2 | — | PENDIENTE | E04-P2-01 | Sin ejecución registrada |
| [E04-P2-03](entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-03) | P2 | — | PENDIENTE | E04-P1-01, E04-P1-03, E04-P2-02 | Sin ejecución registrada |
| [E05-P1-01](entregas/E05_laboratorio/01_P1.md#e05-p1-01) | P1 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E05-P1-02](entregas/E05_laboratorio/01_P1.md#e05-p1-02) | P1 | — | PENDIENTE | E05-P2-01 | Sin ejecución registrada |
| [E05-P1-03](entregas/E05_laboratorio/01_P1.md#e05-p1-03) | P1 | — | PENDIENTE | E05-P1-01 | Sin ejecución registrada |
| [E05-P2-01](entregas/E05_laboratorio/02_P2.md#e05-p2-01) | P2 | — | PENDIENTE | E05-P1-01 | Sin ejecución registrada |
| [E05-P2-02](entregas/E05_laboratorio/02_P2.md#e05-p2-02) | P2 | — | PENDIENTE | E05-P1-01 | Sin ejecución registrada |
| [E05-P2-03](entregas/E05_laboratorio/02_P2.md#e05-p2-03) | P2 | — | PENDIENTE | E05-P1-02, E05-P1-03, E05-P2-02 | Sin ejecución registrada |
| [E06-P1-01](entregas/E06_integracion_auditoria/01_P1.md#e06-p1-01) | P1 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E06-P1-02](entregas/E06_integracion_auditoria/01_P1.md#e06-p1-02) | P1 | — | PENDIENTE | E06-P1-01, E06-P2-01, E06-P2-02 | Sin ejecución registrada |
| [E06-P1-03](entregas/E06_integracion_auditoria/01_P1.md#e06-p1-03) | P1 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E06-P2-01](entregas/E06_integracion_auditoria/02_P2.md#e06-p2-01) | P2 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E06-P2-02](entregas/E06_integracion_auditoria/02_P2.md#e06-p2-02) | P2 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E06-P2-03](entregas/E06_integracion_auditoria/02_P2.md#e06-p2-03) | P2 | — | PENDIENTE | E06-P1-02, E06-P1-03 | Sin ejecución registrada |
| [E07-P1-01](entregas/E07_entrega_final/01_P1.md#e07-p1-01) | P1 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E07-P1-02](entregas/E07_entrega_final/01_P1.md#e07-p1-02) | P1 | — | PENDIENTE | E07-P1-01, E07-P2-01, E07-P2-02 | Sin ejecución registrada |
| [E07-P1-03](entregas/E07_entrega_final/01_P1.md#e07-p1-03) | P1 | — | PENDIENTE | E07-P1-02 | Sin ejecución registrada |
| [E07-P2-01](entregas/E07_entrega_final/02_P2.md#e07-p2-01) | P2 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E07-P2-02](entregas/E07_entrega_final/02_P2.md#e07-p2-02) | P2 | — | PENDIENTE | Puerta de fase | Sin ejecución registrada |
| [E07-P2-03](entregas/E07_entrega_final/02_P2.md#e07-p2-03) | P2 | — | PENDIENTE | E07-P1-03 | Sin ejecución registrada |

Ejecutor `—` significa sin asignación; no implica disponibilidad si hay una reserva en PR abierto. Consultar [protocolo compartido](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md) y `python3 scripts/github/cola.py`. El helper evalúa el tablero local; comprobar también el remoto antes de reservar.

## Cierres de entrega

| Fase | Estado | Evidencia prevista |
|---|---|---|
| E00 | HECHA | [Cierre y demostración](evidencias/E00/CIERRE.md); PR #20 integrado (`566e75c`); Codex sin hallazgos |
| E01 | HECHA | [Cierre y demostración](evidencias/E01/CIERRE.md); PR #39 integrado; Codex sin hallazgos |
| E02 | EN_REVISION | [Cierre y demostración](evidencias/E02/CIERRE.md); PR #49; Codex en revisión |
| E03 | PENDIENTE | `plan/evidencias/E03/CIERRE.md` por crear al ejecutar |
| E04 | PENDIENTE | `plan/evidencias/E04/CIERRE.md` por crear al ejecutar |
| E05 | PENDIENTE | `plan/evidencias/E05/CIERRE.md` por crear al ejecutar |
| E06 | PENDIENTE | `plan/evidencias/E06/CIERRE.md` por crear al ejecutar |
| E07 | PENDIENTE | `plan/evidencias/E07/CIERRE.md` por crear al ejecutar |

No cambiar estos estados por el conteo de pruebas históricas. Los IDs y dependencias son estables. El lote no restringe al ejecutor; registrar toma, liberación o traspaso con fecha en la evidencia/seguimiento y PR, sin duplicar la tarea. Los archivos detallados contienen el trabajo y criterios, este tablero contiene el estado.
