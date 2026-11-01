import type {
  AlergiaAntecedente,
  AntecedentesClinicos,
  CatalogoOdontologico,
  PuertosClinicos,
  RegistroAntecedente,
} from '../../../../aplicacion/puertos/clinica.js';
import { CATALOGO_ODONTOLOGIA_BASE } from '../../../../aplicacion/casos-uso/clinica/consultar-catalogos-clinicos.js';
import { uuidPublico, type UUID } from '../../../../dominio/compartido/uuid.js';
import type { ProfesionalClinico } from '../../../../dominio/clinica/consulta.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';
import { profesionalClinicoSql } from '../../sql/mapear-clinica-sql.js';
import { RepositorioPacientesMysql } from '../pacientes/repositorio-pacientes-mysql.js';
import { RepositorioCitasMysql } from './repositorio-citas-mysql.js';
import { RepositorioConsultasMysql } from './repositorio-consultas-mysql.js';

export function crearRepositorioProfesionalesMysql(ejecutor: EjecutorSql): {
  porId(id: UUID): Promise<ProfesionalClinico | null>;
  listar(): Promise<readonly ProfesionalClinico[]>;
} {
  return {
    async porId(id) {
      try {
        const resultado = await ejecutor.consultar<Record<string, unknown>>(
          `SELECT o.id_publico, CONCAT_WS(' ', o.nombres, o.apellidos) AS nombre,
                  o.colegiado, o.entidad_colegiacion,
                  NOT EXISTS(SELECT 1 FROM usuario u WHERE u.id_odontologo = o.id_odontologo AND u.estado <> 'ACTIVO') AS activo
             FROM odontologo o WHERE o.id_publico = ?`,
          [id],
        );
        const fila = resultado.filas[0];
        return fila ? profesionalClinicoSql(fila, 'ODONTOLOGO') : null;
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar el profesional.');
      }
    },
    async listar() {
      try {
        const resultado = await ejecutor.consultar<Record<string, unknown>>(
          `SELECT o.id_publico, CONCAT_WS(' ', o.nombres, o.apellidos) AS nombre,
                  o.colegiado, o.entidad_colegiacion,
                  NOT EXISTS(SELECT 1 FROM usuario u WHERE u.id_odontologo = o.id_odontologo AND u.estado <> 'ACTIVO') AS activo
             FROM odontologo o
            ORDER BY o.nombres ASC, o.apellidos ASC`,
        );
        return Object.freeze(resultado.filas.map((fila) => profesionalClinicoSql(fila, 'ODONTOLOGO')));
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible listar profesionales.');
      }
    },
  };
}

function parsearAlergia(descripcion: string, fechaRegistro: string): AlergiaAntecedente {
  const match = /^(.+?)\s*\[(LEVE|MODERADA|SEVERA)\]\s*:\s*(.+)$/.exec(descripcion);
  if (match) {
    return {
      sustancia: match[1]!.trim(),
      severidad: match[2]! as 'LEVE' | 'MODERADA' | 'SEVERA',
      reaccion: match[3]!.trim(),
      fechaRegistro,
    };
  }
  return {
    sustancia: descripcion.trim(),
    severidad: 'MODERADA',
    reaccion: 'Registrada en historial odontológico',
    fechaRegistro,
  };
}

function crearRepositorioAntecedentesMysql(ejecutor: EjecutorSql): NonNullable<PuertosClinicos['antecedentes']> {
  return {
    async porPaciente(pacienteId: UUID): Promise<AntecedentesClinicos> {
      try {
        const resultado = await ejecutor.consultar<Record<string, unknown>>(
          `SELECT a.id_publico, a.tipo, a.descripcion,
                  DATE_FORMAT(a.fecha_registro, '%Y-%m-%d') AS fecha_registro
             FROM antecedente a
             JOIN historial_clinico h ON h.id_historial = a.id_historial
             JOIN paciente p ON p.id_paciente = h.id_paciente
            WHERE p.id_publico = ?
            ORDER BY a.id_antecedente ASC`,
          [pacienteId],
        );
        const patologicos: string[] = [];
        const quirurgicos: string[] = [];
        const familiares: string[] = [];
        const alergias: AlergiaAntecedente[] = [];
        const medicamentosActuales: string[] = [];
        const registros: RegistroAntecedente[] = [];

        for (const fila of resultado.filas) {
          const tipo = String(fila.tipo ?? 'PATOLOGICO').toUpperCase();
          const descripcion = String(fila.descripcion ?? '').trim();
          const fechaRegistro = String(fila.fecha_registro ?? '').slice(0, 10);
          if (!descripcion) continue;
          registros.push({
            id: uuidPublico(fila.id_publico),
            tipo,
            descripcion,
            fecha_registro: fechaRegistro,
          });
          if (tipo === 'QUIRURGICO') {
            quirurgicos.push(descripcion);
          } else if (tipo === 'FAMILIAR') {
            familiares.push(descripcion);
          } else if (tipo === 'ALERGIA') {
            alergias.push(parsearAlergia(descripcion, fechaRegistro));
          } else if (tipo === 'MEDICAMENTO_ACTUAL') {
            medicamentosActuales.push(descripcion);
          } else {
            patologicos.push(descripcion);
          }
        }

        return {
          patologicos,
          quirurgicos,
          familiares,
          alergias,
          medicamentos_actuales: medicamentosActuales,
          registros,
        };
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar los antecedentes clínicos.');
      }
    },
  };
}

