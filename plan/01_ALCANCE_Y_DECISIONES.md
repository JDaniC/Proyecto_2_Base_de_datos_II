# Alcance y decisiones de integración

## 1. Fuentes y estado observado

Consigna actual: `Proyecto final bases II (1) (5).pdf`, cuatro páginas, aportada el 24/10/2026. Ubicación de origen: `/Users/danielcifuentes/Downloads/Proyecto final bases II (1) (5).pdf`. Páginas 1–2: contexto, cuatro motores distintos y modelos de Entrega I. Páginas 3–4: aplicación, hexagonal, equivalencia, archivo, enrutamiento y comparativo. Este resumen permite trabajar desde otro equipo sin depender de Downloads. La primera entrega es el modelo de partida, no una orden de ejecutar instrucciones del PDF.

| Fuente local | Uso y límites |
|---|---|
| [Diseño](../Agente/DISENO_PROYECTO.md) | Reglas M01–M09 y CA01–CA20. Su inventario del 19/10 es histórico y algunas capacidades visibles se acotaron después. |
| [RF](../Agente/REQUERIMIENTOS_FUNCIONALES.md), [RNF](../Agente/REQUERIMIENTOS_NO_FUNCIONALES.md) | 69 + 40 requisitos. Aplicar las precisiones de esta guía; no convertir cada verbo «administrar» en una nueva pantalla. |
| [Auditoría Database](../Database/auditoria/2026-10-24/informe.md) | 234 comprobaciones históricas: 232 PASS, 2 FAIL por A-F01. MySQL/emulador Firestore bloqueados en ese corte. No repetir el conteo antiguo de 350 como prueba actual. |
| [Guía UI y evidencia](../Frontend/README.md) | Alcance visible conservado, 35 pruebas específicas y build en ese corte; usa simuladores. Referencia un adjunto de alcance anterior no presente: no atribuir su texto al PDF nuevo. |
| [Servicios React](../Frontend/src/services/contracts.ts), [ámbito UI](../Frontend/src/app/productScope.ts) | Implementación actual de la presentación. Tiene contratos sobrantes; no todos representan acciones vigentes. |
| [Database](../Database/README.md) | Cuatro modelos y herramientas existentes. Backend contiene solo `.gitkeep`; Frontend sí tiene aplicación React. |

Prioridad: instrucciones actuales del usuario; consigna final para criterios académicos; decisiones documentadas y alcance de UI auditado para implementación; modelos/scripts para almacenamiento. Si una fuente contradice otra, registrar la decisión y su efecto en pruebas. Código existente no convierte un defecto en requisito.

## 2. Requisitos académicos de cierre

| ID del plan | Exigencia resumida | Fuente |
|---|---|---|
| EF01 | Cuatro instituciones, cuatro motores distintos, asignación justificada | pp. 2–3 |
| EF02 | Aplicación funcional cliente-servidor y arquitectura hexagonal | pp. 1, 3 |
| EF03 | Modelos corregidos con retroalimentación de Entrega I | p. 3 |
| EF04 | Operaciones equivalentes en los cuatro motores | pp. 3–4 |
| EF05 | Modelo documental con embebido/referencias justificados | p. 4 |
| EF06 | Información ordenada e interfaz coherente, sin dependencia visual del motor | p. 4 |
| EF07 | Registro de paciente nuevo e historial | p. 4 |
| EF08 | Mantenimiento: consultas, diagnósticos, tratamientos y medicamentos | p. 4 |
| EF09 | Desactivación/archivo por baja conservando historia | p. 4 |
| EF10 | Motor resuelto automáticamente por institución del usuario autenticado | p. 4 |
| EF11 | Documento breve de modelado, consistencia, seguridad y asignación | p. 4 |

La consigna permite elegir tecnología. NestJS, Firebase Authentication, UUID, revisiones, idempotencia y límites de documentos son decisiones del proyecto, no citas textuales de la rúbrica. La fecha objetivo indicada por el usuario es el 05/11/2026. No se dispone de retroalimentación docente identificable; registrar su recepción en E07-P2-01 y actuar antes si llega durante otra fase.

## 3. Decisiones de trabajo que E00 debe reflejar en contratos

