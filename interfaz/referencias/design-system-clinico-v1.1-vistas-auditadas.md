# Design System — Plataforma de Historiales Clínicos

**Versión:** 1.1 — vistas contrastadas con el diseño funcional y la consigna; componentes visuales aprobados sin cambios  
**Fecha de actualización:** 19 de octubre de 2026  
**Estado:** diseño visual aprobado; catálogo de vistas verificado. **Implementación, decisiones abiertas y pruebas técnicas pendientes**  
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

---

## 14. Auditoría de cobertura y mapa de vistas — revisión 1.1

**Fecha de revisión:** 19 de octubre de 2026. **Fuentes:** `Diseño principal del proyecto` (documento proporcionado por el equipo), `Proyecto final bases II (1) (4).pdf` (consigna final), `Primera Entrega Proyecto (1).pdf` (levantamiento de las cuatro instituciones) y las pantallas visuales aprobadas en este documento.

### 14.1 Veredicto y alcance

- El catálogo funcional de la sección 8 del documento principal **contiene 53 entradas**: 19 comunes, 8 de hospital, 5 de clínica odontológica, 14 de laboratorio y 7 de pediatría. Son **vistas o flujos**, no 53 rutas ni 53 páginas distintas.
- El catálogo cubre los procesos importantes del **alcance ampliado adoptado por el equipo**, sujeto a las brechas y decisiones explícitas de 14.3 y 14.4.
- La **consigna académica final es más acotada**: exige cuatro motores asignados por institución, enrutamiento por identidad, interfaz consistente, alta y mantenimiento de expedientes, consultas/diagnósticos/tratamientos/recetas, archivo y comparación de motores. No exige por sí sola un panel administrativo de inventario, cobros y calidad de laboratorio con todos los detalles. Estos aparecen en el levantamiento/modelo del equipo y en su diseño adoptado. No atribuir esas ampliaciones al PDF de la consigna.
- Las cinco pantallas visualmente aprobadas —Dashboard, Administración de pacientes, Expediente, Registro de consulta, Agenda— son una **base compartida**; no sustituyen las vistas especiales de hospital, laboratorio y pediatría.
- Mantener la identidad visual v1.0 sin rediseñar componentes. El problema que se corrige es **arquitectura de información, cobertura de flujos y coherencia con API**.

**Tipos de superficie** usados a continuación: `Página` = área de navegación importante; `Subvista` = pestaña/sección del expediente, consulta o módulo; `Formulario` = paso, modal, drawer o página de captura según longitud; `Estado` = tratamiento de acceso/carga/error sin nueva página de negocio. Son **recomendaciones de agrupación visual**, no una restricción nueva sobre backend.

### 14.2 Correspondencia de las 53 entradas del documento principal

#### Comunes — 19

