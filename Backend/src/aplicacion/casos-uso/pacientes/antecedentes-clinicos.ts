import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico, type UUID } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import {
  validarOperacionHistorial,
  validarPermiso,
  validarPrescriptorClinico,
} from '../../../dominio/clinica/politicas-institucionales.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import type { AlergiaAntecedente, AntecedentesClinicos, RegistroAntecedente } from '../../puertos/clinica.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import {
  contextoVigente,
  exigirClinica,
  exigirVersion,
  siguienteVersion,
  type DependenciasClinicas,
  type ParametrosClinicos,
} from '../consultas/atencion-clinica.js';

const ANTECEDENTES_VACIOS: AntecedentesClinicos = {
  patologicos: [],
  quirurgicos: [],
  familiares: [],
  alergias: [],
  medicamentos_actuales: [],
  registros: [],
};

function normalizarListaTextos(valor: unknown, campo: string): readonly string[] {
  if (valor === undefined) return [];
  if (!Array.isArray(valor) || valor.length > 50) {
    throw solicitudInvalida(`El campo ${campo} debe ser un arreglo válido.`, campo);
  }
  return valor.map((item, idx) => textoClinico(item, `${campo}[${idx}]`, 500));
}

function normalizarAlergias(valor: unknown): readonly AlergiaAntecedente[] {
  if (valor === undefined) return [];
  if (!Array.isArray(valor) || valor.length > 50) {
    throw solicitudInvalida('El campo alergias debe ser un arreglo válido.', 'alergias');
  }
  return valor.map((item, idx) => {
    const obj = objetoCerrado(item, ['sustancia', 'severidad', 'reaccion', 'fechaRegistro']);
    const sustancia = textoClinico(obj.sustancia, `alergias[${idx}].sustancia`, 200);
    const severidadRaw = obj.severidad === undefined ? 'MODERADA' : String(obj.severidad);
    if (severidadRaw !== 'LEVE' && severidadRaw !== 'MODERADA' && severidadRaw !== 'SEVERA') {
      throw solicitudInvalida('Severidad de alergia inválida.', `alergias[${idx}].severidad`);
    }
    const reaccion = obj.reaccion === undefined ? 'Sin especificar' : textoClinico(obj.reaccion, `alergias[${idx}].reaccion`, 300);
    return {
      sustancia,
      severidad: severidadRaw,
      reaccion,
    };
  });
}

export class ConsultarAntecedentesClinicos {
  async ejecutar(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    pacienteIdRaw: unknown,
  ): Promise<AntecedentesClinicos & { readonly version_paciente: number }> {
    validarPermiso(contexto.cuenta, 'historial.leer');
    if (bundle.institucion !== contexto.cuenta.institucion) {
      throw new ErrorDominio('SIN_PERMISO', 'Ámbito incompatible.');
    }
    const pacienteId = uuidPublico(pacienteIdRaw, 'id');
    const clinica = exigirClinica(bundle);
    const paciente = await clinica.pacientes.porId(pacienteId);
    if (!paciente || paciente.institucion !== bundle.institucion) {
      throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Paciente no encontrado.');
    }
    if (!clinica.antecedentes) {
      throw new ErrorDominio(
        'PERSISTENCIA_NO_DISPONIBLE',
        'La institución no soporta consulta de antecedentes clínicos directos.'
      );
    }
    const base = await clinica.antecedentes.porPaciente(pacienteId);
    return {
      ...base,
      version_paciente: paciente.version,
    };
  }
}

export class ActualizarAntecedentesClinicos {
  constructor(private readonly deps: DependenciasClinicas) {}

