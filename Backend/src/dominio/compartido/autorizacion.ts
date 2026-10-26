export type Rol = 'ADMIN_INSTITUCIONAL' | 'SECRETARIA' | 'MEDICO' | 'ODONTOLOGO' | 'PEDIATRA'
  | 'MEDICO_LABORATORIO' | 'ANALISTA_LABORATORIO' | 'VALIDADOR_LABORATORIO';
export type Permiso = 'pacientes.administrar' | 'historial.leer' | 'historial.archivar' | 'citas.administrar'
  | 'consultas.registrar' | 'diagnosticos.registrar' | 'tratamientos.registrar' | 'recetas.emitir'
  | 'usuarios.administrar' | 'auditoria.leer' | 'resultados.analizar' | 'resultados.validar'
  | 'informes.emitir' | 'cobros.administrar' | 'inventario.administrar' | 'ordenes.administrar'
  | 'muestras.administrar';