| ID | Vista original | Superficie recomendada | Cobertura visual actual / decisión |
|---|---|---|---|
| V01 | Inicio de sesión | Página | Pendiente de diseño; incluir entrada y recuperación de acceso. |
| V02 | Acceso restringido / inactiva | Estado o página de acceso | Pendiente; distinguir 401 de 403 sin revelar datos. |
| V03 | Panel inicial | Página | **Aprobada: Pantalla 01**; widgets por institución y rol. |
| V04 | Búsqueda/listado de pacientes | Página | **Aprobada: Pantalla 02**; reconciliar API de búsqueda. |
| V05 | Registro/edición administrativa | Formulario/flujo | Demostración básica en Pantalla 02; falta alta completa especializada, deduplicación y responsable pediátrico. |
| V06 | Perfil del paciente | Página | **Aprobada: Pantalla 03**; separar datos administrativos y clínicos por permiso. |
| V07 | Historial clínico cronológico | Subvista de V06 | Timeline aprobada; definir orden y paginación consistentes. |
| V08 | Agenda de citas | Página | **Aprobada: Pantalla 05**. |
| V09 | Crear/editar cita | Formulario desde V08 | Prototipo aprobado; ajustar estados, motivo de cancelación y concurrencia. |
| V10 | Registro de consulta | Página/formulario por pasos | **Aprobada: Pantalla 04**; adaptarla por institución. |
| V11 | Detalle de consulta | Página o subvista desde V06 | Resumen aproximado en Pantalla 03; detalle persistido, estado y revisión pendientes. |
| V12 | Diagnósticos y tratamientos | Pasos/subvista V10-V11 | Parcialmente aprobada; varios diagnósticos, principal y catálogo deben existir. |
| V13 | Crear/ver receta | Paso V10 y detalle/imprimible en V11 | Parcialmente aprobada; múltiples fármacos y atributos históricos completos pendientes. |
| V14 | Archivo/reactivación | Confirmación desde V06 | Parcialmente aprobada en Pantalla 02; **exigir motivo y causa**, versión y trazabilidad. |
| V15 | Administración de usuarios | Página de administración | Pendiente; provisión, vinculación, estado y baja. |
| V16 | Administración de roles y permisos | Pestaña/subvista de administración | Pendiente; permisos efectivos por institución. |
| V17 | Catálogos institucionales | Página de administración con pestañas | Pendiente; no construir una página distinta por cada catálogo. |
| V18 | Búsqueda de auditoría | Página de administración | Pendiente; actor, fecha, recurso, cambios, acceso autorizado. |
| V19 | Carga, error, sin resultados | **Estados reutilizables, no ruta** | Componentes aprobados; deben integrarse en todas las páginas. |

#### Hospital General — 8

| ID | Vista original | Superficie recomendada | Cobertura |
|---|---|---|---|
| H01 | Lista de hospitalizaciones | Página especializada | Pendiente. |
| H02 | Ingreso/detalle de hospitalización | Página especializada + formulario | Pendiente; estados, egreso, diagnósticos vinculados. |
| H03 | Habitaciones, camas, ocupación | Página especializada | Pendiente; ocupación actual e historial. |
| H04 | Asignar/liberar cama | Formulario desde H02/H03 | Pendiente; no exige ruta propia, sí exclusión de solapamientos. |
| H05 | Seguros y cobertura | Subvista en V06; catálogos en V17 | Pendiente; vigencias, planes, titular, afiliación. |
| H06 | Orden de examen/resultados | Página especializada y enlace en expediente | Pendiente; distinguir solicitud, orden y resultados. |
| H07 | Procedimientos realizados | Subvista de consulta/hospitalización | Pendiente; registrar profesional, fecha y resultado. |
| H08 | Personal médico/especialidades | Pestaña del catálogo V17 | Pendiente; colegiación, especialidades y estado. |

#### Clínica odontológica — 5

| ID | Vista original | Superficie recomendada | Cobertura |
|---|---|---|---|
| C01 | Agenda de secretaría | **Variante de V08**, no página distinta | Pantalla 05 visualmente aprobada; incorporar secretaría gestora. |
| C02 | Detalle de cita odontológica | Detalle/panel de V08-V09 | Parcial; relación con odontólogo, secretaría y atención. |
| C03 | Consulta odontológica | **Variante de V10** | Pantalla 04 visualmente aprobada; políticas de cita y odontólogo pendientes. |
| C04 | Diagnósticos/tratamientos/receta odontológica | Subvista de V11–V13 | UI común ya aprobada parcialmente; catálogos propios. |
| C05 | Catálogos odontológicos | Pestañas de V17 | Pendiente. **No añadir odontograma:** no está en el alcance declarado. |

#### Laboratorio clínico — 14

