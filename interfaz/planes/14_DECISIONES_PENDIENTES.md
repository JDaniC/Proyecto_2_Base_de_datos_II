# 14 — Decisiones Pendientes y Resolución de Discrepancias (§14.3)

**Fecha:** 19 de octubre de 2026  
**Propósito:** Documentar de forma transparente las discrepancias identificadas en la sección 14.3 de [`../referencias/design-system-clinico-v1.1-vistas-auditadas.md`](../referencias/design-system-clinico-v1.1-vistas-auditadas.md) frente a [`Agente/DISENO_PROYECTO.md`](../../Agente/DISENO_PROYECTO.md), indicando si bloquean o no la unidad actual (`U01` / `V01`) y cuál es la recomendación técnica antes de construir las unidades afectadas.

> **Estado frente a `U01` (`V01` — Inicio de sesión):** **Ninguna decisión pendiente bloquea `V01`.** Las decisiones `DEC-01` a `DEC-04` afectan a las unidades `U04` (`V04`), `U05` (`V07`) y `U06` (`V08`/`V09`). Se presentan aquí con alternativas claras y comportamiento por defecto fiel al contrato para que el usuario las confirme antes de llegar a esas unidades.

---

## `DEC-01` — Comportamiento inicial y modo de búsqueda de pacientes en `V04` (Afecta `U04`)

- **Conflicto detectado:**
  - **Fuente A (`DISENO_PROYECTO.md` §5.6 `BuscarPacientes`):** Define búsqueda por identificación exacta o prefijo de nombre normalizado y establece que la **búsqueda vacía es inválida** (para evitar exposición masiva de expedientes).
  - **Fuente B (`Design System v1.1` Pantalla 02 / §14.3):** El mockup visual aprobado muestra una tabla inicial con pacientes al abrir la pantalla y búsqueda por nombre/CUI/código.
- **Alternativas:**
  1. **Opción A (Recomendada — Híbrida fiel al contrato y a la UX aprobada):** Mostrar la estructura exacta de Pantalla 02 con una bandeja inicial acotada de «Expedientes consultados recientemente en la sesión / Pacientes con cita hoy» y exigir al menos 2 caracteres de prefijo de nombre o identificación exacta al consultar el buscador general, mostrando sugerencias rápidas de datos sintéticos en modo demostración.
  2. **Opción B (Contrato estricto puro):** Abrir `V04` con estado vacío informativo («Ingrese identificación exacta o prefijo del nombre para buscar») sin listar ningún paciente hasta que se envíe una consulta no vacía.
  3. **Opción C (Ampliar contrato):** Permitir `GET /pacientes` sin parámetro `q` paginado por fecha de creación para roles autorizados.
- **Estado:** `PROPUESTA / PENDIENTE DE APROBACIÓN` (No bloquea `U01`–`U03`; se adoptará Opción A por defecto en `U04` salvo instrucción distinta).

---

## `DEC-02` — Controles de paginación en `V04` y listados clínicos (Afecta `U04` y `U05`)

- **Conflicto detectado:**
  - **Fuente A (`DISENO_PROYECTO.md` §5.6):** La API utiliza paginación por **cursor opaco** (`cursor`, `siguiente_cursor`, límite 1–100, por defecto 20) sin contar el total de registros en los cuatro motores.
  - **Fuente B (`Design System v1.1` Pantalla 02 / Componente 16):** El mockup de referencia mostraba números de página («Página 1 de Y»).
- **Alternativas:**
  1. **Opción A (Recomendada — Paginación por cursor con historial de páginas visitadas):** Usar el estilo visual aprobado del componente `Pagination` (`#DDEFE9` para la página activa, radio `12px`), navegando con `Anterior` / `Siguiente` mediante la pila de cursores opacos devueltos por el servicio y mostrando los números de las páginas ya recorridas (ej. `Página 1`, `2`, `Siguiente →`) sin inventar un conteo total inexistente en Firestore/MongoDB.
  2. **Opción B (Añadir conteo total al contrato):** Exigir que los 4 motores calculen `total_registros` en cada búsqueda. (Impacto negativo en lecturas de Firestore).
- **Estado:** `PROPUESTA / PENDIENTE DE APROBACIÓN` (Recomendada Opción A).

---

## `DEC-03` — Orden cronológico del Timeline en `V07` (Afecta `U05`)

- **Conflicto detectado:**
  - **Fuente A (`DISENO_PROYECTO.md` §5.6):** Establece ordenar la cronología por `fecha_hora` **ascendente** e `id_publico` como desempate en el contrato común.
  - **Fuente B (`Design System v1.1` Componente 25 / Pantalla 03):** Define para el `Clinical Timeline` una presentación vertical **descendente** (eventos más recientes primero para uso clínico rápido).
- **Alternativas:**
  1. **Opción A (Recomendada — Contrato ascendente estable + selector explícito de orden visual):** Mantener en el contrato y repositorio el soporte determinista `(fecha_hora, id_publico)` con parámetro explícito `orden: 'ASC' | 'DESC'`, mostrando por defecto en el componente visual `Clinical Timeline` los eventos más recientes arriba (como se aprobó en Pantalla 03) con un selector visible «Más recientes primero / Cronológico desde apertura (contrato ASC)» para poder demostrar ambos en la evaluación académica (`CA07`).
  2. **Opción B (Solo ascendente en UI):** Mostrar siempre los eventos más antiguos arriba en `V07`.
- **Estado:** `PROPUESTA / PENDIENTE DE APROBACIÓN` (Recomendada Opción A).

---

## `DEC-04` — Nombres de estados de citas en `V08` y `V09` (Afecta `U06`)

- **Conflicto detectado:**
  - **Fuente A (`DISENO_PROYECTO.md` §5.7 y esquemas `Database/`):** Los estados contractuales y validados por `CHECK`/validadores en los cuatro motores son exactamente **`PROGRAMADA`**, **`ATENDIDA`** y **`CANCELADA`**.
  - **Fuente B (`Design System v1.1` Pantalla 05):** El mockup preliminar usó las etiquetas «Pendiente / Confirmada / Cancelada».
- **Resolución conforme a la jerarquía de fuentes (§1 del Prompt Maestro y §14.3 del Design System v1.1):**
  - El propio Design System v1.1 (§14.3, Hallazgo 1) ordena: *«Unificar etiqueta, filtro, estado y transiciones; no inventar un estado CONFIRMADA sin actualizar contrato»*.
  - Por tanto, en `U06` (`V08`/`V09`) se utilizarán exclusivamente los estados contractuales **`PROGRAMADA`**, **`ATENDIDA`** y **`CANCELADA`** tanto en los DTOs como en los filtros y badges de la interfaz.
- **Estado:** `RESUELTA POR JERARQUÍA DE FUENTES` (Documentada para trazabilidad).
