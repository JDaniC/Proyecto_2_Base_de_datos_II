# Plan de construcción y entrega final

Fecha: 24/10/2026. Estado: **PLANIFICADO; implementación pendiente**. Este plan transforma la consigna de Entrega II en ocho entregas internas pequeñas. No son entregas adicionales exigidas por el docente. El trabajo actual produce planificación y guía de agentes; no implementa el backend ni corrige todavía los scripts.

## 1. Resultado que debe alcanzarse

Una aplicación cliente-servidor que use la interfaz React existente, un backend hexagonal común y cuatro persistencias: Hospital/PostgreSQL, Odontología/MySQL, Laboratorio/MongoDB y Pediatría/Firestore. Debe permitir alta/búsqueda de pacientes, mantenimiento de consultas, diagnósticos, tratamientos y recetas, historial ordenado y archivo sin pérdida. La institución se obtiene de la identidad autenticada. La entrega incluye los procesos institucionales conservados, modelos corregidos, comparación documentada y evidencia reproducible.

La [base de alcance](01_ALCANCE_Y_DECISIONES.md) resume la consigna suministrada y resuelve las diferencias de los documentos locales. La arquitectura es un medio para demostrar modelado, consistencia y seguridad; no requiere microservicios ni pantallas nuevas para cada tabla.

## 2. Dos responsables, sin tareas compartidas ambiguas

- **P1: Daniel**, asignación inicial intercambiable. Lidera dominio común, API, SQL y hospital/odontología; también toma informes y cobros de laboratorio para repartir carga.
- **P2: David (Davidix888)**. Lidera infraestructura de pruebas, MongoDB/Firestore, integración React y procesos pediátricos; toma resultados e inventario de laboratorio.
- Cada tarea tiene un único ejecutor y Codex revisa el PR; la revisión del compañero es opcional. Ambos pueden usar sus agentes, pero una tarea tiene una sola rama y un responsable humano.
- Los IDs `E03-P2-02`, por ejemplo, indican fase 03, persona 2 y tarea 02. Son permanentes aunque cambie la persona. Las tareas se leen en orden numérico dentro del archivo de cada integrante.

## 3. Entregas y puertas de cierre

| Fase | Resultado demostrable | Trabajo P1 | Trabajo P2 | Puerta para cerrar |
|---|---|---|---|---|
| E00 | Base de trabajo y contrato acordado; bloqueos de auditoría tratados | [Alcance, corrección PG, API](entregas/E00_base_y_contratos/01_P1.md) | [Entornos, inventario UI, arnés de pruebas](entregas/E00_base_y_contratos/02_P2.md) | Regresión PG corregida; MySQL/Firestore ejecutables o bloqueo explícito que impide cerrar E00; contrato v1 revisado |
| E01 | Backend arranca, valida identidad y selecciona conexión institucional | [Esqueleto, núcleo/puertos, autenticación](entregas/E01_fundacion_backend/01_P1.md) | [Unidades de trabajo SQL/NoSQL y cliente HTTP](entregas/E01_fundacion_backend/02_P2.md) | Sesión real de ensayo para cuatro instituciones; aislamiento y rollback básico |
| E02 | Alta, búsqueda, edición e historial inicial persistidos | [Casos comunes, adaptadores SQL, UI pacientes](entregas/E02_pacientes_historial/01_P1.md) | [Adaptadores Mongo/Firestore, consultas cronológicas](entregas/E02_pacientes_historial/02_P2.md) | Alta atómica, duplicados y búsquedas probados en cuatro motores |
| E03 | Atención clínica común completa y archivo | [Casos clínicos, SQL, revisión/archivo](entregas/E03_nucleo_clinico/01_P1.md) | [Mongo, Firestore, UI clínica/equivalencia](entregas/E03_nucleo_clinico/02_P2.md) | Consulta + diagnóstico + tratamiento + receta; fallo revierte; archivo conserva historia |
| E04 | Hospital, odontología y pediatría completos | [Agenda dental, hospitalización/cama, exámenes/seguros](entregas/E04_hospital_dental_pediatria/01_P1.md) | [Responsables/crecimiento, vacunas, UI institucional](entregas/E04_hospital_dental_pediatria/02_P2.md) | Demostraciones reales de las tres instituciones, incluidas carreras y revisiones |
| E05 | Laboratorio completo | [Órdenes/muestras, informes, facturas/pagos](entregas/E05_laboratorio/01_P1.md) | [Resultados, inventario/calidad, UI/cuentas](entregas/E05_laboratorio/02_P2.md) | Orden → muestra → resultado → informe; cobro e inventario sin duplicación |
| E06 | Candidato integrado verificado | [Seguridad, equivalencia/concurrencia, restauración](entregas/E06_integracion_auditoria/01_P1.md) | [Integración total UI, regresiones UI, auditoría final](entregas/E06_integracion_auditoria/02_P2.md) | Cero defectos críticos/altos abiertos; pruebas requeridas sin BLOCKED; sin simuladores en modo entrega |
| E07 | Paquete académico reproducible y defendible | [Comparativo, instalación, ensayo](entregas/E07_entrega_final/01_P1.md) | [Retroalimentación/trazabilidad, manuales, checklist](entregas/E07_entrega_final/02_P2.md) | Ambos reproducen instalación y demo; todos los criterios académicos con evidencia |

