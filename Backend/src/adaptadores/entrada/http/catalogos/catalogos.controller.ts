import { Controller, Get } from '@nestjs/common';
import { Bundle, Contexto, RequiereAcceso } from '../decoradores-auth.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import { ConsultarCatalogosClinicos } from '../../../../aplicacion/casos-uso/clinica/consultar-catalogos-clinicos.js';

const ESPECIALIDAD_POR_ROL: Readonly<Record<string, string>> = {
  ODONTOLOGO: 'Odontología General y Restauradora',
  MEDICO: 'Medicina General y Hospitalaria',
  PEDIATRA: 'Pediatría Integral',
  MEDICO_LABORATORIO: 'Patología Clínica y Laboratorio',
};

@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogos: ConsultarCatalogosClinicos) {}

  @Get('medicos')
  @RequiereAcceso({
    permisos: ['citas.administrar', 'consultas.registrar', 'historial.leer'],
    modo: 'ALGUNO',
  })
  async listarMedicos(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
  ) {
    const profesionales = await this.catalogos.listarProfesionales(contexto, bundle);
    return profesionales.map((prof) => ({
      id: prof.id,
      institucionId: bundle.institucion === 'CENTRO_MEDICO_PEDIATRICO' ? 'CENTRO_PEDIATRICO' : bundle.institucion,
      nombre: prof.nombre,
      nombreCompleto: prof.nombre,
      especialidad: prof.especialidades?.[0] ?? (bundle.institucion==='HOSPITAL_GENERAL'?'Sin especialidad registrada':ESPECIALIDAD_POR_ROL[prof.rol] ?? prof.rol),
      especialidadPrincipal: prof.especialidades?.[0] ?? (bundle.institucion==='HOSPITAL_GENERAL'?'Sin especialidad registrada':ESPECIALIDAD_POR_ROL[prof.rol] ?? prof.rol),
      especialidadesSecundarias: prof.especialidades?.slice(1)??[],
      colegiado: prof.colegiado,
      entidadColegiacion: prof.entidad_colegiacion,
      email: '',
      telefono: '',
      rol: prof.rol,
      horarioInicio: '08:00',
      horarioFin: '17:00',
      diasAtencion: [1, 2, 3, 4, 5, 6],
      estado: prof.activo ? 'ACTIVO' : 'INACTIVO',
    }));
  }

  @Get('procedimientos-odontologicos')
  @RequiereAcceso({
    permisos: ['citas.administrar', 'consultas.registrar', 'historial.leer'],
    modo: 'ALGUNO',
  })
  async listarProcedimientosOdontologicos(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
  ) {
    const catalogo = await this.catalogos.obtenerCatalogoOdontologia(contexto, bundle);
    return catalogo.procedimientos;
  }

  @Get('odontologia')
  @RequiereAcceso({
    permisos: ['consultas.registrar', 'historial.leer'],
    modo: 'ALGUNO',
  })
  async obtenerCatalogoOdontologia(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
  ) {
    return this.catalogos.obtenerCatalogoOdontologia(contexto, bundle);
  }
}
