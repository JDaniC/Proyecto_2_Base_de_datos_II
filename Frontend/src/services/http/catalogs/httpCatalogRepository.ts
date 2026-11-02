import type { CatalogRepository } from '../../contracts';
import type {
  CatalogoOdontologiaDTO,
  CatalogoHospitalDTO,
  InstitucionId,
  MedicoCatalogo,
  ProcedimientoOdontologico,
} from '../../types';
import { createApiAdapterUnavailableError } from '../../../app/ServiceContext';
import { HttpClient } from '../httpClient';

export function createHttpCatalogRepository(http: HttpClient): CatalogRepository {
  async function hospital(institucion: InstitucionId): Promise<CatalogoHospitalDTO> {
    if (institucion !== 'HOSPITAL_GENERAL') throw createApiAdapterUnavailableError('catalogRepository','obtenerCatalogoHospital',501,'NOT_IMPLEMENTED');
    const r = (await http.get<{examenes: Record<string,unknown>[]; aseguradoras: Record<string,unknown>[]; procedimientos: CatalogoHospitalDTO['procedimientos']; especialidades: CatalogoHospitalDTO['especialidades']; medicamentos: CatalogoHospitalDTO['medicamentos']}>('/hospital/servicios/catalogos')).data;
    return {...r,examenes:r.examenes.map(e=>({...e,id:String(e.id),codigoPrueba:`EX-${String(e.id).slice(0,8)}`,nombre:String(e.nombre),seccion:String(e.seccion??''),tipoMuestra:String(e.tipoMuestra),metodoAnalitico:String(e.metodoAnalitico),version:Number(e.version),tiempoEntregaHoras:Number(e.tiempoEntregaHoras),parametros:e.parametros as CatalogoHospitalDTO['examenes'][0]['parametros'],estado:e.activo?'ACTIVO':'INACTIVO'})),
      aseguradoras:r.aseguradoras.map(a=>({...a,id:String(a.id),nombre:String(a.nombre),codigoAseguradora:String(a.id).slice(0,8),telefonoAutorizaciones:String(a.telefonoAutorizaciones??''),estado:a.estado==='ACTIVA'?'ACTIVO':'INACTIVO',planes:a.planes as CatalogoHospitalDTO['aseguradoras'][0]['planes']}))};
  }
  const methods = {
    obtenerCatalogoHospital: hospital,
    obtenerPruebasLaboratorio: async (institucion: InstitucionId) => (await hospital(institucion)).examenes,
    obtenerAseguradoras: async (institucion: InstitucionId) => (await hospital(institucion)).aseguradoras,
    async obtenerMedicos(_institucionId: InstitucionId): Promise<MedicoCatalogo[]> {
      const res = await http.get<MedicoCatalogo[]>('/catalogos/medicos');
      return res.data;
    },
    async obtenerProcedimientosOdontologicos(
      _institucionId: InstitucionId
    ): Promise<ProcedimientoOdontologico[]> {
      const res = await http.get<ProcedimientoOdontologico[]>('/catalogos/procedimientos-odontologicos');
      return res.data;
    },
    async obtenerCatalogoOdontologia(
      _institucionId: InstitucionId
    ): Promise<CatalogoOdontologiaDTO> {
      const res = await http.get<CatalogoOdontologiaDTO>('/catalogos/odontologia');
      return res.data;
    },
  };

  return new Proxy(methods as unknown as CatalogRepository, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      return async () => {
        throw createApiAdapterUnavailableError(
          'catalogRepository',
          String(prop),
          503,
          'PERSISTENCIA_NO_DISPONIBLE'
        );
      };
    },
  });
}
