# Design System — Plataforma de Historiales Clínicos

**Versión:** 1.0 — especificaciones visuales aprobadas en revisión interactiva  
**Fecha de actualización:** 19 de octubre de 2026  
**Estado:** diseño de referencia aprobado; **implementación y pruebas técnicas pendientes**  
**Formato:** documento maestro para diseñadores, frontend, backend, QA y agentes de desarrollo

> **Decisión esencial:** sistema **exclusivamente Light Mode**. No implementar ni activar una variante oscura, aunque el navegador o el sistema operativo del usuario estén configurados en modo oscuro. Todos los ejemplos deben usar fondos blancos, verde menta muy suave y texto de alto contraste.

---

## 1. Alcance y contexto

La aplicación es una plataforma cliente-servidor de historiales clínicos compartida por cuatro tipos de instituciones, cada una con su propia infraestructura de datos. Debe conservar la **misma identidad y los mismos patrones funcionales** al cambiar de institución o motor; los módulos y permisos sí pueden variar según el contexto.

| Institución | Motor asignado en la primera entrega | Operaciones relevantes de interfaz |
|---|---|---|
| Hospital general | PostgreSQL | Pacientes, citas, consultas, signos vitales, diagnósticos, tratamientos, recetas, hospitalizaciones, exámenes, camas y seguros |
| Clínica odontológica | MySQL | Pacientes, citas, antecedentes, consultas, diagnósticos, tratamientos y recetas |
| Laboratorio clínico | MongoDB | Pacientes, órdenes, pruebas, muestras, resultados, informes y, cuando corresponda, inventarios |
| Centro médico pediátrico | Firebase | Pacientes menores, responsables, consultas, crecimiento, vacunas, tratamientos y recetas |

**Condiciones funcionales provenientes de la consigna del proyecto:**

- Alta, consulta, mantenimiento y archivo de historiales existentes.
- Registrar consultas, diagnósticos, tratamientos y medicamentos conforme a cada institución.
- La autenticación determina institución, motor y permisos; **el usuario clínico nunca elige el motor de base de datos**.
- La presentación de los datos no cambia arbitrariamente entre PostgreSQL, MySQL, MongoDB y Firebase.
- La autorización y la integridad de la información se hacen cumplir en el servidor; ocultar un control visual **no es seguridad suficiente**.

**Nota de alcance:** esta es la especificación del diseño, **no** evidencia de que exista una aplicación productiva ni de que las validaciones clínicas ya estén implementadas. Los nombres y números de los mockups son ficticios. Se distinguen abajo las decisiones **aprobadas** de los detalles **pendientes de implementación/verificación**.

## 2. Filosofía visual aprobada

1. **Elegante y moderno**, no recargado. La legibilidad y rapidez de trabajo importan más que la decoración.
2. **Light Mode obligatorio:** fondo blanco, superficies blancas o verde grisáceo casi blanco.
3. **Paneles sutiles como agrupadores funcionales**; evitar una tarjeta por campo, métrica, evento, cita o fila.
4. **Botones suavemente redondeados (16 px), no píldora**; el radio píldora se reserva para badges y switches.
5. **Jerarquía clara:** una sola acción primaria por bloque/pantalla; títulos fuertes, ayudas secundarias legibles.
6. **Consistencia visual y funcional:** apariencia y conducta reutilizables en las cuatro instituciones.
7. **Estados visibles:** vacío, error, cargando, éxito, deshabilitado, foco, validación, confirmación.
8. **La información clínica crítica es explícita**. No depender solo del color, de iconos ni de información oculta en un tooltip.
9. **Menos ruido:** separadores sutiles y espaciado antes que sombras y recuadros sucesivos.
10. **Privacidad:** evitar exhibir datos confidenciales en notificaciones, listados de uso general y capturas públicas.

Estas reglas aplican el marco de la presentación académica: **Fundamentos → Tokens → Componentes → Variantes y estados → Patrones → Consistencia visual y funcional → Documentación → Pruebas**.

---

## 3. Foundations: paleta y tokens de color

### 3.1 Paleta de origen, proporcionada por el usuario

`#DBEFE7`, `#D5EFE5`, `#CAEBDE`, `#C4E6DF`, `#ABDECF`, `#CFF0EA`, `#88C9C4`, `#3E9B94`, `#20666B`, `#0C3B45`.

Los tonos pálidos son recursos de marca, **no diez estados semánticos distintos**. Se agrupan para evitar demasiados colores equivalentes.

