import type { RepositorioCuenta } from '../../../aplicacion/puertos/nucleo.js';
import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { EjecutorSql } from '../sql/tipos-sql.js';
import { mapearCuentaSql, type FilaCuentaSql, type FilaRolSql } from '../sql/mapear-cuenta.js';

interface FilaCuentaConActor extends FilaCuentaSql { readonly actor_id: unknown; }

export function crearRepositorioCuentaMysql(executor: EjecutorSql): RepositorioCuenta<CuentaAutorizada> {
  return {
    async porUid(uidVerificado) {
      const cuenta = await executor.consultar<FilaCuentaConActor>(
        `SELECT u.id_publico, u.auth_uid, u.institucion_id, u.estado, u.revision,
                o.id_publico AS profesional_id, (o.id_odontologo IS NOT NULL) AS profesional_activo,
                u.id_usuario AS actor_id
           FROM usuario u LEFT JOIN odontologo o ON o.id_odontologo = u.id_odontologo
          WHERE u.auth_uid = ? FOR SHARE`,
        [uidVerificado],
      );
      const fila = cuenta.filas[0];
      if (fila === undefined) return null;
      const roles = await executor.consultar<FilaRolSql>(
        `SELECT r.nombre, r.permisos FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = ? ORDER BY r.nombre FOR SHARE`,
        [fila.actor_id],
      );
      return mapearCuentaSql(fila, roles.filas);
    },
  };
}
