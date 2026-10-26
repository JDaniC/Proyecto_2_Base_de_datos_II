# Auditoría funcional del cierre E00

- **Fecha:** 25/10/2026, America/Guatemala
- **Alcance:** puerta de fase E00 y herramientas/evidencias que la demuestran; no auditoría de la aplicación completa
- **Tipo:** funcional; revisión de seguridad acotada a aislamiento de pruebas, permisos de base y secretos temporales
- **Autorización:** solicitud de Daniel para continuar con la siguiente fase de trabajo y aplicar la skill de auditoría de requisitos
- **Entorno:** ejecución local con datos sintéticos; PostgreSQL/MySQL/MongoDB temporales; Firestore/Auth Emulator en `demo-bdii-cierre`; Docker con proyecto aleatorio propio. Ninguna base o proyecto real fue destino.
- **Código base probado:** `origin/develop` `3196160`; los cambios de este cierre son documentales.

## 1. Resumen ejecutivo

- **Unidades inventariadas:** 38 funciones/métodos Python; 17 unidades JavaScript enumeradas manualmente; 40 pruebas de regresión/arnés identificadas (8 Python y 32 Node). El inventario Python completo está en [inventario-python.csv](inventario-python.csv) y el JavaScript en [inventario-javascript.md](inventario-javascript.md).
- **Requisitos E00 trazados:** 6, cada uno con evidencia reproducible en [trazabilidad.csv](trazabilidad.csv).
- **Hallazgos funcionales abiertos:** 0. Se aclaró una ambigüedad documental en los tres documentos del plan: “flujo requerido no implementado” se refiere al alcance E00; los flujos CA de backend continúan para E01–E06.
- **Resultado de auditoría:** **PASS para los criterios de E00**.

Las seis tareas están integradas en `develop`. PostgreSQL, MySQL, MongoDB y Firestore se volvieron a verificar; el contrato v1 y el mapa UI pasaron validación; y el arnés continúa declarando como `NOT_IMPLEMENTED` los comportamientos de la aplicación que aún no tienen backend. Por eso el resultado no afirma que la aplicación cliente-servidor esté implementada.

## 2. Inventario y cobertura

El inventario generado por `function_inventory.py` cubre los cuatro scripts Python de verificación/contrato y la suite Python de regresión contractual. La lista manual JavaScript enumera las funciones del guard de destino, los validadores de resultado y la matriz de aceptación. Se inspeccionaron también las diez pruebas PostgreSQL, los 19 grupos locales por motor, las 12 comprobaciones Docker y los 32 casos Node.

El campo `TODO` del inventario marca `main`, `pg` y `mysql` en `Database/docker/verificar.py` por una coincidencia textual de `pass` dentro de nombres de variables `*_password`; la búsqueda manual de `TODO|FIXME|NotImplementedError|pass$` en las unidades auditadas no encontró marcadores pendientes. Se conserva como falso positivo del inventariador, sin cambiar el código.

| Componente / unidad | Riesgo | Requisitos | Pruebas existentes y ejecutadas | Estado |
|---|---|---|---|---|
| Verificador local PostgreSQL/MySQL/MongoDB/Firestore | CRITICAL / HIGH | F-E00-02, F-E00-03 | 19 grupos PASS: PG 8, MySQL 6, MongoDB 3, Firestore 2 | PASS |
| Verificador Docker | CRITICAL | F-E00-03, F-E00-06 | 12/12: arranque, bootstrap, permisos, persistencia y limpieza | PASS |
| Reproductor PostgreSQL A-F01 | CRITICAL | F-E00-02 | AUD-PG-01–10: 10/10 | PASS |
| Validador OpenAPI/UI | CRITICAL / MEDIUM | F-E00-04 | OpenAPI 3.1.0, 22 rutas, 26 operaciones, 99 esquemas, 230 fixtures y 117 métodos UI | PASS |
| Guard de destino y formato de resultados | HIGH / MEDIUM | F-E00-05, F-E00-06 | 17 pruebas Node; rechaza remoto/compartido y resultados vacíos como PASS | PASS |
| Contextos y matriz CA01–CA20 | HIGH | F-E00-05 | 15 pruebas Node; 32/32 total al incluir los otros archivos | PASS |
| Flujos HTTP y persistencia del backend | CRITICAL / HIGH | CA01–CA20 | 76 filas del arnés: 45 NOT_IMPLEMENTED, 31 NOT_APPLICABLE, 0 PASS | NOT_IMPLEMENTED, esperado en E00 |

La matriz de categorías aplicables cubre entradas ausentes/tipo incorrecto y límites de destino, transiciones de resultado, errores de preparación/limpieza, persistencia y rollback de prueba, idempotencia/carreras de cama y cita, forma de resultados, destinos de integración y fechas de fixture. La ejecución dinámica contra API/identidad y UI→API→BD no aplica aún: el servidor y los adaptadores pertenecen a E01–E06.