### 3.2 Tokens semánticos aprobados

| Token | Hexadecimal | Uso principal |
|---|---|---|
| `color.primary` | `#20666B` | Botones principales, enlaces de acción, progreso |
| `color.primaryStrong` | `#0C3B45` | Hover primario opcional, texto principal, títulos |
| `color.accent` | `#3E9B94` | Detalles e iconos decorativos; **no** texto pequeño sobre blanco |
| `color.accentLight` | `#88C9C4` | Indicadores secundarios y acentos |
| `color.page` | `#FFFFFF` | Fondo principal de aplicación |
| `color.pageAlt` | `#F7FAF9` | Fondos secundarios o zona de trabajo |
| `color.panel` | `#F8FBF9` | Paneles sutiles y áreas agrupadas |
| `color.control` | `#EDF5F1` | Inputs, Selects, buscadores y controles de fondo suave |
| `color.selection` | `#DDEFE9` | Sidebar seleccionado, paginación activa |
| `color.text` | `#0C3B45` | Texto principal |
| `color.textSecondary` | `#466462` | Texto secundario y explicaciones; NO gris tenue |
| `color.textInverse` | `#FFFFFF` | Texto sobre botón primario |
| `color.border` | `#DEEAE5` | Bordes y divisores comunes |
| `color.panelBorder` | `#E0EAE6` | Bordes de paneles suaves |
| `color.divider` | `#E5EEEA` | Separadores entre registros |
| `color.skeleton` | `#E7EFEC` | Bloques base de Skeleton |
| `color.skeletonSoft` | `#F0F5F3` | Bloques secundarios de Skeleton |
| `color.progressTrack` | `#DCEBE6` | Pista de barra de progreso |

### 3.3 Colores de estado, con texto y fondo suave

| Estado | Texto / icono | Fondo | Borde opcional |
|---|---|---|---|
| Información | `#20666B` | `#E8F6F3` | `#B5DEDA` |
| Éxito | `#17613C` | `#EAF7EE` | `#BEDFCA` |
| Advertencia | `#825600` | `#FFF8E9` | `#EDD9A4` |
| Error / peligro | `#A5281D` | `#FFF0EE` | `#F4CBC6` |
| Archivado / neutral | `#4B605C` | `#EDF0EF` | `#DEEAE5` |

No usar el verde de éxito para representar por sí solo un resultado clínico normal. Los estados de flujo (guardado/pendiente/error) y los valores médicos (en rango/fuera de rango) requieren mensajes, escalas y contexto diferenciados.

### 3.4 Accesibilidad de color

Relaciones de contraste calculadas para combinaciones clave:

- `#0C3B45` / blanco: **12.16:1**.
- `#466462` / blanco: **6.44:1**.
- `#466462` / `#EDF5F1`: **5.81:1**.
- `#20666B` / blanco: **6.62:1**.
- `#20666B` / `#DDEFE9`: **5.54:1**.
- `#3E9B94` / blanco: **3.32:1**: **no usar como texto normal**.

**Objetivo de implementación:** WCAG 2.2 AA; verificar cada combinación nueva y el foco visible en los componentes efectivamente construidos.

## 4. Foundations: tipografía, espaciado y geometría

### 4.1 Tipografía aprobada

**Familia:** `Inter`, con `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif` como alternativas. Mantener una lectura nítida sobre el fondo claro.

| Token | Tamaño / interlineado | Peso orientativo | Uso |
|---|---|---|---|
| `heading-xl` | 28 / 36 px | 700 | Títulos de pantallas |
| `heading-lg` | 22–24 / 30–32 px | 600 | Encabezados de panel y módulo |
| `heading-md` | 18–20 / 26–28 px | 600 | Secciones |
| `body` | **16 / 24 px** | 400–500 | Texto general y controles |
| `label` | **14–16 / 20–24 px** | **600** | Etiquetas de campos |
| `body-sm` | 14–15 / 20–22 px | 400–500 | Tablas, filtros, ayuda y estados |
| `caption` | 12–13 / 18 px | 500 | Metadatos NO críticos y timestamps |

**Reglas:** usar `#0C3B45` en títulos y valores, `#466462` para texto secundario; evitar texto muy pequeño, bajo contraste o pesos ultradelgados. Números y tiempos alineados con cifras tabulares. Los placeholders ayudan, pero **nunca sustituyen etiquetas visibles**.

### 4.2 Espaciado

