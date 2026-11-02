import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import type { Paciente } from '../../../dominio/clinica/paciente.js';
import {
  calcularEstadoDosis,
  type ItemEsquemaPaciente,
} from '../../../dominio/pediatria/vacunas.js';
import { edadMesesEnFecha } from '../../../dominio/pediatria/crecimiento.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';

export interface ResumenEsquemaVacunacion {
  readonly items: readonly ItemEsquemaPaciente[];
  readonly totalDosis: number;
  readonly dosisAplicadas: number;
  readonly dosisPendientes: number;
  readonly dosisFuturas: number;
  readonly porcentajeCobertura: number;
}

export class ConsultarEsquemaVacunas {
  async ejecutar(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    pacienteId: string,
  ): Promise<ResumenEsquemaVacunacion> {
    if (contexto.cuenta.institucion !== 'CENTRO_MEDICO_PEDIATRICO' || bundle.institucion !== 'CENTRO_MEDICO_PEDIATRICO') {
      throw new ErrorDominio('SIN_PERMISO', 'Operación exclusiva de pediatría.');
    }
    validarPermiso(contexto.cuenta, 'historial.leer');

    const pid = uuidPublico(pacienteId);
    if (!bundle.pacientes || !bundle.vacunasPediatricas) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Servicio de vacunas no disponible.');
    }

    const paciente = (await bundle.pacientes.porId(pid)) as Paciente | null;
    if (!paciente) {
      throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Paciente no encontrado.');
    }

    const hoy = new Date().toISOString().slice(0, 10);
    const edadMeses = edadMesesEnFecha(paciente.fechaNacimiento, hoy);

    const [catalogoVacunas, esquemasAsignados, aplicaciones] = await Promise.all([
      bundle.vacunasPediatricas.obtenerCatalogo(),
      bundle.vacunasPediatricas.obtenerEsquemas(pid),
      bundle.vacunasPediatricas.obtenerAplicaciones(pid),
    ]);

    const aplicacionesVigentes = aplicaciones.filter((a) => a.estado === 'APLICADA');
    const items: ItemEsquemaPaciente[] = [];

    for (const vac of catalogoVacunas) {
      const esquemaAsignado = esquemasAsignados.find((e) => e.vacunaId === vac.id && e.estado === 'ACTIVO');
      if (!esquemaAsignado) continue;
      const verDoc = await bundle.vacunasPediatricas.obtenerVersionEsquema(uuidPublico(vac.id), uuidPublico(esquemaAsignado.versionId));
      if (!verDoc || verDoc.dosis.length === 0) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Esquema asignado no disponible.');
      const dosisLista = verDoc.dosis;

      for (const d of dosisLista) {
        const appVigente = aplicacionesVigentes.find(
          (a) => a.vacunaId === vac.id && a.dosisId === d.dosisId
        );
        const { estado, diasRetraso } = calcularEstadoDosis(d, edadMeses, appVigente, paciente.fechaNacimiento!, hoy);

        items.push({
          vacunaId: vac.id,
          versionEsquemaId: esquemaAsignado.versionId,
          nombreVacuna: verDoc.nombre,
          enfermedadObjetivo: verDoc.enfermedadObjetivo,
          fabricante: verDoc.fabricante,
          dosisId: d.dosisId,
          numeroDosis: d.numero,
          etiquetaDosis: d.etiquetaDosis || `Dosis ${d.numero}`,
          edadRecomendadaMeses: d.edadMesesRecomendada,
          estado,
          diasRetraso,
          aplicacionVigente: appVigente,
        });
      }
    }

    const totalDosis = items.length;
    const dosisAplicadas = items.filter((i) => i.estado === 'APLICADA').length;
    const dosisPendientes = items.filter((i) => i.estado === 'PENDIENTE').length;
    const dosisFuturas = items.filter((i) => i.estado === 'FUTURA').length;
    const porcentajeCobertura = totalDosis > 0 ? Math.round((dosisAplicadas / totalDosis) * 100) : 0;

    return {
      items,
      totalDosis,
      dosisAplicadas,
      dosisPendientes,
      dosisFuturas,
      porcentajeCobertura,
    };
  }
}