| ID | Vista original | Superficie recomendada | Cobertura |
|---|---|---|---|
| L01 | Bandeja de trabajo | Página especializada | Pendiente; estados/prioridad/responsables. |
| L02 | Crear/editar orden | Página/formulario especializado | Pendiente; pruebas versionadas, ítems, precios. |
| L03 | Detalle/seguimiento de orden | Página especializada | Pendiente; trazabilidad integral de orden. |
| L04 | Registro/recepción de muestras | Página/formulario especializado | Pendiente; códigos únicos, rechazo y retoma. |
| L05 | Trazabilidad de muestra | Subvista de L03/L04 | Pendiente; conservar eventos y rectificaciones. |
| L06 | Captura de resultados | Página/formulario dinámico | Pendiente; parámetros de versión, equipos y analista. |
| L07 | Revisión/validación de resultados | Página/flujo específico por permiso | Pendiente; **analizar y validar son acciones diferentes**. |
| L08 | Corrección/repetición y versiones | Subvista/flujos de L06-L07 | Pendiente; preservar versiones y distinguir repetición. |
| L09 | Vista previa/emisión informe | Página/subvista de L03 | Pendiente; resultados validados y versiones exactas. |
| L10 | Catálogo de laboratorio | Pestañas de V17 | Pendiente; pruebas, métodos, muestras y versiones. |
| L11 | Equipos/control de calidad | Página especializada; equipo maestro en V17 | Pendiente; controles y evaluación histórica. |
| L12 | Reactivos, lotes, inventario | Página especializada | Pendiente; movimientos y saldo coherente. |
| L13 | Facturas/pagos | Página especializada | Pendiente; facturas, pagos, reversión y saldos. |
| L14 | Personal/permisos de laboratorio | V15–V16 especializados | Pendiente; no duplicar administración de usuarios. |

#### Centro médico pediátrico — 7

| ID | Vista original | Superficie recomendada | Cobertura |
|---|---|---|---|
| P01 | Responsables del menor | **Paso obligatorio del alta** + pestaña V06 | Pendiente; uno o más principales y autorización **independiente**. |
| P02 | Seguimiento de crecimiento | Subvista de expediente V06 | Pendiente; comparación longitudinal y captura por consulta. |
| P03 | Antecedentes y alergias | Subvista de V06 | Parcial; falta alta/edición con versiones; no confundir desconocido con negativo. |
| P04 | Catálogo de vacunas/dosis | Pestaña de V17 | Pendiente; esquema/versiones. |
| P05 | Esquema/dosis pendientes | Subvista de V06 | Pendiente; distinguir futuras, pendientes y aplicadas. |
| P06 | Registrar aplicación de vacuna | Formulario desde P05 | Pendiente; paciente, dosis, lote, sitio, profesional y no duplicación. |
| P07 | Historial de vacunación | Subvista cronológica de P05/V07 | Pendiente; corrección/versiones auditadas. |

**Total comprobado:** V01–V19 (19), H01–H08 (8), C01–C05 (5), L01–L14 (14), P01–P07 (7) = **53**. No se eliminan operaciones aunque varias dejen de ser páginas independientes.

### 14.3 Hallazgos que deben resolverse antes de implementar el frontend