Base 4 px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px. Separar secciones antes que rodear todos los elementos de tarjetas. Formularios con distancias de 8 px entre etiqueta/campo y 16–24 px entre campos o grupos.

### 4.3 Radios aprobados

| Uso | Radio |
|---|---|
| **Botones** | **16 px**, explícitamente **NO píldora** |
| Inputs, Selects, Date/Time Pickers | 12 px |
| Textareas | 12 px |
| Paginación y menús contextuales | 12 px |
| Tooltips | 10 px |
| Toasts | 14 px |
| Paneles / Cards / Accordion | 16 px |
| Modales / diálogos | 20 px |
| Badges y Switches | Píldora / 9999 px |
| Avatar / indicadores circulares | 50 % |

**Sombras:** ninguna por defecto; solo sombra moderada en menú flotante o modal si fuese necesaria para separar capas. Bordes típicos de 1 px. Animaciones discretas de 120–180 ms donde se justifiquen y respetar `prefers-reduced-motion`.

### 4.4 Tamaños y superficies

- Botón principal: alto **40 px**; pequeño 36 px; grande 48 px.
- Inputs / Selects: 44–48 px.
- Textarea: **120 px** de altura inicial, crecimiento automático hasta un límite apropiado (se propone 320 px); scroll interno después del límite cuando corresponda.
- Sidebar expandido: **240 px**; compacto: 72 px.
- Header: **64 px**.
- Contenido: máximo orientativo **1440 px**, padding 24–32 px en escritorio.
- Objetivos táctiles recomendados: alrededor de **44 × 44 px** aun cuando el icono o control visual sea menor.

---

## 5. Componentes aprobados: inventario maestro (01–27)

El inventario siguiente refleja **decisiones expresamente aprobadas en la conversación**, no solo propuestas genéricas.