  async ejecutar(p: ParametrosClinicos) {
    if (p.bundle.institucion !== p.contexto.cuenta.institucion) {
      throw new ErrorDominio('SIN_PERMISO', 'Ámbito incompatible.');
    }
    const clinicaBundle = exigirClinica(p.bundle);
    if (!clinicaBundle.antecedentes) {
      throw new ErrorDominio(
        'PERSISTENCIA_NO_DISPONIBLE',
        'La institución no soporta gestión de antecedentes clínicos directos.'
      );
    }
    validarPermiso(p.contexto.cuenta, 'consultas.registrar');
    const pacienteId = uuidPublico(p.id, 'id');
    const e = objetoCerrado(p.entrada, [
      'version_esperada',
      'patologicos',
      'quirurgicos',
      'familiares',
      'alergias',
      'medicamentos_actuales',
    ]);
    const versionEsperada = versionPositiva(e.version_esperada, 'version_esperada');
    const patologicos = normalizarListaTextos(e.patologicos, 'patologicos');
    const quirurgicos = normalizarListaTextos(e.quirurgicos, 'quirurgicos');
    const familiares = normalizarListaTextos(e.familiares, 'familiares');
    const alergias = normalizarAlergias(e.alergias);
    const medicamentosActuales = normalizarListaTextos(e.medicamentos_actuales, 'medicamentos_actuales');

    const totalItems =
      patologicos.length +
      quirurgicos.length +
      familiares.length +
      alergias.length +
      medicamentosActuales.length;
    const etiquetasReserva = ['revision', 'auditoria', ...Array.from({ length: totalItems }, (_, i) => `ant_${i}`)];

    const comando = await prepararComandoEstable(
      p.claveIdempotencia,
      'paciente.antecedentes.actualizar',
      { id: pacienteId, entrada: e },
      etiquetasReserva,
      this.deps,
    );

    if (!p.bundle.uow) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Unidad de trabajo no disponible.');
    }