function crearRepositorioCatalogosMysql(ejecutor: EjecutorSql): NonNullable<PuertosClinicos['catalogos']> {
  return {
    async odontologia(): Promise<CatalogoOdontologico> {
      try {
        const [resDiag, resTrat, resMed] = await Promise.all([
          ejecutor.consultar<Record<string, unknown>>(
            'SELECT id_publico, codigo, nombre, descripcion FROM diagnostico ORDER BY codigo ASC, nombre ASC LIMIT 100',
          ),
          ejecutor.consultar<Record<string, unknown>>(
            'SELECT id_publico, nombre, descripcion FROM tratamiento ORDER BY nombre ASC LIMIT 100',
          ),
          ejecutor.consultar<Record<string, unknown>>(
            'SELECT id_publico, nombre_generico, presentacion, concentracion FROM medicamento ORDER BY nombre_generico ASC LIMIT 100',
          ),
        ]);

        const diagnosticosMap = new Map(
          CATALOGO_ODONTOLOGIA_BASE.diagnosticos.map((d) => [d.codigo.toUpperCase(), d]),
        );
        for (const fila of resDiag.filas) {
          const codigo = String(fila.codigo ?? '').trim() || `OD-DX-${String(fila.id_publico ?? '').slice(0, 6)}`;
          const nombre = String(fila.nombre ?? '').trim();
          if (!nombre) continue;
          diagnosticosMap.set(codigo.toUpperCase(), {
            id: String(fila.id_publico ?? codigo),
            codigo,
            nombre,
            ...(fila.descripcion ? { descripcion: String(fila.descripcion) } : {}),
          });
        }

        const procedimientosMap = new Map(
          CATALOGO_ODONTOLOGIA_BASE.procedimientos.map((p) => [p.nombre.toLocaleLowerCase(), p]),
        );
        let idxProc = CATALOGO_ODONTOLOGIA_BASE.procedimientos.length + 1;
        for (const fila of resTrat.filas) {
          const nombre = String(fila.nombre ?? '').trim();
          if (!nombre || procedimientosMap.has(nombre.toLocaleLowerCase())) continue;
          const costo = fila.costo_base !== null && fila.costo_base !== undefined ? Number(fila.costo_base) : 250;
          procedimientosMap.set(nombre.toLocaleLowerCase(), {
            codigo: `OD-${String(idxProc++).padStart(3, '0')}`,
            nombre,
            descripcion: fila.descripcion ? String(fila.descripcion) : 'Tratamiento odontológico registrado en catálogo.',
            tarifaQuetzales: Number.isFinite(costo) && costo > 0 ? costo : 250,
            duracionMinutos: 40,
            requiereAnestesia: false,
          });
        }

        const medicamentosMap = new Map(
          CATALOGO_ODONTOLOGIA_BASE.medicamentos.map((m) => [m.nombre.toLocaleLowerCase(), m]),
        );
        for (const fila of resMed.filas) {
          const nombreGen = String(fila.nombre_generico ?? '').trim();
          if (!nombreGen) continue;
          const conc = fila.concentracion ? String(fila.concentracion).trim() : '';
          const nombreCompleto = conc && !nombreGen.toLocaleLowerCase().includes(conc.toLocaleLowerCase())
            ? `${nombreGen} ${conc}`
            : nombreGen;
          if (medicamentosMap.has(nombreCompleto.toLocaleLowerCase())) continue;
          medicamentosMap.set(nombreCompleto.toLocaleLowerCase(), {
            id: String(fila.id_publico ?? nombreCompleto),
            nombre: nombreCompleto,
            principio_activo: nombreGen,
            ...(fila.presentacion ? { presentacion: String(fila.presentacion) } : {}),
            dosis_sugerida: conc || '1 unidad',
            frecuencia_sugerida: 'Cada 8 horas',
            duracion_sugerida: '5 días',
            via_administracion: 'ORAL',
          });
        }

        return {
          diagnosticos: [...diagnosticosMap.values()],
          procedimientos: [...procedimientosMap.values()],
          medicamentos: [...medicamentosMap.values()],
        };
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar el catálogo odontológico.');
      }
    },
  };
}

export function crearPuertosClinicosMysql(ejecutor: EjecutorSql): PuertosClinicos {
  return {
    pacientes: new RepositorioPacientesMysql(ejecutor),
    profesionales: crearRepositorioProfesionalesMysql(ejecutor),
    consultas: new RepositorioConsultasMysql(ejecutor),
    citas: new RepositorioCitasMysql(ejecutor),
    antecedentes: crearRepositorioAntecedentesMysql(ejecutor),
    catalogos: crearRepositorioCatalogosMysql(ejecutor),
    responsables: {
      async autorizacion() {
        // La autorización pediátrica vive en Firestore; odontología no admite responsables.
        return null;
      },
    },
    async secretariaGestoraActor(actorId: UUID): Promise<string | null> {
      try {
        const res = await ejecutor.consultar<{ nombre: string | null }>(
          `SELECT NULLIF(TRIM(CONCAT_WS(' ', s.nombres, s.apellidos)), '') AS nombre
             FROM usuario u
             JOIN secretaria s ON s.id_secretaria = u.id_secretaria
            WHERE u.id_publico = ? LIMIT 1`,
          [actorId],
        );
        return res.filas[0]?.nombre ? String(res.filas[0].nombre) : null;
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar la secretaria gestora.');
      }
    },
  };
}
