import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { validarPermiso, validarPrescriptorClinico } from '../../../dominio/clinica/politicas-institucionales.js';
import {
  validarAnulacionAplicacion,
  type AplicacionVacuna,
  validarIdAplicacion,
} from '../../../dominio/pediatria/vacunas.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import {
  contextoVigente,
  type DependenciasClinicas,
  type ParametrosClinicos,
} from '../consultas/atencion-clinica.js';

export class AnularAplicacionVacuna {
  constructor(private readonly deps: DependenciasClinicas) {}

  async ejecutar(aplicacionId: string, p: ParametrosClinicos): Promise<import('../../puertos/nucleo.js').ResultadoDurable<AplicacionVacuna>> {
    if (p.contexto.cuenta.institucion !== 'CENTRO_MEDICO_PEDIATRICO' || p.bundle.institucion !== 'CENTRO_MEDICO_PEDIATRICO') {
      throw new ErrorDominio('SIN_PERMISO', 'Operación exclusiva de pediatría.');
    }
    validarPermiso(p.contexto.cuenta, 'consultas.registrar');

    aplicacionId = validarIdAplicacion(aplicacionId);
    const entrada = validarAnulacionAplicacion(p.entrada);

    const comando = await prepararComandoEstable(
      p.claveIdempotencia,
      'pediatria.vacunas.anular',
      { aplicacionId, entrada },
      ['auditoria', 'revision'],
      this.deps
    );

    if (!p.bundle.uow) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Persistencia no disponible.');
    }

    return p.bundle.uow.ejecutar<AplicacionVacuna>(p.contexto, comando, async (lector) => {
      const contexto = await contextoVigente(lector, p.contexto);
      validarPermiso(contexto.cuenta, 'consultas.registrar');

      const previa = await lector.operaciones.porClave<AplicacionVacuna>(
        contexto.cuenta.id,
        comando.caso,
        comando.claveIdempotencia
      );
      if (previa) {
        if (previa.hashEntrada !== comando.hashEntrada) {
          throw new ErrorDominio('CLAVE_REUTILIZADA', 'La clave corresponde a otra intención.');
        }
        return { tipo: 'REPETIR', operacion: previa };
      }

      if (!contexto.cuenta.profesional) {
        throw new ErrorDominio('SIN_PERMISO', 'La cuenta debe tener un profesional de la salud vinculado.');
      }
      if (!lector.clinica) {
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Lectura clínica no disponible.');
      }
      const profesional = await lector.clinica.profesionales.porId(contexto.cuenta.profesional.id);
      if (!profesional) {
        throw new ErrorDominio('SIN_PERMISO', 'Profesional no encontrado.');
      }
      validarPrescriptorClinico(
        { ...contexto.cuenta, profesionalVinculado: contexto.cuenta.profesional },
        profesional
      );

      if (!lector.vacunasPediatricas) {
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Servicio de vacunas no disponible.');
      }

      const actual = await lector.vacunasPediatricas.obtenerPorId(aplicacionId);
      if (!actual) {
        throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Aplicación de vacuna no encontrada.');
      }
      if (actual.estado === 'ANULADA') {
        throw new ErrorDominio('ESTADO_INVALIDO', 'La aplicación de vacuna ya fue anulada previamente.');
      }
      if (actual.version !== entrada.versionEsperada) {
        throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La aplicación de vacuna cambió concurrentemente.');
      }

      const anulada: AplicacionVacuna = {
        ...actual,
        estado: 'ANULADA',
        motivoAnulacion: entrada.motivo,
        version: versionPositiva(actual.version + 1),
      };

      const cambios: import('../../puertos/nucleo.js').CambioPlanificado[] = [
        {
          agregado: 'aplicacionVacuna',
          tipo: 'ACTUALIZAR',
          recursoId: uuidPublico(actual.pacienteId),
          versionAnterior: versionPositiva(actual.version),
          nuevoEstado: {
            actual: anulada,
            anterior: actual,
            revisionId: comando.ids.revision!,
            motivo: entrada.motivo,
          },
        },
      ];

      return {
        tipo: 'CONFIRMAR',
        cambios,
        revisiones: [],
        auditoria: [
          {
            id: comando.ids.auditoria!,
            actorId: contexto.cuenta.id,
            caso: comando.caso,
            recursoId: uuidPublico(actual.pacienteId),
            fechaHora: comando.instante,
            correlacion: contexto.correlacion,
          },
        ],
        resultado: {
          httpStatus: 200,
          respuesta: anulada,
          correlacionOriginal: contexto.correlacion,
        },
      };
    });
  }
}
