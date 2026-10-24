# 05 — Design System v1.1 y Mapa de los 27 Componentes

**Fecha:** 19 de octubre de 2026  
**Fuente canónica:** [`../referencias/design-system-clinico-v1.1-vistas-auditadas.md`](../referencias/design-system-clinico-v1.1-vistas-auditadas.md) (§§2–12).

---

## 1. Reglas visuales innegociables aplicadas en código (`tokens.css`)

1. **Exclusivamente Light Mode:** `color-scheme: light;` tanto en `:root` como dentro de `@media (prefers-color-scheme: dark)`.
2. **Paleta semántica exacta:**
   - `--color-primary: #20666B` (contraste 6.62:1 sobre blanco)
   - `--color-strong: #0C3B45` (texto principal y títulos, contraste 12.16:1 sobre blanco)
   - `--color-text-secondary: #466462` (contraste 6.44:1 sobre blanco y 5.81:1 sobre `#EDF5F1`)
   - `--color-accent: #3E9B94` (solo iconos/detalles decorativos, **prohibido** en texto pequeño sobre blanco por tener 3.32:1)
   - `--color-background: #FFFFFF`, `--color-background-alt: #F7FAF9`, `--color-panel: #F8FBF9`
   - `--color-control: #EDF5F1`, `--color-selection: #DDEFE9`
   - `--color-border: #DEEAE5`, `--color-border-panel: #E0EAE6`, `--color-divider: #E5EEEA`
3. **Geometría y tamaños:**
   - Botones: radio **`16px`** (explícitamente **no píldora**), altura estándar **`40px`** (`36px` sm, `48px` lg).
   - Inputs, Selects y Date/Time Pickers: fondo `#EDF5F1`, radio **`12px`**, altura **`48px`**.
   - Textarea: fondo `#EDF5F1`, radio **`12px`**, altura mínima inicial **`120px`**, crecimiento hasta `320px`.
   - Paneles sutiles: fondo `#F8FBF9` o `#FFFFFF`, borde `1px solid #E0EAE6`, radio **`16px`**, sin sombra pesada.
   - Modales: fondo `#FFFFFF`, radio **`20px`**, ancho `440–520px`.
   - Toasts: posición **`bottom-center`** (inferior centrada), contenido centrado, fondo `#FFFFFF`, radio **`14px`**.
   - Tabs: fondo blanco con **línea inferior activa de `3px` en `#20666B`**, sin relleno de fondo en la pestaña.

---

## 2. Inventario maestro de los 27 componentes aprobados y plan de construcción

Los componentes se codifican en `interfaz/app/src/design-system/components/` a medida que las unidades del roadmap los necesitan, evitando código muerto sin probar.

