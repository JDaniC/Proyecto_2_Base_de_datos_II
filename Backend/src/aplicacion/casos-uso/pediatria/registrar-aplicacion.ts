import { edadMesesEnFecha } from '../../../dominio/pediatria/crecimiento.js';
import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { validarPermiso, validarPrescriptorClinico } from '../../../dominio/clinica/politicas-institucionales.js';
import type { Paciente } from '../../../dominio/clinica/paciente.js';
import {
  generarIdAplicacion,
  validarRegistroAplicacion,
  type AplicacionVacuna,
} from '../../../dominio/pediatria/vacunas.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import {
  contextoVigente,
  type DependenciasClinicas,
  type ParametrosClinicos,
} from '../consultas/atencion-clinica.js';

export class RegistrarAplicacionVacuna {
  constructor(private readonly deps: DependenciasClinicas) {}

  async ejecutar(p: ParametrosClinicos): Promise<import('../../puertos/nucleo.js').ResultadoDurable<AplicacionVacuna>> {
    if (p.contexto.cuenta.institucion !== 'CENTRO_MEDICO_PEDIATRICO' || p.bundle.institucion !== 'CENTRO_MEDICO_PEDIATRICO') {
      throw new ErrorDominio('SIN_PERMISO', 'Operación exclusiva de pediatría.');
    }
    validarPermiso(p.contexto.cuenta, 'consultas.registrar');

    const pid = uuidPublico(p.id);
    const entrada = validarRegistroAplicacion(p.entrada);
    const idApp = generarIdAplicacion(pid, entrada.vacunaId, entrada.dosisId);

    const comando = await prepararComandoEstable(
      p.claveIdempotencia,
      'pediatria.vacunas.aplicar',
      { pid, idApp, entrada },
      ['auditoria', 'evento', 'revision'],
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

      const paciente = (await lector.pacientes.porId(pid)) as Paciente | null;
      if (!paciente) {
        throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Paciente no encontrado.');
      }
      if (paciente.estado !== 'ACTIVO') {
        throw new ErrorDominio('ESTADO_INVALIDO', 'No se pueden registrar vacunas en un expediente archivado.');
      }

      if (!paciente.fechaNacimiento || entrada.fechaAplicacion < paciente.fechaNacimiento) {
        throw solicitudInvalida('La fecha de aplicación no puede preceder al nacimiento.', 'fechaAplicacion');
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

      const catalogo = await lector.vacunasPediatricas.obtenerCatalogo();
      const vacuna = catalogo.find((v) => v.id === entrada.vacunaId);
      if (!vacuna) {
        throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Vacuna no encontrada en el catálogo.');
      }
      const asignado = (await lector.vacunasPediatricas.obtenerEsquemas(pid)).find(e => e.vacunaId === vacuna.id && e.estado === 'ACTIVO');
      if (!asignado) throw solicitudInvalida('Debe asignar una versión de esquema antes de registrar la aplicación.');
      const esquema = await lector.vacunasPediatricas.obtenerVersionEsquema(uuidPublico(vacuna.id), uuidPublico(asignado.versionId));
      if (!esquema) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Versión asignada no disponible.');
      const dosis = esquema.dosis.find((d) => d.dosisId === entrada.dosisId);
      if (!dosis) {
        throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Dosis no encontrada para la vacuna especificada.');
      }

      // Regla CA11: Comprobación determinista de aplicación previa
      const aplicacionPrevia = await lector.vacunasPediatricas.obtenerPorId(idApp);
      if (aplicacionPrevia) {
        throw new ErrorDominio(
          'DOSIS_DUPLICADA',
          `Regla CA11: La dosis seleccionada ya fue administrada previamente a este menor (lote ${aplicacionPrevia.lote}).`
        );
      }

      if (entrada.fechaAplicacion > comando.instante.slice(0, 10)) throw solicitudInvalida('La aplicación no puede tener fecha futura.');
      if(edadMesesEnFecha(paciente.fechaNacimiento,entrada.fechaAplicacion)<dosis.edadMesesRecomendada)throw solicitudInvalida('La fecha precede a la edad de la dosis en el esquema asignado.');
      const edadDias = (Date.parse(entrada.fechaAplicacion) - Date.parse(paciente.fechaNacimiento!)) / 86400000;
      if ((dosis.limiteInferiorDias !== undefined && edadDias < dosis.limiteInferiorDias) || (dosis.limiteSuperiorDias !== undefined && edadDias > dosis.limiteSuperiorDias)) throw solicitudInvalida('La fecha está fuera del intervalo del esquema.');
      const nuevaAplicacion: AplicacionVacuna = {
        esquema,
        id: idApp,
        claveLogica: idApp,
        pacienteId: pid,
        vacunaId: entrada.vacunaId,
        dosisId: entrada.dosisId,
        versionEsquemaId: asignado.versionId,
        pediatraId: profesional.id,
        fechaAplicacion: entrada.fechaAplicacion,
        lote: entrada.lote,
        sitioAplicacion: entrada.sitioAnatomico,
        ...(entrada.observaciones ? {observaciones: entrada.observaciones} : {}),
        estado: 'APLICADA',
        version: versionPositiva(1),
      };

      const cambios: import('../../puertos/nucleo.js').CambioPlanificado[] = [
        {
          agregado: 'aplicacionVacuna',
          tipo: 'CREAR',
          recursoId: pid,
          versionAnterior: null,
          nuevoEstado: nuevaAplicacion,
        },
        {
          agregado: 'eventosHistorial',
          tipo: 'CREAR',
          recursoId: comando.ids.evento!,
          versionAnterior: null,
          nuevoEstado: {
            pacienteId: pid,
            id: comando.ids.evento!,
            tipo: 'VACUNA',
            fechaHora: comando.instante,
            recursoId: pid,
            titulo: `Vacuna aplicada: ${vacuna.nombre}`, 

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
            recursoId: pid,
            fechaHora: comando.instante,
            correlacion: contexto.correlacion,
          },
        ],
        resultado: {
          httpStatus: 201,
          respuesta: nuevaAplicacion,
          correlacionOriginal: contexto.correlacion,
        },
      };
    });
  }
}