Cada fase contiene `01_P1.md` y `02_P2.md` en `entregas/`. Las dos colas completas están en [P1](P1_DANIEL.md) y [P2](P2_COMPANERO.md). El [tablero](06_TABLERO.md) es la fuente única de estados de tareas.

## 4. Orden y trabajo en paralelo

Ruta principal: E00 → E01 → E02 → E03 → E04 → E05 → E06 → E07. Son dependencias de integración; se puede preparar documentación/fixtures de una fase posterior cuando sus entradas estén disponibles. No declarar una fase cerrada por trabajo aislado.

Los primeros trabajos independientes son **E00-P1-01** (alinear alcance) y **E00-P2-01** (preparar los cuatro entornos). En E01, P1 define puertos antes de que P2 conecte unidades de trabajo. En E02/E03, los adaptadores se construyen contra el mismo contrato, no copian casos de uso. En E05 P1 y P2 trabajan en archivos diferentes del laboratorio. Antes de integrar archivos compartidos, el responsable solicita revisión al otro integrante mediante su coordinación habitual.

Si un entorno sigue bloqueado, avanzar tareas no dependientes y documentar el bloqueo. Una prueba de contrato con dobles no sustituye una prueba del motor. La fecha límite solicitada es el 05/11/2026. El [cronograma](09_CRONOGRAMA_HASTA_05_NOV.md) asigna ventanas a las 48 tareas y explicita el desfase de capacidad; las horas disponibles siguen sin confirmarse. Al terminar E00, recalibrar estimaciones con la primera ejecución. Las tareas de 3 sesiones se pueden dividir en subtareas `a/b/c` conservando su ID padre y criterios.

## 5. Protocolo de cada entrega pequeña

1. Tomar la primera tarea pendiente cuyas dependencias estén revisadas; reservarla en el tablero.
2. Leer las fuentes y rutas indicadas. Registrar discrepancias antes de cambiar contratos.
3. Crear una rama `codex/eXX-pX-NN-descripcion` desde la integración acordada, si se trabaja con ramas. Mantener cambios ajenos intactos.
4. Implementar el alcance de la tarea y sus pruebas de éxito, rechazo y excepciones. Ejecutar con datos sintéticos y motores aislados.
5. Guardar evidencia y actualizar la fila del tablero a `EN_REVISION`, con commit/rama, resultados y limitaciones. Usar [la plantilla](plantillas/CIERRE_TAREA.md).
6. Codex revisa el PR y el responsable verifica criterios y reproduce los casos decisivos. Solo entonces marcar `HECHA`; el compañero puede revisar de forma opcional.
7. Al cerrar las seis tareas de la fase, ejecutar su demostración integrada y llenar [CIERRE_ENTREGA](plantillas/CIERRE_ENTREGA.md). Una prueba fallida devuelve la tarea al responsable; no se oculta cambiando el criterio.

## 6. Reglas para impedir retrabajo

- Preservar la UI auditada. `Frontend/src/app/ServiceContext.tsx` hoy inyecta simuladores: reemplazar esa frontera progresivamente por repositorios HTTP.
- Los contratos TypeScript actuales contienen actor e institución enviados por la UI y carecen de versión en varios métodos. Son una interfaz de presentación que debe mapearse al API, no una autoridad de seguridad.
- Un dueño para archivos comunes: P1 integra puertos, OpenAPI, composición y dominio compartido; P2 integra `ServiceContext`, configuración de frontend y harness común. La revisión es mutua, sin ediciones simultáneas de esos archivos.
- Una migración SQL se entrega junto al cambio del inicializador y pruebas en instalación nueva/existente. No borrar volúmenes para esconder deriva del manifiesto.
- El plan no autoriza publicar, enviar mensajes o modificar una base compartida. La implementación se valida en entornos de desarrollo/prueba.

## 7. Índice de guías

- [Alcance, fuentes y decisiones](01_ALCANCE_Y_DECISIONES.md).
- [Arquitectura hexagonal y construcción del backend](02_ARQUITECTURA_HEXAGONAL.md).
- [Contratos, API, errores y transacciones](03_CONTRATOS_Y_FLUJOS.md).
- [Pruebas y aceptación de la entrega](04_PRUEBAS_Y_ENTREGA.md).
- [Trazabilidad de consigna, RF, RNF y CA](05_TRAZABILIDAD.md).
- [Tablero de las 48 tareas](06_TABLERO.md).
- [Auditoría y actualización de AGENTS.md](07_AUDITORIA_AGENTES.md).
- [Validación documental del plan](08_VALIDACION_DEL_PLAN.md).
- [Guía raíz del agente](../AGENTS.md) y [contexto académico](../Agente/AGENTS.md).

## 8. Definición final de terminado

El repositorio se instala desde cero en el equipo del compañero; los cuatro motores tienen datos sintéticos persistentes; cada cuenta entra automáticamente en su institución; todos los flujos de alcance pueden completarse por UI→API→base; no hay escritura clínica en simuladores; las pruebas de atomicidad, aislamiento, archivo y equivalencia tienen resultados recientes; el comparativo distingue mediciones y supuestos; las observaciones docentes están resueltas o señaladas explícitamente como pendientes, impidiendo declarar ese criterio completo. Un video, un esquema o una pantalla por sí solos no acreditan persistencia funcional.

## 9. Calendario e integración GitHub

- [Cronograma hasta el 05/11/2026](09_CRONOGRAMA_HASTA_05_NOV.md).
- [Flujo de integración y revisores](10_INTEGRACION_GITHUB.md).
