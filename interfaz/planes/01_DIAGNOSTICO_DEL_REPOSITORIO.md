# 01 — Diagnóstico del Repositorio

**Fecha de inspección:** 19 de octubre de 2026  
**Método:** Inspección directa de archivos, estructura de directorios, `git status`, `git diff` y lectura completa de la carpeta `Agente/` y `Database/`.

---

## 1. Archivos inspeccionados y verificados

| Ruta en el repositorio | Estado verificado | Contenido real observado |
|---|---|---|
| [`Agente/AGENTS.md`](../../Agente/AGENTS.md) | Leído completo (94 líneas) | Guía general para agentes: propósito académico (URL, Bases de Datos II), asignación de 4 motores (PostgreSQL, MySQL, MongoDB, Firestore), alcance común, resumen de modelos de Entrega I y principios de arquitectura hexagonal y privacidad. |
| [`Agente/DISENO_PROYECTO.md`](../../Agente/DISENO_PROYECTO.md) | Leído completo (751 líneas) | **Documento funcional y arquitectónico canónico.** Define requisitos obligatorios vs decisiones adoptadas (§2), modelos y reglas de las 4 instituciones (§3), roles y permisos independientes (§4), arquitectura hexagonal y enrutamiento por identidad Firebase (§5.1–5.3), contrato común `/api/v1` e idempotencia (§5.5–5.7), catálogo de **53 vistas** (§8), criterios de aceptación `CA01–CA20` (§9), comparativo de diseño (§13), cambios de modelo `M01–M09` (§14), matriz de 30 grupos `F01–F15`/`I01–I15` (§15) y cierre de la fase Database (§16). |
| [`Agente/REQUERIMIENTOS_FUNCIONALES.md`](../../Agente/REQUERIMIENTOS_FUNCIONALES.md) | Leído completo (122 líneas) | Inventario estructurado de requerimientos funcionales comunes (`RF-001` a `RF-020`), por institución (`RF-H01–H09`, `RF-C01–C08`, `RF-L01–L14`, `RF-P01–P12`) y documentales (`RF-D01–D06`), distinguiendo origen académico obligatorio vs Entrega I vs diseño adoptado. |
| [`Agente/REQUERIMIENTOS_NO_FUNCIONALES.md`](../../Agente/REQUERIMIENTOS_NO_FUNCIONALES.md) | Leído completo (100 líneas) | Inventario de requerimientos no funcionales (`RNF-001` a `RNF-040`) organizados en arquitectura/portabilidad, seguridad/privacidad, consistencia/integridad, interfaz/API (`/api/v1`, UTC vs `America/Guatemala`, UUID públicos) y mantenibilidad. |
| [`Agente/design-system-clinico-v1.0.md`](../../Agente/design-system-clinico-v1.0.md) | Leído completo (550 líneas) | Versión 1.0 del Design System (secciones 1 a 13). El usuario entregó en el prompt la versión **1.1** (`design-system-clinico-v1.1-vistas-auditadas.md`), que conserva intactas las secciones 1–13 y añade la **sección 14 (Auditoría de cobertura y mapa de 53 vistas)**. La versión 1.1 se guardó íntegra en [`../referencias/design-system-clinico-v1.1-vistas-auditadas.md`](../referencias/design-system-clinico-v1.1-vistas-auditadas.md). |
| [`README.md`](../../README.md) | Leído completo (63 líneas) | Describe el estado general del repositorio: modelos de persistencia, inicializadores, Docker Compose (`postgres`, `mysql`, `mongodb`) y pruebas de `Database/` listos; indica expresamente que **Backend y Frontend están pendientes de implementación**. |
| [`Database/README.md`](../../Database/README.md) y [`Database/DICCIONARIO_SQL.md`](../../Database/DICCIONARIO_SQL.md) | Leídos | Documentan los inicializadores SQL v2 (PostgreSQL: 50 tablas; MySQL: 22 tablas), MongoDB (27 colecciones, 63 índices) y Firestore (22 rutas, 10 índices compuestos, reglas y validadores Zod). |
| `Database/hospital_general_postgresql.sql`, `Database/clinica_odontologica_mysql.sql`, `Database/laboratorio_clinico_mongodb.js`, `Database/centro_pediatrico_firestore.mjs` | Verificados | Scripts ejecutables y probados de persistencia para los cuatro motores. Incluyen `id_publico` (UUID), `revision`, tablas/colecciones de `operaciones`, `identidades_paciente` y `revisiones`. |
| `Frontend/` | Inspeccionado | Contiene **únicamente `.gitkeep` (0 bytes)**. No existe código previo, `package.json` ni configuraciones que puedan entrar en conflicto o perderse. |
| `Backend/` | Inspeccionado | Contiene **únicamente `.gitkeep` (0 bytes)**. No existe servidor HTTP aún. |
| `plan/` | Inspeccionado | Directorio vacío. |