| Nº | Componente | Especificación aprobada | Estados / comportamiento |
|---:|---|---|---|
| **01** | **Button** | `#20666B`, texto blanco, **radio 16 px**, 40 px estándar; `primary`, `secondary`, `ghost`, `danger`, tamaños pequeño/medio/grande | `default`, `hover`, `focus-visible`, `disabled`, `loading`; una acción primaria por bloque; no usar estilo píldora |
| **02** | **Alert** | **Fondo suave** por significado, borde sutil, texto de alto contraste; información/éxito/advertencia/error | Cierre donde proceda; errores persistentes hasta resolverse; texto descriptivo |
| **03** | **Skeleton Loader** | Tonos **muy sutiles** `#E7EFEC` y `#F0F5F3`, geometría semejante al contenido final | Mostrar durante cargas de contenido; no confundir con error; evitar saltos visuales |
| **04** | **Input / TextField** | **Fondo suave** `#EDF5F1`, radio **12 px**, texto 16 px, etiquetas oscuras legibles | Requerido, ayuda visible, error, disabled, readonly, focus; validar sin depender de placeholder |
| **05** | **Select** | Igual que Input: `#EDF5F1`, radio 12 px, etiqueta 14–16 px, menú legible | Disabled; dependencias entre listas; búsqueda para grandes catálogos |
| **06** | **Textarea** | Fondo suave, radio 12 px, **altura inicial 120 px** | Autoexpandible, validación, contador opcional, no perder contenido |
| **07** | **Switch** | **50 × 29 px**, activado `#20666B`, desactivado `#D5E2DE`; indicador blanco | Cambio inmediato; no usar para operaciones destructivas o ambiguas |
| **08** | **Checkbox / Radio** | Checkbox **20 × 20 px**, radio **6 px**; Radio **20 × 20 px** circular; selección `#20666B` | Checkbox múltiple, Radio elección única; teclado y etiquetas asociadas |
| **09** | **Badge / Status** | Compacto, **píldora**, fondo de estado suave, texto claro y punto opcional | Solo para estados relevantes; no convertir todos los valores en badges |
| **10** | **DataTable** | Blanco, filas **sin tarjetas**, separadores suaves, tipografía legible | Buscar, filtrar, ordenar, abrir, paginar, carga/vacío/error |
| **11** | **Modal / Dialog** | Blanco, **radio 20 px**, 440–520 px orientativos, botones radio 16 px | Confirmación para archivo; gestión de foco y Escape; formularios largos en página propia |
| **12** | **Sidebar** | **Blanco**, selección `#DDEFE9`, iconos lineales, expandido/compacto | Institución determina menú; no selector de motor al personal clínico |
| **13** | **Header / Topbar** | Blanco, **64 px**, buscador suave, notificaciones, avatar circular, separador sutil | Menús accesibles y responsive |
| **14** | **Date Picker / Time Picker** | Fondo `#EDF5F1`, radio 12 px, alto 44–48 px | Calendario mensual en **selector**; hora **24 h**, minutos cada **15 min**; disponibilidad validada por servidor |
| **15** | **Tabs** | **Línea inferior activa de 3 px** `#20666B`, fondo blanco, sin relleno de selección | Cambiar contenido sin perder contexto; navegación por teclado |
| **16** | **Pagination** | Número activo con `#DDEFE9`, radio 12 px, controles discretos | Anterior/siguiente, primera/última, cantidad de filas, disabled |
| **17** | **Tooltip** | **Blanco**, texto oscuro, borde sutil, **radio 10 px**, 14 px | Hover/foco/toque; solo ayuda complementaria, NO datos esenciales |
| **18** | **Cards & Panels** | **PANELES SUTILES COMO ESTILO PRINCIPAL**, `#F8FBF9` o blanco, borde `#E0EAE6`, radio 16 px | Agrupar secciones por función; **no** una tarjeta por dato/fila |
| **19** | **Empty / Error States** | Panel sutil, icono lineal, mensaje directo y una acción relevante | Distinguir «sin registros», «sin resultados» y «falló la carga» |
| **20** | **Toast Notification** | Blanco, borde sutil, **radio 14 px**, icono/título/texto **centrados** | **Notificación completa en posición inferior CENTRADA (bottom-center)**, NO inferior derecha; cierre y duración según importancia |
| **21** | **Progress Bar** | Barra `#20666B` sobre pista `#DCEBE6`, porcentaje legible | Patrón de carga **preferido sobre spinner**; mostrar porcentaje solo si es medible |
| **22** | **Stepper** | Pasos con **barra de progreso**; paneles discretos | Validar antes de avanzar, regresar sin perder datos, revisión final |
| **23** | **Accordion** | Fondo blanco y encabezado abierto `#F8FBF9`, radio 16 px, separadores | **APERTURA MÚLTIPLE**: varias secciones expandidas simultáneamente |
| **24** | **Dropdown / Action Menu** | Blanco, ancho 200–240 px, radio 12 px, iconos discretos | Acciones secundarias agrupadas; destructivas diferenciadas y confirmadas |
| **25** | **Clinical Timeline** | Línea vertical 2 px `#DCEBE6`, iconos verde petróleo, paneles suaves de detalle | Filtrar eventos, cronología descendente, varios eventos expandidos |
| **26** | **Agenda / Calendar** | **Vista diaria y semanal**, navegación por semanas, fechas seleccionables, eventos en filas | **NO calendario mensual como vista principal**; detalle de cita y estado legible |
| **27** | **Search + Advanced Filters** | Búsqueda por nombre/identificador, filtros **desplegables**, resultados sin tarjetas individuales | Limpiar filtros; recuento, ordenación y ausencia de resultados |

### 5.1 Reglas transversales de implementación de componentes

- **Focus:** anillo de foco perceptible mediante `:focus-visible`, no eliminar el outline sin sustituto.
- **Labels:** formularios con etiquetas vinculadas programáticamente; obligatorio indicar errores junto al campo.
- **Teclado:** Tabs, Selects, menús, diálogos, acordeones, paginación y calendario operables sin ratón.
- **Loading:** bloquear doble envío y mantener el contenido que ya se completó.
- **Archivar / cancelar / modificar datos clínicos:** mostrar resultado del servidor antes de indicar éxito.
- **Mensajes de error:** explicar la acción que el usuario puede tomar; evitar datos SQL, trazas o credenciales.
- **Responsive:** conservar información esencial incluso cuando se simplifique el diseño.
- **Toasts:** éxito/información pueden cerrarse automáticamente después de ~4–5 s; errores que requieren decisión deben persistir o trasladarse a un Alert adecuado. En móvil, mantener ubicación inferior centrada y respetar zonas seguras.
- **Progress Bar:** si no hay una métrica real de progreso, usar barra indeterminada accesible o Skeleton; **nunca inventar porcentajes**.
- **Alertas clínicas:** alergia **desconocida/sin verificar** no es equivalente a «sin alergias».

---

## 6. Patrones aprobados y criterios de uso

### 6.1 Búsqueda con filtros

`Título y contexto → campo Buscar → botón Filtros → panel opcional → recuento → tabla/lista → paginación`.

