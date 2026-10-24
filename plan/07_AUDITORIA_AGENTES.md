# Auditoría de instrucciones para agentes

Fecha: 24/10/2026. Revisión documental de `Agente/AGENTS.md` frente al repositorio, auditorías y consigna actual. No es otra auditoría del software.

| ID | Hallazgo | Riesgo | Corrección realizada |
|---|---|---|---|
| AG01 | AGENTS solo dentro de Agente/ | No aplicaría automáticamente al código en otras carpetas | Crear AGENTS raíz con guía global |
| AG02 | Inventario decía dos SQL y ausencia de frontend | Reconstruir trabajo disponible | Contexto: cuatro modelos, React simulado, backend vacío |
| AG03 | Nombres PDF antiguos y Downloads local | Fuente no portable o distinta | Identificar PDF final actual y resumen en plan/01 |
| AG04 | Hashes locales sin reconciliar Firebase Auth | Doble login incompatible | Identidad externa y cuenta/roles locales, sin contraseñas locales |
| AG05 | Sin reparto, IDs, dependencias/cierre | Duplicación y tareas sin revisión | 48 tareas, dos colas, tablero y plantillas |
| AG06 | Sin fallo PG ni límites de auditoría reciente | Dar por verificadas todas las bases | Enlazar A-F01/bloqueos y distinguir pruebas históricas |
| AG07 | Agenda lab/reactivación universal/administración amplia | Reintroducir pantallas retiradas | DEC03–DEC12 y alcance de API/UI explícito |
| AG08 | Sin alias pediátrico, actor cliente y versiones faltantes | Integración fallida y confianza indebida | DEC06–DEC08 y tareas de mapeo/autorización |
| AG09 | Sin migración/manifiesto ni dueño de archivos comunes | Borrado de volúmenes/conflictos | Migración explícita y revisión cruzada |

Resultado: guía raíz creada y guía de Agente actualizada, conservando independencia de dominio, privacidad, trazabilidad y cuatro instituciones. Este trabajo no ejecuta E00–E07. Las contradicciones históricas dentro de diseño/RF se reconciliarán en E00-P1-01; las decisiones del plan aclaran el alcance previsto.

## Arranque del agente del compañero

1. Localizar raíz y leer `AGENTS.md`.
2. Leer plan maestro, alcance y cola P2 (o P1 si se reasigna).
3. Elegir ID autorizado, revisar dependencias/tablero y su archivo de fase.
4. Implementar esa tarea con sus pruebas, conservando UI/cambios ajenos.
5. Entregar evidencia y EN_REVISION; el compañero revisa antes de HECHA.

Mensaje sugerido para iniciar trabajo:

> Trabaja como responsable P2. Lee AGENTS.md y plan/00_PLAN_MAESTRO.md. Empieza por E00-P2-01 respetando dependencias y criterios. Conserva cambios ajenos y registra evidencia real. No marques HECHA sin revisión del otro integrante. Si hay bloqueo, documenta causa y avanza trabajo independiente autorizado.

Es una guía de inicio; no envía mensajes ni crea chats automáticamente.