| Nº | Componente | Especificación técnica y accesibilidad | Estado en `interfaz/app` | Unidad donde se introduce / completa |
|---:|---|---|---|---|
| **01** | **Button** | Variantes `primary`, `secondary`, `ghost`, `danger`; tamaños `sm` (36px), `md` (40px), `lg` (48px); radio `16px`; `aria-busy` y bloqueo de clics en `loading`. | Planificado | `U01` (`V01`) |
| **02** | **Alert** | Variantes `info`, `success`, `warning`, `danger`, `neutral`; fondos suaves (`#E8F6F3`, `#EAF7EE`, `#FFF8E9`, `#FFF0EE`, `#EDF0EF`); `role="alert"` / `role="status"`. | Planificado | `U01` (`V01`) |
| **03** | **Skeleton Loader** | Bloques `#E7EFEC` y `#F0F5F3` con `aria-hidden="true"` dentro de contenedor con `aria-busy="true"`; respeta `prefers-reduced-motion`. | Planificado | `U02` (`V19`) |
| **04** | **Input / TextField** | Fondo `#EDF5F1`, radio `12px`, alto `48px`; `<label>` siempre visible asociada por `id`; texto de ayuda y mensaje de error vinculados con `aria-describedby` y `aria-invalid`. | Planificado | `U01` (`V01`) |
| **05** | **Select** | Fondo `#EDF5F1`, radio `12px`, alto `48px`; `<label>` asociada, soporte de teclado nativo y estado de error/ayuda. | Planificado | `U01` (`V01`) |
| **06** | **Textarea** | Fondo suave, radio `12px`, `min-height: 120px`, auto-expansión hasta `320px`, contador opcional y validación accesible. | Planificado | `U05` (`V14`) / `U07` (`V10`) |
| **07** | **Switch** | `50 × 29 px`, radio píldora (`9999px`), activo `#20666B`, inactivo `#D5E2DE`, `role="switch"`, `aria-checked`. | Planificado | `U01` (`V01` simulador) |
| **08** | **Checkbox / Radio** | `20 × 20 px` (Checkbox radio `6px`, Radio `50%`), color activo `#20666B`, área táctil $\ge 44\text{ px}$ con etiqueta explícita. | Planificado | `U01` (`V01` selección de cuenta) |
| **09** | **Badge / Status** | Radio píldora (`9999px`), variantes semánticas suaves + punto indicador opcional y texto explícito (nunca solo color). | Planificado | `U01` (`V01`) |
| **10** | **DataTable** | Superficie blanca, filas separadas por `#E5EEEA` (**nunca tarjetas por fila**), cabeceras claras, ordenación accesible y estados integrados (`loading`, `empty`, `no-results`, `error`). | Planificado | `U04` (`V04`) |
| **11** | **Modal / Dialog** | Blanco, radio `20px`, `440–520px`, `role="dialog"`, `aria-modal="true"`, trampa de foco, cierre con `Escape` y restauración de foco al disparador. | Planificado | `U01` (`V01` ayuda de acceso) |
| **12** | **Sidebar** | Blanco `#FFFFFF`, ancho `240px` expandido / `72px` compacto, ítem activo `#DDEFE9` con texto `#0C3B45`, drawer en `< 1024px`. Filtra ítems por institución y rol. | Planificado | `U02` (Shell) |
| **13** | **Header / Topbar** | Blanco `#FFFFFF`, alto `64px`, insignia de institución activa, indicador de modo demostración, buscador contextual y menú de sesión. | Planificado | `U02` (Shell) |
| **14** | **Date Picker / Time Picker** | Fondo `#EDF5F1`, radio `12px`, alto `48px`; selector mensual emergente; hora en formato **24 h** con intervalos de **15 min**. | Planificado | `U04` (`V05`) / `U06` (`V09`) |
| **15** | **Tabs** | `role="tablist"`, `role="tab"`, `role="tabpanel"`, fondo blanco, borde inferior activo de **`3px` `#20666B`**, navegación con flechas izquierda/derecha. | Planificado | `U01` (`V01` filtro por institución en demo) |
| **16** | **Pagination** | Controles discretos con radio `12px`, activo `#DDEFE9`, soporte de cursor opaco (`Siguiente` / `Anterior`) conforme al contrato `/api/v1`. | Planificado | `U04` (`V04`) |
| **17** | **Tooltip** | Blanco `#FFFFFF`, texto `#0C3B45`, borde `#DEEAE5`, radio `10px`, `14px`; activado por hover y `:focus-visible`; solo para ayuda complementaria. | Planificado | `U03` / `U05` |
| **18** | **Cards & Panels** | Componente `Panel` en `#F8FBF9` o `#FFFFFF`, borde `#E0EAE6`, radio `16px`, para agrupar bloques semánticos (nunca filas individuales). | Planificado | `U01` (`V01`) |
| **19** | **Empty / Error States** | Panel sutil `#F8FBF9`, icono lineal, título claro, explicación accionable, código de correlación opcional y botón de acción/reintento. | Planificado | `U02` (`V02`, `V19`) |
| **20** | **Toast Notification** | Posición fija **`bottom-center`**, contenido centrado, fondo `#FFFFFF`, borde `#DEEAE5`, radio `14px`, región viva `aria-live="polite"`. | Planificado | `U01` (`V01`) |
| **21** | **Progress Bar** | Pista `#DCEBE6`, barra `#20666B`; modo determinado (solo cuando el porcentaje es medible, como pasos de Stepper) y modo indeterminado accesible en cargas. | Planificado | `U01` (`V01`) |
| **22** | **Stepper** | Barra de progreso superior (`ProgressBar`), indicadores de los 4 pasos + revisión final, validación por paso y conservación de estado al retroceder. | Planificado | `U07` (`V10`) |
| **23** | **Accordion** | Encabezado abierto `#F8FBF9`, cuerpo blanco, radio `16px`, **`aria-expanded` con apertura múltiple simultánea**. | Planificado | `U05` (`V06`) |
| **24** | **Dropdown / Action Menu** | Menú blanco `200–240px`, radio `12px`, navegación con flechas y `Escape`, acciones destructivas separadas en `#A5281D` con confirmación previa. | Planificado | `U04` (`V04`) |
| **25** | **Clinical Timeline** | Línea vertical `2px` `#DCEBE6`, nodos en `#20666B`, paneles suaves `#F8FBF9` expandibles simultáneamente, filtros por tipo y fecha. | Planificado | `U05` (`V07`) |
| **26** | **Agenda / Calendar** | Selector de semana con flechas, **vista diaria y semanal** (nunca mes completo como vista principal), filas cronológicas con estado y panel lateral de detalle. | Planificado | `U06` (`V08`) |
| **27** | **Search + Advanced Filters** | Buscador `#EDF5F1` + botón «Filtros» que despliega panel `#F8FBF9`, chips de filtros activos, botón «Limpiar filtros» y recuento/estado de resultados. | Planificado | `U04` (`V04`) |
