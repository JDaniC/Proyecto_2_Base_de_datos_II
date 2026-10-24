# Cronograma de integración hasta el 5 de noviembre de 2026

Fecha de planificación: 24/10/2026. Zona: America/Guatemala. P1: Daniel (JDaniC); P2: David (Davidix888). Fechas objetivo, no estados de ejecución. El tablero 06_TABLERO.md conserva la autoridad sobre los estados.

## 1. Capacidad y compromiso

Diez días de construcción e integración: 25/10–03/11, incluyendo fines de semana. El 04/11 es para instalación independiente, documentación y ensayo; el 05/11 para correcciones finales y entrega. No dejar la primera integración para el último día.

Las estimaciones originales suman 61 sesiones P1 y 62 P2, de 2–4 h: **246–492 horas-persona**, sin una reserva adicional explícita. Como hipótesis de trabajo, 6 h diarias por persona durante doce días aportan 144 horas-persona; no cubren ni el extremo inferior. La disponibilidad real no está confirmada. Este cronograma expresa la fecha objetivo solicitada, no una promesa de completar ese alcance con esa capacidad. El apoyo de agentes no se contabiliza como ahorro garantizado.

Al cierre de E00, ambos deben medir tiempo real y reestimar tareas pendientes. Si el total supera las horas disponibles, acordar mayor capacidad o un ajuste explícito de alcance con los criterios académicos como límite. No eliminar requisitos ni pruebas por decisión del bot. Mantener este calendario como objetivo y registrar una nueva previsión si una puerta se retrasa.

## 2. Calendario diario y resultado integrado

| Fecha | P1 — JDaniC | P2 — Davidix888 | Resultado y puerta |
|---|---|---|---|
| 24/10 | Preparar PR del flujo e inventario de cambios locales | Aceptar invitación y revisar flujo | Preparación; importar plan/UI mediante PR controlado, sin publicar cambios ajenos |
| 25/10 | E00: alcance, regresión PG, contrato API | E00: entornos, inventario UI, arnés | Contrato revisado; cuatro entornos verificables; recalibrar capacidad |
| 26/10 | E01-P1-01 → E01-P1-02 | Preparación de fixtures; E01-P2-01/02 solo tras puertos revisados | Esqueleto y contratos compartidos integrados |
| 27/10 | E01-P1-03 después de UoW | Cerrar E01-P2-01/02; E01-P2-03 tras autenticación | Identidad real de ensayo, aislamiento y rollback |
| 28/10 | E02-P1-01 → SQL; UI después de los adaptadores | E02 Mongo → Firestore → historial | Pacientes persistentes en cuatro motores |
| 29/10 | E03-P1-01 → E03-P1-02 | E03-P2-01/02 después del contrato clínico | Núcleo clínico y adaptadores en revisión |
| 30/10 | E03-P1-03 después de adaptadores | Cerrar adaptadores; E03-P2-03 después de archivo | Clínica común completa por UI y archivo sin pérdida |
| 31/10 | E04 dental, hospitalización → coberturas | E04 responsables → vacunas → UI tras módulos | Tres instituciones demostrables |
| 01/11 | E05-P1-01 → E05-P1-03 | E05-P2-01/02 después de órdenes | Órdenes, muestras, resultados e inventario |
| 02/11 | E05-P1-02 después de resultados; cerrar cobros | E05-P2-03 después de informes/cobros/inventario | Laboratorio completo; congelar funciones nuevas |
| 03/11 | E06 seguridad, restauración y equivalencia | E06 integración UI, regresiones y auditoría final | Candidato integrado en Develop; sin defectos críticos/altos ni pruebas requeridas bloqueadas |
| 04/11 | E07 comparativo; instalación después de manuales/trazabilidad | E07 trazabilidad y manuales | Ambos reproducen instalación; candidato de entrega |
| 05/11 | E07 ensayo final después de instalación | E07 checklist después del ensayo | PR Develop → main aprobado; etiqueta de versión y paquete de entrega |

Las secuencias con flechas son obligatorias. Si una dependencia no está revisada, solo se preparan fixtures/documentación independientes; no se integra una tarea dependiente como terminada. Una fecha no sustituye una puerta.

## 3. Fechas por tarea

Conservar IDs y orden de los archivos originales. La ventana corresponde a la fase; dentro de ella se respeta la columna de dependencias del tablero. El enlace de cada fila contiene trabajo, éxitos, fallos, excepciones y evidencia exigida.