| Prioridad | Hallazgo verificado | Desajuste y acción requerida |
|---|---|---|
| **Alta** | Estados de citas | Pantalla 05 usa «Pendiente/Confirmada/Cancelada»; `Diseño principal` §5.7 establece `PROGRAMADA → ATENDIDA/CANCELADA`. Unificar etiqueta, filtro, estado y transiciones; no inventar un estado «CONFIRMADA» sin actualizar contrato. |
| **Alta** | Archivo de expediente | La maqueta confirma archivo sin pedir motivo. API §5.6/5.7 exige causa `TRASLADO`, `FALLECIMIENTO` u `OTRA_ADMINISTRATIVA`, observación/motivo, versión y permiso. Incorporar formulario y evitar atención nueva si está archivado. |
| **Alta** | Alta pediátrica incompleta | La demostración de «Nuevo paciente» contiene solo datos generales y área. §3.5.2 exige al menos un responsable principal y comprobar autorización específica antes de atender; no equiparar «principal» con «autoriza». |
| **Alta** | Ciclo de vida de consulta | La maqueta trata «Finalizar» como una confirmación única; diseño §5.6–5.7 distingue registro completo, consulta ABIERTA, finalización, receta EMITIDA y correcciones versionadas. Mostrar acciones compatibles con el backend, revisar estado y aplicar permisos. |
| **Alta** | Resultados de laboratorio | La pantalla común de consultas NO sustituye la cadena de orden→muestra→captura→validación→informe. Analista no recibe derecho a emitir receta ni a validar resultados por defecto. Diseñar L01–L09 antes de declarar cobertura de laboratorio. |
| **Media** | Cronología con orden incompatible | Design System §7 Pantalla 03/Timeline prevé descendente, pero contrato §5.6 del documento principal exige ascendente + ID público como desempate. Elegir un orden único, hacerlo explícito en backend/UI y cursor estable; **pendiente de decisión, no corregido automáticamente**. |
| **Media** | Búsqueda/listado incompatible | Pantalla 02 muestra pacientes al cargar y búsqueda libre nombre/CUI; API §5.6 rechaza búsqueda vacía y define identificación exacta o prefijo de nombre, con cursor opaco. Implementar estado inicial sin listado, **o** ampliar el contrato para listado inicial autorizado/paginado. Mantener coincidencias exactas y evitar exposición masiva. |
| **Media** | Paginación incompatible | Mockup de pacientes muestra «Página X de Y»; contrato actual define cursor y `siguiente_cursor` sin conteo total. Sustituir por «Cargar más/Anterior» con cursor, o documentar un endpoint de conteo/paginación adicional. |
| **Media** | Receta y diagnóstico incompletos | UI de consulta demuestra un fármaco y diagnóstico en texto libre; backend requiere varios medicamentos y diagnósticos, uno principal cuando hay diagnósticos, vía, presentación, concentración, fecha y correcciones históricas. Extender campos preservando el Stepper de 4 pasos aprobado. |
| **Media** | Reserva de profesional y permisos | En citas, comprobar disponibilidad/solapamientos y rol de gestión; el profesional que firma una consulta o receta se deriva de la cuenta, no del ID enviado por el cliente. Evitar opciones de suplantación. |
| **Media** | Identificación y duplicados | La demo usa códigos `HC-001` y CUI ficticios; contrato de API usa UUID público. Se puede mostrar un código legible distinto del ID público; las reglas de unicidad, coincidencias potenciales y idempotencia dependen del servidor. |
| **Baja** | Vistas redundantes | V19 es estado, C01/C03/C04/C05 son variantes; H04, H05, H07, H08, L05, L08, L10, L14 y la mayoría de P01–P07 funcionan mejor integradas como subflujos. No crear menús/rutas independientes innecesarios. |

**Estas son divergencias entre documentos/prototipos, no errores de ejecución verificados**; la implementación aún no existe o no se ha revisado como parte de esta auditoría.

### 14.4 Cobertura académica mínima frente al alcance ampliado

La **consigna de Entrega II** exige probar con los cuatro motores: inicio de sesión/enrutamiento por institución, paciente nuevo e historial, búsqueda/consulta de historial, nueva consulta, diagnóstico, tratamiento, medicamento recetado, archivo/desactivación y consistencia de visualización; además, justificar modelado, consistencia y seguridad. Los estados de acceso denegado son necesarios para implementar autorización segura, aunque no cuenten como páginas de negocio separadas.

El **alcance ampliado que el equipo adoptó** incorpora la operativa institucional detallada. Para cubrirlo visualmente:

| Institución | Flujo distintivo prioritario | Extensiones después del flujo central |
|---|---|---|
| Hospital | Hospitalizaciones, camas, orden de examen y resultados; consultas y antecedentes | Seguros, procedimientos, personal/especialidades; catálogos y auditoría. |
| Odontología | Agenda de secretaría → cita odontológica → consulta/diagnóstico/receta | Catálogos, historial, permisos y casos especiales. **Sin odontograma**. |
| Laboratorio | Orden → muestra → captura de resultados → validación → informe, con trazabilidad | Catálogos versionados, control de calidad, reactivos/inventario, facturación/pagos. |
| Pediatría | Alta del menor + responsables/autorización → consulta/control de crecimiento → vacuna/esquema | Gestión de versiones, correcciones, vistas comparativas, catálogos. |

Priorizar el flujo básico para demostrar equivalencia y después los módulos especializados que el equipo comprometió en su levantamiento. No declarar «terminado» todo el diseño institucional cuando solo estén implementadas las cinco pantallas comunes.

### 14.5 Propuesta de navegación sin 53 páginas

**Navegación común visible, filtrada por rol:** Inicio, Pacientes, Agenda, Consultas/Historial (cuando corresponda) y Administración (Usuarios, Roles, Catálogos, Auditoría). `Inicio de sesión` queda fuera del menú autenticado; `Acceso denegado` y estados de error son estados de aplicación, no secciones principales. Un expediente se abre desde Pacientes, Citas y módulos especializados y contiene datos generales, historia, alergias, consulta, recetas y pestañas exclusivas por institución.

**Secciones institucionales añadidas sin alterar el diseño compartido:**

- Hospital: Hospitalizaciones, Camas, Órdenes de examen; seguro y procedimientos como pestañas contextuales.
- Clínica odontológica: agenda, consulta y catálogos adaptados, sin duplicar la navegación común.
- Laboratorio: Bandeja, Órdenes, Muestras, Resultados, Informes, Calidad, Inventario y Cobros. Las acciones de validar/corregir/emitir se permiten solo con sus permisos, y pueden ser subflujos.
- Pediatría: Responsable(s), Crecimiento y Vacunación como pestañas del paciente; formularios de captura vinculados a la consulta, esquema y dosis.

**Acciones contextuales comunes:** crear/editar, archivar/reactivar con causa y motivo, corregir con revisión, reprogramar/cancelar cita con motivo, confirmar/cerrar formularios, recuperar errores sin duplicar operaciones.

**Regla de diseño aprobada:** no añadir más tarjetas, colores, efectos o páginas por esta auditoría; reutilizar componentes 01–27, tabs de subrayado, paneles sutiles, Sidebar blanco y Light Mode.

### 14.6 Estado de las pantallas

| Pantalla | Estado visual | Cobertura real frente al proyecto completo |
|---|---|---|
| 01 Dashboard | APROBADA | Es estructura general; ajustar tarjetas/resúmenes por rol e institución. |
| 02 Administración de pacientes | APROBADA | Faltan reglas especializadas de alta, archivo y búsqueda. |
| 03 Expediente clínico | APROBADA | Faltan subpestañas y operaciones por institución/versiones. |
| 04 Registro de consulta | APROBADA | Faltan campos completos de receta, diagnósticos y estados de finalización. |
| 05 Agenda/citas | APROBADA | Falta alinear los estados, motivo de cancelación y disponibilidad real. |
| Login, administración, hospital, laboratorio, pediatría especializada | **PENDIENTES DE DISEÑO VISUAL** | El documento principal especifica la funcionalidad, no constituye un prototipo aprobado de estas vistas. |

**Conclusión de esta auditoría:** El documento principal **sí identifica las áreas necesarias para el alcance que el equipo diseñó**; no hay que fabricar 53 páginas. La ejecución queda condicionada a corregir las incompatibilidades de 14.3 y construir los módulos especializados según prioridades académicas, permisos y casos de uso. Mantener por separado lo exigido expresamente por la consigna de Entrega II y las extensiones elegidas en la primera entrega/diseño del equipo.
