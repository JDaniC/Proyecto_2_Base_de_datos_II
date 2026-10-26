import type { RepositorioCuenta } from '../../../aplicacion/puertos/nucleo.js';
import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { EjecutorSql } from '../sql/tipos-sql.js';
import { mapearCuentaSql, type FilaCuentaSql, type FilaRolSql } from '../sql/mapear-cuenta.js';

interface FilaCuentaConActor extends FilaCuentaSql { readonly actor_id: unknown; }

export function crearRepositorioCuentaPostgresql(executor: EjecutorSql): RepositorioCuenta<CuentaAutorizada> {
  return {
    async porUid(uidVerificado) {
      const cuenta = await executor.consultar<FilaCuentaConActor>(
        `SELECT u.id_publico, u.auth_uid, u.institucion_id, u.estado, u.revision,
                p.id_publico AS profesional_id, COALESCE(p.estado = 'ACTIVO', false) AS profesional_activo,
                u.id_usuario AS actor_id
           FROM usuario u LEFT JOIN personal_medico p ON p.id_personal = u.id_personal
          WHERE u.auth_uid = $1`,
        [uidVerificado],
      );
      const fila = cuenta.filas[0];
      if (fila === undefined) return null;
      const actorId = fila.actor_id;
      const roles = await executor.consultar<FilaRolSql>(
        `SELECT r.nombre, r.permisos FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = $1 ORDER BY r.nombre`,
        [actorId],
      );
      return mapearCuentaSql(fila, roles.filas);
    },
  };
}