| N.º | ID / detalle ejecutable | Responsable | Ventana objetivo | Integrar a más tardar |
|---|---|---|---|---|
| 01 | [E00-P1-01 — Alinear alcance final y políticas institucionales](entregas/E00_base_y_contratos/01_P1.md#e00-p1-01) | JDaniC | 25/10–25/10 | 25/10/2026 |
| 02 | [E00-P1-02 — Corregir el archivo de historiales en PostgreSQL](entregas/E00_base_y_contratos/01_P1.md#e00-p1-02) | JDaniC | 25/10–25/10 | 25/10/2026 |
| 03 | [E00-P1-03 — Definir API y puertos comunes versionados](entregas/E00_base_y_contratos/01_P1.md#e00-p1-03) | JDaniC | 25/10–25/10 | 25/10/2026 |
| 04 | [E00-P2-01 — Preparar cuatro entornos de ensayo y desbloquear auditorías](entregas/E00_base_y_contratos/02_P2.md#e00-p2-01) | Davidix888 | 25/10–25/10 | 25/10/2026 |
| 05 | [E00-P2-02 — Inventariar contratos reales del frontend y sus diferencias](entregas/E00_base_y_contratos/02_P2.md#e00-p2-02) | Davidix888 | 25/10–25/10 | 25/10/2026 |
| 06 | [E00-P2-03 — Diseñar fixtures y arnés de aceptación compartido](entregas/E00_base_y_contratos/02_P2.md#e00-p2-03) | Davidix888 | 25/10–25/10 | 25/10/2026 |
| 07 | [E01-P1-01 — Crear esqueleto backend, composición y contratos de ejecución](entregas/E01_fundacion_backend/01_P1.md#e01-p1-01) | JDaniC | 26/10–27/10 | 27/10/2026 |
| 08 | [E01-P1-02 — Implementar valores, políticas y puertos del núcleo](entregas/E01_fundacion_backend/01_P1.md#e01-p1-02) | JDaniC | 26/10–27/10 | 27/10/2026 |
| 09 | [E01-P1-03 — Autenticar, autorizar y enrutar por institución](entregas/E01_fundacion_backend/01_P1.md#e01-p1-03) | JDaniC | 26/10–27/10 | 27/10/2026 |
| 10 | [E01-P2-01 — Implementar conexiones y unidades de trabajo SQL](entregas/E01_fundacion_backend/02_P2.md#e01-p2-01) | Davidix888 | 26/10–27/10 | 27/10/2026 |
| 11 | [E01-P2-02 — Implementar unidades de trabajo MongoDB y Firestore](entregas/E01_fundacion_backend/02_P2.md#e01-p2-02) | Davidix888 | 26/10–27/10 | 27/10/2026 |
| 12 | [E01-P2-03 — Conectar sesión y transporte HTTP de la interfaz](entregas/E01_fundacion_backend/02_P2.md#e01-p2-03) | Davidix888 | 26/10–27/10 | 27/10/2026 |
| 13 | [E02-P1-01 — Crear casos comunes de pacientes e identidad](entregas/E02_pacientes_historial/01_P1.md#e02-p1-01) | JDaniC | 28/10–28/10 | 28/10/2026 |
| 14 | [E02-P1-02 — Persistir pacientes en PostgreSQL y MySQL](entregas/E02_pacientes_historial/01_P1.md#e02-p1-02) | JDaniC | 28/10–28/10 | 28/10/2026 |
| 15 | [E02-P1-03 — Integrar alta, edición y expediente en React](entregas/E02_pacientes_historial/01_P1.md#e02-p1-03) | JDaniC | 28/10–28/10 | 28/10/2026 |
| 16 | [E02-P2-01 — Persistir pacientes e identidad en MongoDB](entregas/E02_pacientes_historial/02_P2.md#e02-p2-01) | Davidix888 | 28/10–28/10 | 28/10/2026 |
| 17 | [E02-P2-02 — Persistir menores y responsables iniciales en Firestore](entregas/E02_pacientes_historial/02_P2.md#e02-p2-02) | Davidix888 | 28/10–28/10 | 28/10/2026 |
| 18 | [E02-P2-03 — Construir consultas de expediente e historial ordenado](entregas/E02_pacientes_historial/02_P2.md#e02-p2-03) | Davidix888 | 28/10–28/10 | 28/10/2026 |
| 19 | [E03-P1-01 — Implementar atención clínica común y comando compuesto](entregas/E03_nucleo_clinico/01_P1.md#e03-p1-01) | JDaniC | 29/10–30/10 | 30/10/2026 |
| 20 | [E03-P1-02 — Implementar atención clínica en ambos adaptadores SQL](entregas/E03_nucleo_clinico/01_P1.md#e03-p1-02) | JDaniC | 29/10–30/10 | 30/10/2026 |
| 21 | [E03-P1-03 — Implementar archivo, finalización y corrección histórica](entregas/E03_nucleo_clinico/01_P1.md#e03-p1-03) | JDaniC | 29/10–30/10 | 30/10/2026 |
| 22 | [E03-P2-01 — Implementar núcleo clínico de laboratorio en MongoDB](entregas/E03_nucleo_clinico/02_P2.md#e03-p2-01) | Davidix888 | 29/10–30/10 | 30/10/2026 |
| 23 | [E03-P2-02 — Implementar atención pediátrica transaccional](entregas/E03_nucleo_clinico/02_P2.md#e03-p2-02) | Davidix888 | 29/10–30/10 | 30/10/2026 |
| 24 | [E03-P2-03 — Integrar atención, archivo y prueba común desde la UI](entregas/E03_nucleo_clinico/02_P2.md#e03-p2-03) | Davidix888 | 29/10–30/10 | 30/10/2026 |
| 25 | [E04-P1-01 — Completar agenda y atención odontológica](entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-01) | JDaniC | 31/10–31/10 | 31/10/2026 |
| 26 | [E04-P1-02 — Hospitalizaciones y ocupación de camas](entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-02) | JDaniC | 31/10–31/10 | 31/10/2026 |
| 27 | [E04-P1-03 — Exámenes, procedimientos y coberturas hospitalarias](entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-03) | JDaniC | 31/10–31/10 | 31/10/2026 |
| 28 | [E04-P2-01 — Responsables, antecedentes y crecimiento pediátrico](entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-01) | Davidix888 | 31/10–31/10 | 31/10/2026 |
| 29 | [E04-P2-02 — Versionar vacunas y registrar aplicaciones únicas](entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-02) | Davidix888 | 31/10–31/10 | 31/10/2026 |
| 30 | [E04-P2-03 — Cerrar integración institucional de agendas y pediatría](entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-03) | Davidix888 | 31/10–31/10 | 31/10/2026 |
| 31 | [E05-P1-01 — Catálogos, órdenes y trazabilidad de muestras](entregas/E05_laboratorio/01_P1.md#e05-p1-01) | JDaniC | 01/11–02/11 | 02/11/2026 |
| 32 | [E05-P1-02 — Generar informes inmutables y descarga autorizada](entregas/E05_laboratorio/01_P1.md#e05-p1-02) | JDaniC | 01/11–02/11 | 02/11/2026 |
| 33 | [E05-P1-03 — Facturación, pagos y reversiones con saldo consistente](entregas/E05_laboratorio/01_P1.md#e05-p1-03) | JDaniC | 01/11–02/11 | 02/11/2026 |
| 34 | [E05-P2-01 — Captura, validación, corrección y repetición de resultados](entregas/E05_laboratorio/02_P2.md#e05-p2-01) | Davidix888 | 01/11–02/11 | 02/11/2026 |
| 35 | [E05-P2-02 — Inventario de reactivos, equipos y control de calidad](entregas/E05_laboratorio/02_P2.md#e05-p2-02) | Davidix888 | 01/11–02/11 | 02/11/2026 |
| 36 | [E05-P2-03 — Integrar laboratorio y administración mínima de cuentas](entregas/E05_laboratorio/02_P2.md#e05-p2-03) | Davidix888 | 01/11–02/11 | 02/11/2026 |
| 37 | [E06-P1-01 — Revisar autorización y recuperar fallos de identidad](entregas/E06_integracion_auditoria/01_P1.md#e06-p1-01) | JDaniC | 03/11–03/11 | 03/11/2026 |
| 38 | [E06-P1-02 — Demostrar equivalencia, atomicidad y concurrencia en cuatro motores](entregas/E06_integracion_auditoria/01_P1.md#e06-p1-02) | JDaniC | 03/11–03/11 | 03/11/2026 |
| 39 | [E06-P1-03 — Instalación reproducible, respaldo y restauración](entregas/E06_integracion_auditoria/01_P1.md#e06-p1-03) | JDaniC | 03/11–03/11 | 03/11/2026 |
| 40 | [E06-P2-01 — Cerrar todas las fronteras HTTP y eliminar simulación en entrega](entregas/E06_integracion_auditoria/02_P2.md#e06-p2-01) | Davidix888 | 03/11–03/11 | 03/11/2026 |
| 41 | [E06-P2-02 — Actualizar regresiones de UI y ejecutar recorridos completos](entregas/E06_integracion_auditoria/02_P2.md#e06-p2-02) | Davidix888 | 03/11–03/11 | 03/11/2026 |
| 42 | [E06-P2-03 — Auditar candidato integrado y cerrar defectos](entregas/E06_integracion_auditoria/02_P2.md#e06-p2-03) | Davidix888 | 03/11–03/11 | 03/11/2026 |
| 43 | [E07-P1-01 — Redactar comparativo final y modelos corregidos](entregas/E07_entrega_final/01_P1.md#e07-p1-01) | JDaniC | 04/11–05/11 | 05/11/2026 |
| 44 | [E07-P1-02 — Preparar paquete instalable desde cero](entregas/E07_entrega_final/01_P1.md#e07-p1-02) | JDaniC | 04/11–05/11 | 05/11/2026 |
| 45 | [E07-P1-03 — Ensayar defensa y demostración final con ambos integrantes](entregas/E07_entrega_final/01_P1.md#e07-p1-03) | JDaniC | 04/11–05/11 | 05/11/2026 |
| 46 | [E07-P2-01 — Cerrar retroalimentación docente y trazabilidad académica](entregas/E07_entrega_final/02_P2.md#e07-p2-01) | Davidix888 | 04/11–05/11 | 05/11/2026 |
| 47 | [E07-P2-02 — Escribir manuales de uso y operación para la entrega](entregas/E07_entrega_final/02_P2.md#e07-p2-02) | Davidix888 | 04/11–05/11 | 05/11/2026 |
| 48 | [E07-P2-03 — Verificar y cerrar el paquete final](entregas/E07_entrega_final/02_P2.md#e07-p2-03) | Davidix888 | 04/11–05/11 | 05/11/2026 |

## 4. Rutina de integración (horarios propuestos)

- 09:00: quince minutos para dependencias, bloqueos y archivos compartidos; reservar una tarea por persona.
- 13:00: primera ventana de revisión cruzada. Revisar primero PR que desbloquea al compañero.
- 18:00: segunda revisión; atender hallazgos del bot y ejecutar evidencia decisiva.
- 19:00: integrar PR aprobados; actualizar tablero y probar el flujo conjunto del día. Estos horarios se pueden mover manteniendo dos ventanas.

Límite de trabajo simultáneo: una tarea en implementación y como máximo un PR esperando revisión por integrante. Si un ID es grande, dividir en PR incrementales a/b/c conservando el ID y sin marcar HECHA antes de cubrirlo entero. Un nuevo commit requiere revisión vigente. El autor nunca aprueba su propio PR.

## 5. Éxito, fallo y excepción del proceso

Éxito: dependencia cerrada → rama desde Develop → implementación y evidencia → PR con ID → contrato-pr verde → revisión de Codex → revisión del compañero → squash merge → comprobación integrada → cierre humano del tablero.

Fallo del contrato: corregir título/rama/ID o destino. Conflicto: actualizar desde Develop, resolver con el dueño del archivo y repetir comprobaciones afectadas. Hallazgo de Codex: reproducir, corregir o responder con evidencia; solicitar revisión del commit nuevo. Codex no disponible: registrar bloqueo de revisión y reintentar; una excepción humana explícita debe quedar documentada, no simular respuesta del bot.

Prueba funcional fallida: mantener tarea EN_CURSO/BLOQUEADA según causa aunque contrato-pr esté verde. Los fallos históricos MySQL/MongoDB en Actions no quedan resueltos al retirar ese workflow del alcance; E00 debe verificar el entorno elegido. No hay pruebas de motores automatizadas en el flujo mínimo de GitHub.

Retraso mayor de media jornada en ruta crítica: reunión de 20 minutos, identificar dependencia concreta, reasignar preparación independiente y actualizar previsión. Si E03 no cierra el 30/10 o E05 no cierra el 02/11, la fecha final queda en riesgo alto: no consumir en silencio el día de instalación. Si el 05/11 faltan criterios, registrar entrega incompleta con pendientes; no etiquetarla como validada.

## 6. Entrega final

El 03/11 se congela alcance funcional. El 04/11 probar clon limpio y datos sintéticos desde otro equipo, con cuatro motores y sin fallback a mocks. El 05/11 revisar manuales, comparativo, trazabilidad docente y demostración; abrir PR de entrega desde Develop a main. Solo tras aprobación y comprobaciones aplicables crear la etiqueta de la versión y conservar evidencia asociada al commit. El bot no publica la entrega académica ni marca tareas HECHA.