## 3. Matriz de trazabilidad requisito → código → prueba

La matriz completa está en [trazabilidad.csv](trazabilidad.csv). Las seis filas están cubiertas por implementación de la herramienta/documentación y pruebas actuales. Ningún endpoint HTTP se marcó como implementado.

| Requisito | Fuente | Código / unidad | Prueba | Estado |
|---|---|---|---|---|
| Cerrar E00 solo tras integrar sus seis tareas | Plan maestro §3; plan/06; plan/11 | PR #4, #7, #11, #13, #15, #17; `origin/develop` | `gh pr view`; los seis merge commits son ancestros de `3196160` | CUBIERTO |
| Corregir archivo PostgreSQL y preservar historia/revisión | E00-P1-02; RF-008/013; CA08 | `validar_relaciones_clinicas()` en `Database/hospital_general_postgresql.sql:680`; migración `001` | `AUD-PG-01–10`; regresiones 33+8; migración v2→v3; carrera de cama | CUBIERTO |
| Hacer ejecutables los cuatro entornos de ensayo | E00-P2-01; RNF-017/020/021/037; CA19 | `Database/tests/verificar_local.py`; `Database/docker/verificar.py` | 19 grupos locales PASS y 12 comprobaciones Docker PASS | CUBIERTO |
| Validar contrato común y mapa exacto de UI | E00-P1-03; E00-P2-02; RF-015/017/018/020 | `Backend/scripts/validar_contrato.py:47`; OpenAPI; documentación de contratos UI | 230 fixtures PASS; 117 métodos mapeados (96 vigentes); prueba representativa abajo | CUBIERTO |
| Parametrizar CA01–CA20 sin inventar resultados | E00-P2-03; plan/04 §2, §4; RNF-039 | `suite-aceptacion.mjs:61,113,163`; `resultado.mjs:17` | `node --test Backend/tests/contratos/*.test.mjs`: 32 PASS; resumen 45 NOT_IMPLEMENTED / 31 NOT_APPLICABLE | CUBIERTO |
| Bloquear destinos reales/compartidos y limpiar recursos propios | AGENTS.md §Persistencia y verificación; E00-P2-01/03 | `entorno-aislado.mjs:17,65`; verificadores local y Docker | pruebas remotas/compartidas/host inválido; limpieza de éxito/fallo; proyectos demo | CUBIERTO |

### Ejemplo común y mapa a la UI

El fixture sintético `consultaCompleta-valido` valida `operationId: consultaCompleta` en `POST /api/v1/consultas/completas`, con un UUID de paciente de prueba, motivo “Seguimiento sintético”, diagnóstico y tratamiento académicos. El esquema común es `ConsultaCompleta` (`Backend/docs/openapi.yaml:891,2337`). El mapa UI fila 44 enlaza `NewConsultationWizardPage.tsx:405` con `consultationRepository.registrarConsultaCompleta` y ese endpoint (`Frontend/docs/CONTRATOS_Y_DIFERENCIAS_UI.md:281`). El DTO HTTP omite el profesional enviado por la capa simulada; la autoridad la deriva el servidor cuando exista (DEC07). El validador confirma que los 117 métodos coinciden exactamente con el mapa, sin afirmar ejecución de servidor.

## 4. Desviaciones detectadas

No hay desviaciones funcionales abiertas en el alcance E00. Antes de esta revisión, la frase genérica de cierre podía interpretarse como que los 45 casos de backend `NOT_IMPLEMENTED` bloqueaban E00, aunque el plan maestro define E00 por corrección PostgreSQL, entornos y contrato, y E00-P2-03 declara que el backend aún no existe. Se aclaró en `plan/00_PLAN_MAESTRO.md` y en ambos archivos de tareas E00: esa frase aplica a entregables E00; CA01–CA20 ejecutables siguen para E01–E06. La aclaración no convierte los casos en PASS ni cambia el alcance del producto.

## 5. Hallazgos confirmados

Ningún hallazgo funcional confirmado. La ambigüedad documental se corrigió antes de preparar el cierre; no quedan acciones correctivas pendientes.

## 6. Pruebas añadidas / propuestas

No se añadieron pruebas al producto. Se ejecutó cobertura existente del cierre:

| Archivo / comando | Objetivo | Resultado |
|---|---|---|
| `python3 Database/tests/verificar_local.py --motores postgres mysql mongo firestore --evidencias .test-results/e00-cierre/local` | Motores temporales, regresiones, migración, carrera y Firestore/Auth Emulator | 19 grupos PASS; procesos y datos temporales eliminados |
| `python3 Database/auditoria/2026-10-24/reproducir_postgresql.py` | Casos de archivo A-F01 y permisos de aplicación en cluster temporal | 10/10 PASS |
| `python3 Database/docker/verificar.py` | Compose aislado, permisos, persistencia y limpieza | 12/12 PASS; proyecto aleatorio eliminado |
| `/tmp/e00-p1-03-venv/bin/python Backend/scripts/validar_contrato.py` | OpenAPI, fixtures y mapa de métodos UI | PASS; 99 esquemas, 230 fixtures, 117 métodos |
| `node --test Backend/tests/contratos/*.test.mjs` | Guardas, resultados, fixtures y matriz CA | 32 PASS, 0 FAIL |
| `node Backend/tests/contratos/suite-aceptacion.mjs --resumen` | Registrar honestamente el estado del backend | 76 filas: 45 NOT_IMPLEMENTED, 31 NOT_APPLICABLE, 0 PASS |
| `/tmp/e00-p1-03-venv/bin/python -m unittest discover -s Backend/scripts -p 'test_*.py'` | Regresiones de contrato | 8 PASS |

La primera invocación de las pruebas Python de contrato con el Python global no tenía PyYAML y no pudo importar la suite; se repitió con el entorno virtual documentado y pasaron 8 pruebas. Una invocación puntual del test de PR desde la raíz tampoco resolvió el módulo local; se repitió con discovery desde `scripts/github`, con 14/14 PASS, dentro de los 34 tests de workflow que también pasaron. Fueron ajustes de contexto de ejecución, no fallos funcionales.

## 7. Bloqueos

No hay bloqueo de motor, regresión PostgreSQL ni requisito contractual E00 pendiente. La revisión automática del PR #20 terminó sin hallazgos sobre `b80410f`, y el cierre se integró en `develop` como `566e75c`; esta actualización registra el estado de fase `HECHA`. Los escenarios de producto sin backend no son un bloqueo E00: quedan visibles como `NOT_IMPLEMENTED` y deben implementarse en las fases posteriores correspondientes.

## 8. Matriz final de resultados

| ID | Unidad | Categoría | Resultado | Evidencia |
|---|---|---|---|---|
| F-E00-01 | Integración de las seis tareas | Integración | PASS | PR #4/#7/#11/#13/#15/#17 MERGED y commits en develop |
| F-E00-02 | Archivo PostgreSQL / migración | Integridad y transiciones | PASS | AUD-PG-01–10, 33+8 regresiones, migración y carrera |
| F-E00-03 | Cuatro motores de ensayo | Dependencias / persistencia | PASS | 19 grupos locales y 12 checks Docker |
| F-E00-04 | OpenAPI y mapa UI | Tipos / salida / trazabilidad | PASS | 99 esquemas, 230 fixtures, 117 métodos |
| F-E00-05 | Arnés CA01–CA20 | Resultado / aplicabilidad | PASS | 32 tests; 45 `NOT_IMPLEMENTED`, 31 `NOT_APPLICABLE` |
| F-E00-06 | Aislamiento de entorno | Destino / limpieza / secretos | PASS | guardas Node, emulador `demo-*`, Docker aleatorio y cleanup |
| CA01–CA20 runtime | API y persistencia de aplicación | Comportamiento del producto | NOT_IMPLEMENTED | Backend aún no existe; ver resumen generado del arnés |

## 9. Riesgos residuales

- No hay servidor ni adaptadores de persistencia implementados; E00 demuestra preparación, no uso real desde UI.
- Autenticación HTTP, autorización por identidad y persistencia UI→API→motor permanecen sin demostrar hasta E01–E03. La revisión de seguridad de este informe cubre solo destinos de ensayo, permisos de sus cuentas y exposición de secretos; no es auditoría de seguridad del backend futuro.
- La retroalimentación docente sigue `PENDIENTE DE FUENTE` para E07; no impide el cierre E00.

## Revisión de seguridad acotada

**CRITICAL 0 | HIGH 0 | MEDIUM 0 | LOW 0 | INFO 0 | candidatos pendientes 0.** No se encontró vulnerabilidad confirmada en las fronteras de prueba revisadas.

Los tests Node demuestran rechazo de host remoto, base compartida y hostname no literal antes de preparar recursos; Firestore exige loopback, proyecto `demo-bdii-test-<runId>` y emulador coincidente. Los verificadores locales usan directorios/puertos temporales. Docker usa un nombre de proyecto aleatorio y al final comprueba que eliminó solo sus recursos. El contenedor temporal crea secretos de prueba con permisos `0600`; los fixtures no incluyen campos de credenciales. Las pruebas de permisos verifican cuentas de aplicación separadas de administración.

La superficie de login/token y los endpoints privados está `NOT_IMPLEMENTED`, así que autenticación y BOLA no se marcaron como PASS. Para este componente de herramientas, esas categorías no aplican al runtime actual y deben auditarse con el backend en E01.