---

## 2. Documentos externos mencionados y su disponibilidad

| Documento citado en las fuentes | ¿Presente en el repositorio? | Tratamiento aplicado |
|---|---|---|
| `design-system-clinico-v1.1-vistas-auditadas.md` | Entregado íntegro en el prompt del usuario | Archivado sin modificaciones en [`../referencias/design-system-clinico-v1.1-vistas-auditadas.md`](../referencias/design-system-clinico-v1.1-vistas-auditadas.md). Es la fuente visual canónica. |
| `Primera Entrega Proyecto (1).pdf` | **No presente** dentro del árbol del repositorio | Sus modelos, entidades, atributos y clasificación están consolidados en `Agente/DISENO_PROYECTO.md`, `Agente/AGENTS.md` y los esquemas de `Database/`. No se inventan requisitos fuera de lo documentado. |
| `Proyecto final bases II (1) (4).pdf` | **No presente** dentro del árbol del repositorio | Sus requisitos obligatorios (`F01–F15`) están desglosados y auditados en `Agente/DISENO_PROYECTO.md` (§2.1 y §15.2) y `Agente/REQUERIMIENTOS_FUNCIONALES.md`. |
| `Agente/AUDITORIA_DISENO_PROYECTO.md` | Mencionado en `DISENO_PROYECTO.md` §1 y §15.1, pero ya no está como archivo suelto | Sus 7 hallazgos (`H01–H07`) y los 30 grupos (`F01–F15`, `I01–I15`) están incorporados y cerrados documentalmente en `DISENO_PROYECTO.md` §15. |
| `Database/CIERRE_DATABASE.md` | Mencionado en `DISENO_PROYECTO.md` §16, no presente como archivo separado | Su contenido está integrado en `Database/README.md`, `Database/DICCIONARIO_SQL.md` y `.test-results/database/resultado.json`. |

---

## 3. Entorno técnico verificado

- **Sistema operativo:** macOS (`zsh`).
- **Node.js:** `v24.22.0` (cumple `>=24.12.0` requerido por `Database/package.json` y `DISENO_PROYECTO.md` §6).
- **npm:** `11.19.1`.
- **Estado de Git al iniciar:**
  - `M Agente/DISENO_PROYECTO.md`
  - `?? Agente/REQUERIMIENTOS_FUNCIONALES.md`
  - `?? Agente/REQUERIMIENTOS_NO_FUNCIONALES.md`
  - Se respetan intactos todos los cambios previos del repositorio.

---

## 4. Qué se reutiliza y cómo se organiza `interfaz/app/`

1. **Sin colisión con `Frontend/`:** Dado que `Frontend/` solo tiene `.gitkeep`, no hay dos aplicaciones compitiendo. De acuerdo con la instrucción explícita del encargo (§0.2 y §3), toda la nueva aplicación frontend, su configuración (`package.json`, `vite.config.ts`, `tsconfig.json`), mocks y pruebas se ubican en **`interfaz/app/`**, dejando `Frontend/.gitkeep` intacto hasta que en la fase final se decida enlazarlo o moverlo.
2. **Alineación con los esquemas de `Database/`:** Aunque el frontend no importa drivers de bases de datos (`pg`, `mysql2`, `mongodb`, `firebase-admin`), los tipos DTO y los mocks de `interfaz/app/src/mocks/` respetan los invariantes ya programados en `Database/`:
   - Identificadores públicos UUID (`id_publico`) separados de códigos legibles (`HC-...`).
   - Control de concurrencia optimista mediante `revision` / `version` entera.
   - Estados exactos en mayúsculas (`ACTIVO`, `ARCHIVADO`, `PROGRAMADA`, `ATENDIDA`, `CANCELADA`, `ABIERTA`, `FINALIZADA`, `BORRADOR`, `VALIDADO`, `EMITIDO`).
   - Fechas de eventos en ISO 8601 UTC (`2026-10-19T14:30:00Z`) formateadas en la interfaz bajo la zona horaria `America/Guatemala`.
   - Fechas civiles (`fecha_nacimiento`) en formato `YYYY-MM-DD` sin desplazamiento horario.
