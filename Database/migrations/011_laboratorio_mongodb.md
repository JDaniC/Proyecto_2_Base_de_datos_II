# Migración011: órdenes y custodia de laboratorio

Estado de implementación: ejecutor preparado; pruebas físicas pendientes. No habilitar laboratorio únicamente por los contratos offline.

Usar cuenta administrativa, replica set aislado para pruebas. En instalación nueva y existente: preparar M03 y migraciones previas (003/004/005); verificar respaldo externo recuperable; detener escritores antes de011 y mantenerlos detenidos durante todo el proceso. Importar migrarLaboratorioMongodb(db,{escritoresDetenidos:true}) desde el entorno administrativo existente, sin guardar conexiones/secretos en repositorio. El booleano declara el requisito operativo, no detecta procesos activos.

El preflight comprueba huellas exactas origen/destino, índices y documentos de las tres colecciones antes de mutar. Conserva índices y documentos. Respalda validadores originales en historial_modelo/id11 sin sobrescribirlos en reejecuciones; registra MIGRANDO antes del primer collMod. El DDL no es transaccional: un fallo puede dejar mezcla de validadores conocidos y estado MIGRANDO. Con escritores aún detenidos, corregir causa y reejecutar el mismo ejecutor; acepta origen y destino conocidos, nunca deriva desconocida. No borrar colecciones ni cambiar datos para conseguir LISTO.

Ítems sin snapshot de prueba, muestras sin recipiente histórico verificable o historial previo RECONCILIAR conservan RECONCILIAR. No reconstruir historia desde catálogo vigente. La conciliación administrativa deberá documentar procedencia y comprobar cobertura antes de habilitar; este ejecutor no la realiza y no quita RECONCILIAR automáticamente. Reanudar escritores especializados solo con manifiesto LISTO, esquema/índices compatibles y adaptador final implementado/verificado. Los campos nuevos opcionales preservan legado, no acreditan que esté listo.

Respaldo técnico no sustituye backup externo de datos. No restaurar validadores antiguos sobre datos nuevos sin una revisión de compatibilidad: rechazarían campos añadidos. Recuperación preferida: avanzar reejecutando011 sin eliminar historia. M01–M09 e inicializador M03 permanecen intactos.