Usar búsqueda textual normalizada, limpiar filtros, respetar permisos e indicar el resultado vacío. La búsqueda puede diferir por rol, pero mantiene el mismo aspecto.

### 6.2 Formularios

`Título → etiqueta exterior → campo de fondo suave → ayuda/error → revisión (si es largo) → Cancelar / Guardar`.

Evitar varias acciones primarias. Para formularios largos, Stepper con avance validado y conservación de valores, no muchos campos en un único modal.

### 6.3 Confirmación de acciones sensibles

`Acción → Modal → consecuencias explícitas → Cancelar / Confirmar → respuesta del servidor → Toast inferior centrado`.

Archivar no equivale a eliminar. Mantener registro de actor, fecha y motivo cuando corresponda.

### 6.4 Consulta de expedientes

`Encabezado del paciente → información urgente importante → Tabs con línea inferior → panel de datos generales / listas clínicas / Timeline`.

Un usuario administrativo solo ve datos autorizados; un usuario médico puede acceder a los módulos clínicos permitidos.

### 6.5 Múltiples secciones clínicamente relevantes

Accordion de apertura **múltiple**: alergias, antecedentes y consultas pueden permanecer visibles al mismo tiempo. No imponer cierre automático de la sección anterior.

### 6.6 Agenda

`Navegación semanal → fecha seleccionada → vista diaria/semanal → filtros → citas en filas → detalle de cita → crear/reprogramar/cancelar`.

No presentar horario como disponible sin consultar el servidor; validar conflictos, profesional, jornada y restricciones.

---

## 7. Pantallas completas aprobadas (01–05)

Las cinco composiciones que siguen fueron revisadas como **mockups interactivos y aprobadas**. Los datos son ficticios y ciertas acciones se simularon, pero la estructura visual y el flujo previsto quedaron definidos.

### Pantalla 01 — Dashboard principal — APROBADA

**Propósito:** resumen operativo inicial de la institución tras iniciar sesión.

**Estructura aprobada:**

1. Sidebar blanco con opción de contraer y sección activa en `#DDEFE9`.
2. Header blanco de 64 px, identificación de institución, notificaciones y perfil.
3. Encabezado «Resumen general» y contexto de fecha.
4. Métricas principales (pacientes, citas, pendientes) **sin tarjetas individuales**.
5. **Un panel sutil** para próximas citas: filtros «Hoy / Próximas», filas con hora, paciente, motivo y estado.
6. Sección «Actividad reciente» con filas limpias y acción para ampliar.
7. Menú ajustado a hospital, odontología, laboratorio o pediatría, sin alterar el lenguaje visual.

**Interacciones:** cambiar sección, contraer menú, abrir cita, consultar actividad. **No mostrar** métricas clínicas o personales a roles sin permiso.

**Regla estética:** reservar paneles para bloques semánticos; no envolver las métricas en tarjetas repetidas.

### Pantalla 02 — Administración de pacientes — APROBADA

**Propósito:** buscar, registrar, consultar y cambiar estado de expedientes.

**Estructura aprobada:**

1. Breadcrumb «Inicio / Pacientes», título y descripción.
2. Buscador de fondo `#EDF5F1` por nombre, CUI o código autorizado.
3. Acción primaria **«Nuevo paciente»** con radio 16 px.
4. Botón «Filtros» que abre panel sutil para estado, área y ordenación.
5. Tabla blanca con columnas de paciente/código, estado y acciones; filas sin tarjetas.
6. Paginación discreta y estados de ausencia de resultados.
7. «Ver expediente» visible; menú de tres puntos para acciones secundarias.
8. Formulario de registro contextual para ejemplo breve; en producción puede ser pantalla propia/Stepper.
9. Confirmación explícita al archivar o restaurar y Toast **bottom-center**.

**Reglas:** impedir duplicados con validación real de backend; no mostrar pacientes de otras instituciones salvo autorización expresa. La elección «General / Pediatría / Odontología» mostrada en la demo servía solo como ejemplo: **no debe exponer instituciones ajenas dentro del formulario real**; el contenido lo determina la institución autenticada.

### Pantalla 03 — Expediente clínico completo — APROBADA

**Propósito:** consultar toda la información autorizada de un paciente.

**Estructura aprobada:**