    return p.bundle.uow.ejecutar<AntecedentesClinicos & { readonly version_paciente: number }>(
      p.contexto,
      comando,
      async (lector) => {
        const contexto = await contextoVigente(lector, p.contexto);
        validarPermiso(contexto.cuenta, 'consultas.registrar');
        const clinica = exigirClinica(lector);
        if (!clinica.antecedentes) {
          throw new ErrorDominio(
            'PERSISTENCIA_NO_DISPONIBLE',
            'La institución no soporta gestión de antecedentes clínicos directos.'
          );
        }
        const previa = await lector.operaciones.porClave<AntecedentesClinicos & { readonly version_paciente: number }>(
          contexto.cuenta.id,
          comando.caso,
          comando.claveIdempotencia,
        );
        if (previa) {
          if (previa.hashEntrada !== comando.hashEntrada) {
            throw new ErrorDominio('CLAVE_REUTILIZADA', 'La clave ya se usó con otra intención.');
          }
          return { tipo: 'REPETIR', operacion: previa };
        }

        const profesional = contexto.cuenta.profesional?.id
          ? await clinica.profesionales.porId(contexto.cuenta.profesional.id)
          : null;
        if (!profesional) {
          throw new ErrorDominio('SIN_PERMISO', 'Se requiere profesional vigente.');
        }
        validarPrescriptorClinico(
          {
            institucion: p.bundle.institucion,
            roles: contexto.cuenta.roles,
            ...(contexto.cuenta.profesional ? { profesionalVinculado: contexto.cuenta.profesional } : {}),
          },
          profesional,
        );

        const paciente = await clinica.pacientes.porId(pacienteId);
        if (!paciente || paciente.institucion !== p.bundle.institucion) {
          throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Paciente no encontrado.');
        }
        validarOperacionHistorial(paciente.estado, 'NUEVA_ATENCION');
        exigirVersion(paciente.version, versionEsperada);

        const anterior = clinica.antecedentes
          ? await clinica.antecedentes.porPaciente(pacienteId)
          : ANTECEDENTES_VACIOS;

        // Reutilizar id y fecha_registro de registros preexistentes para preservar identidad e historia
        // Usar cola por clave para consumir cada registro exactamente una vez y no repetir id_publico
        const mapaAnteriores = new Map<string, Array<{ id: UUID; fecha_registro: string }>>();
        for (const reg of anterior.registros) {
          const clave = `${reg.tipo.toUpperCase()}:${reg.descripcion.trim().toLowerCase()}`;
          const cola = mapaAnteriores.get(clave) ?? [];
          cola.push({ id: reg.id, fecha_registro: reg.fecha_registro });
          mapaAnteriores.set(clave, cola);
        }

        let idx = 0;
        const fechaHoy = comando.instante.slice(0, 10);
        const resolverRegistro = (tipo: string, descripcion: string): RegistroAntecedente => {
          const clave = `${tipo.toUpperCase()}:${descripcion.trim().toLowerCase()}`;
          const cola = mapaAnteriores.get(clave);
          const existente = cola && cola.length > 0 ? cola.shift() : undefined;
          if (existente) {
            return {
              id: existente.id,
              tipo,
              descripcion,
              fecha_registro: existente.fecha_registro,
            };
          }
          return {
            id: comando.ids[`ant_${idx++}`]!,
            tipo,
            descripcion,
            fecha_registro: fechaHoy,
          };
        };

        const registros = [
          ...patologicos.map((desc) => resolverRegistro('PATOLOGICO', desc)),
          ...quirurgicos.map((desc) => resolverRegistro('QUIRURGICO', desc)),
          ...familiares.map((desc) => resolverRegistro('FAMILIAR', desc)),
          ...alergias.map((al) =>
            resolverRegistro('ALERGIA', `${al.sustancia} [${al.severidad}]: ${al.reaccion}`),
          ),
          ...medicamentosActuales.map((med) => resolverRegistro('MEDICAMENTO_ACTUAL', med)),
        ];

        const actual: AntecedentesClinicos = {
          patologicos,
          quirurgicos,
          familiares,
          alergias: alergias.map((a) => {
            const clave = `ALERGIA:${a.sustancia.trim().toLowerCase()} [${a.severidad}]: ${a.reaccion.trim().toLowerCase()}`;
            const cola = mapaAnteriores.get(clave);
            const existente = cola && cola.length > 0 ? cola[0] : undefined;
            return {
              ...a,
              fechaRegistro: a.fechaRegistro || existente?.fecha_registro || fechaHoy,
            };
          }),
          medicamentos_actuales: medicamentosActuales,
          registros,
        };

        const nuevaVersionPaciente = siguienteVersion(paciente.version);
        const respuesta = {
          ...actual,
          version_paciente: nuevaVersionPaciente,
        };

        return {
          tipo: 'CONFIRMAR',
          cambios: [
            {
              agregado: 'antecedentes',
              tipo: 'GUARDAR',
              recursoId: paciente.id,
              versionAnterior: paciente.version,
              nuevoEstado: actual,
            },
            {
              agregado: 'pacientes',
              tipo: 'AVANZAR_REVISION',
              recursoId: paciente.id,
              versionAnterior: paciente.version,
              nuevoEstado: { ...paciente, version: nuevaVersionPaciente },
            },
          ],
          revisiones: [
            {
              id: comando.ids.revision!,
              motivo: 'Actualización de antecedentes clínicos',
              agregado: 'pacientes',
              recursoId: paciente.id,
              versionAnterior: paciente.version,
              snapshotAnterior: { anterior, actual },
            },
          ],
          auditoria: [
            {
              id: comando.ids.auditoria!,
              actorId: contexto.cuenta.id,
              caso: comando.caso,
              recursoId: paciente.id,
              fechaHora: comando.instante,
              correlacion: contexto.correlacion,
              motivo: 'Actualización de antecedentes clínicos',
            },
          ],
          resultado: {
            httpStatus: 200,
            respuesta,
            correlacionOriginal: contexto.correlacion,
          },
        };
      },
    );
  }
}
