# Auditoría funcional del cierre E01

- **Fecha:** 26/10/2026, America/Guatemala
- **Alcance:** Cierre de fase E01 — Fundación hexagonal e identidad; verificación de 6 tareas integradas.
- **Tipo:** Funcional y de integración hexagonal; validación de UoW, transacciones por motor y autenticación institucional.
- **Autorización:** Solicitud de usuario para proceder con la ejecución del plan hacia la meta E02 aplicando la skill functional-requirements-auditor.
- **Entorno:** Local aislado con datos sintéticos; contenedores Docker para PostgreSQL y MySQL; contenedor replica set temporal para MongoDB; emulador local de Firebase Auth y Firestore (`demo-bdii-pediatria`).
- **Código base verificado:** `origin/develop` `465cb89`.

## 1. Resumen ejecutivo

- **Unidades inventariadas:** 8 componentes clave (Backend y Frontend), con 236 pruebas de software verificadas en total:
  - 5 pruebas de integración en motores reales (2 SQL, 3 NoSQL).
  - 165 pruebas backend (133 unitarias/runtime y 32 contractuales).
  - 66 pruebas frontend (28 cliente HTTP/sesión y 38 de alcance de producto).
  - Detalle en [inventario.csv](inventario.csv).
- **Requisitos E01 trazados:** 6 requisitos de fase (F-E01-01 a F-E01-06), cubiertos al 100% en [trazabilidad.csv](trazabilidad.csv).
- **Hallazgos abiertos:** 0.
- **Resultado de auditoría:** **PASS para el cierre de E01**.

## 2. Distinción de suites y verificación por motor

En cumplimiento de AGENTS.md, se distingue entre pruebas de integración ejecutadas contra motores y suites con repositorios en memoria/mocks:

1. **Integración SQL en motores reales (`test:integration:sql` — 2/2 PASS):**
   - **PostgreSQL:** Conexión a pool en puerto 15432; SAVEPOINT transaccional, reversión atómica ante fallo y recuperación del pool.
   - **MySQL:** Conexión a InnoDB en puerto 13306; transacciones con confirmación determinista y reversión limpia.
2. **Integración NoSQL en motores reales (`test:integration:nosql` — 3/3 PASS):**
   - **MongoDB:** ClientSession transaccional con replica set; soporte multi-documento con reversión integral de operaciones y auditorías; sin colecciones ni documentos huérfanos.
   - **Firestore (Emulador):** Transacción interactiva mediante `runTransaction`, forzando lecturas previas a escrituras; rechazo determinista de documentos superiores a 256 KB.
   - **Firebase Auth (Emulador):** Validación de token Bearer, resolución de claims canónicos y revocación.
3. **Suites unitarias y runtime en memoria / mocks (`npm test` en Backend y Frontend):**
   - Backend: 165 pruebas PASS que validan DTOs, filtros de errores HTTP, casos de uso puros y contratos OpenAPI sin requerir motores activos.
   - Frontend: 66 pruebas PASS que validan el transporte HTTP (con `fetch` simulado), sanitización de claims de autoridad (DEC07) y preservación de credenciales ante 503.
4. **Límites de fase:**
   - La persistencia integral de expedientes clínicos entre interfaz de usuario y base de datos corresponde a las fases E02–E05.
   - La UI mantiene deshabilitados los adaptadores clínicos no implementados aún mediante `requireApiAdapter` (`503 PERSISTENCIA_NO_DISPONIBLE`), impidiendo el uso accidental de mocks.

## 3. Desviaciones detectadas

Ninguna desviación funcional. Todo el código implementado corresponde a las especificaciones contractuales de la fase E01.

## 4. Conclusión

La fase E01 cumple todos los criterios de aceptación y queda lista para su cierre formal.