1. Breadcrumb + encabezado con nombre, ID, institución y badge de estado.
2. Aviso de prioridad cuando existen **alergias sin verificar**; nunca inferir «no tiene alergias» por falta de datos.
3. Tabs en fondo blanco, **línea inferior de 3 px**: «General», «Consultas», «Diagnósticos», «Recetas», «Actividad» en el ejemplo. Incluir secciones equivalentes adicionales según institución y rol.
4. General: panel sutil para datos; información clínica relevante solo si está autorizada.
5. Consultas: lista expandible con detalles y acción «Nueva consulta».
6. Diagnósticos: lista/estado vacío con acción «Agregar», según permisos.
7. Recetas: lista/estado vacío con «Nueva receta», según permisos.
8. Actividad: Timeline vertical descendente de eventos.
9. Vista administrativa restringida frente a vista médica autorizada.

**Reglas:** edición clínica auditada; ocultar módulos no autorizados y aplicar control de acceso **en backend**. Conservar trazabilidad de rectificaciones y fecha/hora/profesional cuando corresponda.

### Pantalla 04 — Registro de consulta médica — APROBADA

**Propósito:** registrar una atención sin abrumar al profesional.

**Flujo aprobado (4 pasos):**

1. **Consulta:** motivo requerido, síntomas y observaciones médicas en Textareas de 120 px iniciales.
2. **Signos vitales:** peso, talla, temperatura, presión sistólica y diastólica, entre otros aplicables; campos no medidos quedan sin registro, **no como 0**.
3. **Diagnóstico y tratamiento:** evaluación clínica e indicaciones; en producción conectar con los catálogos apropiados.
4. **Receta:** prescripción opcional; si se prescribe, capturar medicamento, dosis/unidad, frecuencia, duración y demás indicaciones requeridas.
5. **Revisión final:** vista resumen con regreso a pasos previos y botón «Finalizar».

**Interacciones:** barra de progreso, volver sin perder datos, validar, revisar y confirmar. La revisión de la maqueta usó un porcentaje ilustrativo; la implementación debe medir correctamente pasos completados y no mostrar éxito hasta la respuesta de backend.

**Reglas clínicas de implementación pendientes:** validar rangos, unidades, coherencia de mediciones, profesional responsable, catálogo y múltiples diagnósticos o medicamentos cuando corresponda. Estas reglas **no** están implementadas por el mockup.

### Pantalla 05 — Gestión de citas y agenda médica — APROBADA

**Propósito:** ver, crear, reprogramar y cancelar citas médicas.

**Estructura aprobada:**

1. Header institucional y breadcrumb «Inicio / Citas».
2. Encabezado «Agenda médica» con acción **«Nueva cita»**.
3. Panel sutil con semana visible, flechas anterior/siguiente y cinco días laborales en el ejemplo.
4. Fecha seleccionada con fondo menta `#DDEFE9`; indicador de fechas con eventos.
5. Selector **«Vista diaria / Vista semanal»**; esta es la vista principal, **no** un mes completo.
6. Buscador de paciente y Select de estados: todas/confirmadas/pendientes/canceladas.
7. Filas cronológicas con hora, indicador lateral de estado, nombre y motivo, sin tarjetas por cita.
8. Panel de detalle con profesional, hora y estado; acciones para editar, reprogramar o cancelar.
9. Formulario de nueva cita / reprogramación y confirmación ante cancelación.
10. Toast final centrado en la parte inferior para los resultados.

**Reglas:** validar disponibilidad real del profesional, solapamientos, zona horaria institucional, duración de la consulta y restricciones de agenda. Las horas del mockup **no constituyen disponibilidad real**.

---

## 8. Responsive y navegación

| Ancho orientativo | Navegación / composición |
|---|---|
| ≥ 1280 px | Sidebar 240 px visible y Header 64 px; tablas y paneles en área de contenido |
| 1024–1279 px | Sidebar compacta 72 px; contenido fluido |
| 768–1023 px | Sidebar en drawer, controles adaptados, formularios de una o dos columnas según espacio |
| < 768 px | Una columna para formularios, navegación compacta, vista diaria de agenda, filtros colapsables y acceso claro a acciones |

**Tablas:** no ocultar columnas clínicas esenciales por estética. Elegir scroll horizontal accesible, vistas de detalle o tablas adaptadas. **Toasts:** inferiores centrados, con espacio para navegación del sistema y teclado móvil.

---

## 9. Reglas de seguridad, consistencia y accesibilidad

### 9.1 Acceso y datos clínicos