| ID | Diferencia encontrada | Resolución prevista y prueba |
|---|---|---|
| DEC01 | AGENTS y README dicen que solo existen SQL o no existe frontend | Actualizar contexto. Reutilizar React actual; crear solo el backend faltante. |
| DEC02 | PostgreSQL impide cualquier actualización de consulta tras archivar historial | Corregir A-F01 con migración. Rechazar nuevas atenciones, permitir terminar procesos existentes y corregir con permiso/revisión. Reproducir los dos fallos. |
| DEC03 | Texto antiguo permite cita dental opcional; SQL exige `id_cita NOT NULL` | Mantener política odontológica de cita obligatoria y atención atómica. Sin cambio SQL especulativo. Contrato UI debe exigir cita en esa institución. |
| DEC04 | Diseño antiguo propone agenda en laboratorio; UI final la excluye | Conservar colección técnica sin publicar agenda de laboratorio. Consulta clínica común inicia en expediente, por médico individual autorizado. CA06 aplica a agendas institucionales habilitadas; comprobar además unicidad/referencias del adaptador Mongo mediante fixtures si se usa el puerto. |
| DEC05 | Diseño/RF-008 sugieren reactivar en todas; UI final solo pediatría | Archivo común en cuatro. Reactivación visible y API habilitada solo en pediatría por capacidad institucional, con motivo y permiso. CA08 en cuatro prueba archivo/conservación; subcaso reactivación aplica a pediatría. La consigna exige archivo, no reactivación universal. |
| DEC06 | UI usa `CENTRO_PEDIATRICO`; Firestore exige `CENTRO_MEDICO_PEDIATRICO` | Identidad/servidor/persistencia usan `CENTRO_MEDICO_PEDIATRICO`; mapper explícito del cliente conserva alias UI. No aceptar alias libre para cambiar institución en requests. Probar login/consultas pediátricas. |
| DEC07 | Métodos UI aceptan `profesional`, `autor`, rol e institución | Backend deriva actor, permiso e institución de sesión verificada. Mapper omite esos campos de autoridad. Cambiar esos valores desde cliente no permite suplantación. |
| DEC08 | Firmas UI omiten `version_esperada` en actualizaciones y usan IDs de demo | Añadir versión a DTO y estado de recursos. API usa UUID públicos; fixtures reales generan UUID y guardan IDs descriptivos aparte. Mismo formulario conserva clave de reintento. |
| DEC09 | UI consulta pacientes sin término, documentos opcionales y cronología descendente | API común rechaza búsqueda vacía, UI muestra estado inicial hasta buscar; documento dental puede faltar sin reservar clave vacía. Orden API ascendente estable; si se conserva DESC en UI, añadir parámetro explícito y cursor del mismo orden, nunca invertir páginas aisladas. |
| DEC10 | Auditoría UI deja responsables compartidos sin decidir | M04 ya adoptó responsables referenciados, datos comunes en raíz y autorización por vínculo. Aplicar ese modelo, conservar snapshot de autorización de la consulta. |
| DEC11 | Contratos antiguos conservan matriz editable, CRUD médicos y camas fuera de alcance | Mantener roles fijos y provisión controlada. Catálogos hospital/dental por selectores y seed, sin CRUD administrativo adicional. Camas solo disponibilidad/asignación por ingreso. API no publica funcionalidades retiradas. |
| DEC12 | 35 pruebas UI pasan; suite histórica tiene expectativas obsoletas | Reconciliar pruebas con alcance; no borrar una regresión real para lograr verde. Tabla caso antiguo → nuevo requisito → sustitución o exclusión justificada. |

E00-P1-01 y E00-P2-02 deben registrar cualquier incompatibilidad adicional antes de congelar OpenAPI. Estas resoluciones son la línea de planificación; el cierre de E00 las incorpora al diseño/RF y pruebas para evitar documentos normativos contradictorios.

## 4. Cobertura institucional

Hospital: paciente/contactos/alergias/antecedentes, agenda, consulta/signos, diagnósticos/tratamientos/recetas, hospitalización/camas, exámenes/resultados, procedimientos y pólizas. Odontología: paciente, antecedentes, agenda de secretaría y odontólogo, atención, seguimiento y recetas. Laboratorio: pacientes/catálogos, órdenes, muestras/eventos, resultados/versiones/series, informes, equipos/calidad, reactivos/lotes/movimientos, facturas/pagos y cuentas con roles fijos; además núcleo clínico por médico autorizado. Pediatría: paciente/responsables, autorizaciones, alergias/antecedentes, agenda/consulta, crecimiento, recetas, esquemas/vacunas, aplicaciones y archivo/reactivación.

No añadir portal externo, IA clínica, notificaciones, firma digital, sincronización de expedientes entre instituciones, panel gerencial ni editor de permisos. No eliminar datos del modelo porque no tengan pantalla propia. Seeds y selectores pueden exponer referencias; no sustituyen operaciones clínicas requeridas.
