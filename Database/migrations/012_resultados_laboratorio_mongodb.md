# Migración 012: resultados de laboratorio

Amplía exclusivamente el validador e índices de `resultados`; M03 y la migración 011 permanecen intactos. Añade `paciente_id` y `resultado_repetido_de_id` como campos reconocidos, crea índices parciales para paciente/repeticiones e índices ordenables para listados globales y por orden, ítem o serie. El backend exige `paciente_id` en cada escritura nueva; se mantiene opcional en el validador para no inventar el paciente de documentos legados.

Usar una cuenta administrativa sobre un replica set aislado, con respaldo externo verificado y todos los escritores de resultados detenidos. Importar `migrarResultadosLaboratorioMongodb(db,{escritoresDetenidos:true})`. El preflight exige migración 011 LISTO, huella exacta del validador M03 o del destino 012 durante recuperación, índices originales exactos y ausencia de documentos incompatibles. El arranque verifica también que la unicidad `(serie_resultado_id, version)` y todos los índices añadidos conserven claves, unicidad y filtros exactos.

El DDL no es transaccional. Si falla después de `collMod`, mantener escritores detenidos y reejecutar: el manifiesto `historial_modelo/id=12` conserva el validador original y reconoce el destino exacto. No borrar documentos, índices ni colecciones para conseguir LISTO. La migración no hace backfill clínico y no acredita el adaptador por sí sola.
