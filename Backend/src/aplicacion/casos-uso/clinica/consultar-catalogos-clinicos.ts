import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { ProfesionalClinico } from '../../../dominio/clinica/consulta.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import type { CatalogoOdontologico } from '../../puertos/clinica.js';
import { exigirClinica } from '../consultas/atencion-clinica.js';

export const CATALOGO_ODONTOLOGIA_BASE: CatalogoOdontologico = {
  diagnosticos: [
    {
      id: 'diag-k021',
      codigo: 'K02.1',
      nombre: 'Caries de la dentina',
      descripcion: 'Lesión cariosa cavitada que compromete esmalte y dentina.',
    },
    {
      id: 'diag-k040',
      codigo: 'K04.0',
      nombre: 'Pulpitis reversible / irreversible',
      descripcion: 'Inflamación pulpar asociada a caries profunda o trauma dental.',
    },
    {
      id: 'diag-k050',
      codigo: 'K05.0',
      nombre: 'Gingivitis aguda inducida por biofilm',
      descripcion: 'Inflamación gingival con sangrado al sondaje sin pérdida de inserción.',
    },
    {
      id: 'diag-k053',
      codigo: 'K05.3',
      nombre: 'Periodontitis crónica localizada',
      descripcion: 'Pérdida de soporte periodontal con bolsas mayores a 4 mm.',
    },
    {
      id: 'diag-k083',
      codigo: 'K08.3',
      nombre: 'Raíz dental retenida / resto radicular',
      descripcion: 'Fragmento radicular remanente con indicación de exodoncia.',
    },
  ],
  procedimientos: [
    {
      codigo: 'OD-001',
      nombre: 'Profilaxis y destartraje supragingival',
      descripcion: 'Eliminación ultrasónica y manual de placa bacteriana y cálculo.',
      tarifaQuetzales: 250,
      duracionMinutos: 40,
      requiereAnestesia: false,
    },
    {
      codigo: 'OD-002',
      nombre: 'Restauración con resina compuesta fotocurada',
      descripcion: 'Obturación adhesiva estética en cavidad clase I/II/III.',
      tarifaQuetzales: 350,
      duracionMinutos: 45,
      requiereAnestesia: true,
    },
    {
      codigo: 'OD-003',
      nombre: 'Endodoncia unirradicular / birradicular',
      descripcion: 'Biopulpectomía, instrumentación biomecánica y obturación radicular.',
      tarifaQuetzales: 1200,
      duracionMinutos: 75,
      requiereAnestesia: true,
    },
    {
      codigo: 'OD-004',
      nombre: 'Exodoncia simple',
      descripcion: 'Extracción dental cerrada bajo anestesia infiltrativa o troncular.',
      tarifaQuetzales: 300,
      duracionMinutos: 35,
      requiereAnestesia: true,
    },
    {
      codigo: 'OD-005',
      nombre: 'Aplicación tópica de barniz fluorado',
      descripcion: 'Remineralización preventiva de esmalte dental.',
      tarifaQuetzales: 180,
      duracionMinutos: 20,
      requiereAnestesia: false,
    },
  ],
  medicamentos: [
    {
      id: 'med-amox-500',
      nombre: 'Amoxicilina 500 mg',
      principio_activo: 'Amoxicilina trihidratada',
      presentacion: 'Cápsula 500 mg',
      concentracion: '500 mg',
      dosis_sugerida: '500 mg',
      frecuencia_sugerida: 'Cada 8 horas',
      duracion_sugerida: '7 días',
      via_administracion: 'ORAL',
    },
    {
      id: 'med-ibu-400',
      nombre: 'Ibuprofeno 400 mg',
      principio_activo: 'Ibuprofeno',
      presentacion: 'Tableta recubierta 400 mg',
      concentracion: '400 mg',
      dosis_sugerida: '400 mg',
      frecuencia_sugerida: 'Cada 8 horas',
      duracion_sugerida: '5 días',
      via_administracion: 'ORAL',
    },
    {
      id: 'med-clorhex-012',
      nombre: 'Clorhexidina digluconato 0.12%',
      principio_activo: 'Clorhexidina',
      presentacion: 'Colutorio frasco 250 ml',
      concentracion: '0.12%',
      dosis_sugerida: '15 ml en enjuague bucal sin diluir',
      frecuencia_sugerida: 'Cada 12 horas',
      duracion_sugerida: '10 días',
      via_administracion: 'TOPICA',
    },
    {
      id: 'med-ketorolaco-10',
      nombre: 'Ketorolaco trometamina 10 mg',
      principio_activo: 'Ketorolaco',
      presentacion: 'Tableta 10 mg',
      concentracion: '10 mg',
      dosis_sugerida: '10 mg',
      frecuencia_sugerida: 'Cada 8 horas según dolor',
      duracion_sugerida: '3 días',
      via_administracion: 'ORAL',
    },
  ],
};

export class ConsultarCatalogosClinicos {
  private verificarAccesoLectura(contexto: ContextoAutenticado, bundle: BundleInstitucional): void {
    if (
      contexto.cuenta.estado !== 'ACTIVA' ||
      bundle.institucion !== contexto.cuenta.institucion ||
      !contexto.cuenta.permisos.some(
        (p) => p === 'citas.administrar' || p === 'consultas.registrar' || p === 'historial.leer',
      )
    ) {
      throw new ErrorDominio('SIN_PERMISO', 'Sin permiso para consultar catálogos clínicos.');
    }
  }

  async listarProfesionales(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
  ): Promise<readonly ProfesionalClinico[]> {
    this.verificarAccesoLectura(contexto, bundle);
    const clinica = exigirClinica(bundle);
    if (!clinica.profesionales.listar) {
      return [];
    }
    return clinica.profesionales.listar();
  }

  async obtenerCatalogoOdontologia(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
  ): Promise<CatalogoOdontologico> {
    if (
      contexto.cuenta.estado !== 'ACTIVA' ||
      bundle.institucion !== contexto.cuenta.institucion ||
      !contexto.cuenta.permisos.some((p) => p === 'consultas.registrar' || p === 'historial.leer')
    ) {
      throw new ErrorDominio('SIN_PERMISO', 'Sin permiso para consultar catálogos clínicos.');
    }
    const clinica = exigirClinica(bundle);
    if (!clinica.catalogos) {
      return CATALOGO_ODONTOLOGIA_BASE;
    }
    return clinica.catalogos.odontologia();
  }
}