- Permisos por institución y rol en servidor; no se asume que todo el personal puede ver diagnósticos.
- Las vistas de ejemplo no son una definición definitiva de roles; la matriz de autorización debe especificarse según los requerimientos.
- Usar datos ficticios en pruebas, capturas y documentación.
- Minimizar nombres, CUI, resultados y diagnósticos en avisos globales y logs.
- Archivar historiales, no borrarlos sin una política de retención y respaldo; registrar acciones sensibles para auditoría.
- No representar un resultado médico como normal/peligroso mediante colores sin contexto clínico pertinente.

### 9.2 Interacción accesible

- WCAG 2.2 AA como objetivo sujeto a pruebas de implementación.
- Navegación completa con teclado, foco visible, indicadores de estado mediante texto además de color.
- Modales: `role="dialog"`, nombre accesible, foco contenido y restaurado, cierre controlado ante cambios no guardados.
- Accordion: botones con `aria-expanded` y asociación con contenido, apertura múltiple.
- Switches y Checkboxes: estado accesible y etiquetas asociadas.
- Tabs: semántica `tablist` / `tab` / `tabpanel` o patrón accesible equivalente.
- Toasts: anunciar mensajes no invasivos mediante región viva; no robar foco innecesariamente.
- Skeleton/Progress: accesibles a lectores de pantalla, sin porcentajes ficticios.
- Calendario: foco por fecha, selección con teclado y etiquetas completas de día/mes/año.

### 9.3 Consistencia funcional

- Elementos con la misma apariencia deben ejecutar patrones coherentes.
- Acciones destructivas exigen confirmación; las acciones de navegación no la necesitan.
- Fallas al guardar no borran el formulario completado.
- «Sin resultados» no significa «Error de servidor» y viceversa.
- Alertas persistentes para problemas importantes; Toasts temporales para confirmaciones ligeras.
- El texto de ayuda no reemplaza una validación contextual.
- No presentar éxito antes de confirmar persistencia en backend.

---

## 10. Design Tokens listos para traducir a CSS / Tailwind / Figma

```css
:root {
  /* Light Mode exclusivo */
  color-scheme: light;
  --font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  /* Marca */
  --color-primary: #20666B;
  --color-strong: #0C3B45;
  --color-accent: #3E9B94;
  --color-accent-light: #88C9C4;

  /* Superficies */
  --color-background: #FFFFFF;
  --color-background-alt: #F7FAF9;
  --color-panel: #F8FBF9;
  --color-control: #EDF5F1;
  --color-selection: #DDEFE9;
  --color-border: #DEEAE5;
  --color-border-panel: #E0EAE6;
  --color-divider: #E5EEEA;

  /* Texto */
  --color-text: #0C3B45;
  --color-text-secondary: #466462;
  --color-text-inverse: #FFFFFF;

  /* Estados */
  --color-info: #20666B;
  --color-info-bg: #E8F6F3;
  --color-success: #17613C;
  --color-success-bg: #EAF7EE;
  --color-warning: #825600;
  --color-warning-bg: #FFF8E9;
  --color-danger: #A5281D;
  --color-danger-bg: #FFF0EE;

  /* Carga y progreso */
  --color-skeleton: #E7EFEC;
  --color-skeleton-soft: #F0F5F3;
  --color-progress-track: #DCEBE6;

  /* Geometría aprobada */
  --radius-button: 16px;
  --radius-input: 12px;
  --radius-select: 12px;
  --radius-textarea: 12px;
  --radius-panel: 16px;
  --radius-modal: 20px;
  --radius-toast: 14px;
  --radius-tooltip: 10px;
  --radius-pagination: 12px;
  --radius-menu: 12px;
  --radius-pill: 9999px;

  /* Tamaños */
  --button-height: 40px;
  --control-height: 48px;
  --textarea-min-height: 120px;
  --sidebar-width: 240px;
  --sidebar-compact-width: 72px;
  --header-height: 64px;

  /* Espaciado */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Interacciones */
  --motion-fast: 120ms;
  --motion-normal: 180ms;
}

@media (prefers-color-scheme: dark) {
  :root { color-scheme: light; }
  /* NO implementar tokens de modo oscuro. */
}

@media (prefers-reduced-motion: reduce) {
  :root { --motion-fast: 0ms; --motion-normal: 0ms; }
}
```

**Nota técnica:** evitar asignar colores de estado clínico mediante cadenas arbitrarias en componentes. Consumir tokens semánticos; validar todas las combinaciones, estados y contrastes reales.

---

## 11. Requisitos de documentación por componente

Cada componente reutilizable debe tener ficha con:

1. **Propósito** (qué resuelve).
2. **Anatomía** (estructura y partes).
3. **Tokens** (color, tipografía, alto, radio, espaciado).
4. **Variantes y tamaños**.
5. **Estados** (default, hover, focus, disabled, loading, error, etc.).
6. **Interacción** (ratón, teclado, táctil, mensajes, casos de borde).
7. **Accesibilidad** (etiquetas, contraste, ARIA cuando corresponda).
8. **Cuándo usarlo y cuándo no**.
9. **Ejemplo en pantalla real**.
10. **Pruebas** (unitarias, de interacción, visuales y accesibilidad).

### Ejemplo: Button / Primary

- **Uso:** guardar, crear, continuar, confirmar **acciones no destructivas**.
- **Visual:** `#20666B`, texto `#FFFFFF`, radio **16 px**, alto **40 px**, tipografía Inter de 16 px y peso 600.
- **No usar:** cinco botones principales en la misma zona ni acción destructiva con esta variante.
- **Estados:** normal, hover más oscuro, foco visible, disabled, loading sin envíos duplicados.
- **Consistencia:** «Guardar cambios», «Nuevo paciente» y «Continuar» comparten el patrón visual aunque cambie el texto.

---

## 12. Criterios de aceptación y estado de verificación

**Diseño revisado con el usuario:**

- [x] Light Mode exclusivo.
- [x] Tipografía de alto contraste; Inputs y Selects con fondo suave.
- [x] Botones de **16 px**, **no** píldora.
- [x] Alertas de fondo suave y Skeleton muy sutil.
- [x] Textarea inicial de **120 px**.
- [x] Sidebar y Header blancos; Tabs con línea inferior.
- [x] Tablas sin tarjetas por fila; paneles sutiles como recurso de agrupación principal.
- [x] Toast **inferior centrado**, con contenido también centrado.
- [x] Progress Bar como indicador de progreso principal.
- [x] Accordion de apertura múltiple.
- [x] Agenda con vista diaria/semanal.
- [x] **27 componentes/patrones** revisados y aprobados.
- [x] **Pantallas 01–05** revisadas y aprobadas: Dashboard, Pacientes, Expediente, Consulta, Agenda.

**Pendiente de implementación/verificación técnica:**

- [ ] Publicar tokens definitivos en librería de componentes y código fuente (sin hex dispersos).
- [ ] Construir los 27 componentes reutilizables y documentar sus API.
- [ ] Implementar las 5 pantallas aprobadas con componentes reales.
- [ ] Verificar el contraste de todos los estados y combinaciones.
- [ ] Probar teclado, lectores de pantalla, formularios y `focus-visible`.
- [ ] Probar responsive en móvil, tablet y escritorio.
- [ ] Comprobar permisos por institución y rol **en el servidor**.
- [ ] Asegurar trazabilidad de correcciones y archivo de historiales.
- [ ] Validar reglas clínicas, conflictos de agenda y persistencia real.
- [ ] Ejecutar pruebas de flujos completos y consistencia entre los cuatro motores.

---

## 13. Fuentes y procedencia de las decisiones

**Documentación de origen utilizada:**

1. **`Proyecto final bases II (1) (4).pdf`**: requisitos funcionales, aplicación cliente-servidor, cuatro instituciones, motores distintos, enrutamiento por usuario, experiencia visual uniforme, consultas y archivo de expedientes.
2. **`Primera Entrega Proyecto (1).pdf`**: asignación de motores y procesos/operaciones particulares del hospital, odontología, laboratorio y pediatría.
3. **`clase 12 progra web(1).pdf`** y su copia **`clase 12 progra web(2).pdf`**: Foundations, Design Tokens, componentes, variantes, estados, patrones, consistencia visual/funcional, documentación y validación.
4. **Revisión interactiva con el usuario (octubre de 2026)**: aprobaciones de paleta funcional, geometría, modo de color, componentes 01–27 y pantallas 01–05. **Estas elecciones son decisiones del producto, no requisitos impuestos por las diapositivas.**

**Interpretación:** los textos de esta versión sustituyen las opciones preliminares de `design-system-clinico-v0.1.md` que contradicen las decisiones aprobadas. No considerar definitivas las antiguas referencias a Sidebar oscuro, botones de 10 px de radio, alertas azules saturadas, Toast inferior derecho ni modo oscuro.

---

**Fin de Design System v1.0 — listo como base de implementación y auditoría visual.**
