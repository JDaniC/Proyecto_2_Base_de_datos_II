import { stableCommandKeys } from '../stableCommand';
import { mapVaccine, type VaccineDto } from '../pediatrics/httpVaccineRepository';
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
  const commandKey=stableCommandKeys();
  const doses=(d:import('../../types').VacunaCatalogo['dosis'])=>d.map(x=>({dosisId:x.dosisId,numero:x.numeroDosis,edadMesesRecomendada:x.edadRecomendadaMeses}));
  const methods = {
    async crearVacuna(_i:InstitucionId,v:Omit<import('../../types').VacunaCatalogo,'id'>){const body={nombre:v.nombreVacuna,enfermedadObjetivo:v.enfermedadPrevenida,fabricante:v.fabricante,dosis:doses(v.dosis)};return mapVaccine((await http.post<VaccineDto>('/vacunas',body,{idempotencyKey:commandKey('/vacunas',body)})).data);},
    async crearVersionEsquemaVacuna(_i:InstitucionId,id:string,_label:string,d:import('../../types').VacunaCatalogo['dosis']){const catalogo=(await http.get<VaccineDto[]>('/vacunas')).data;const v=catalogo.find(v=>v.id===id);if(!v)throw new Error('Vacuna no disponible. Recarga el catálogo.');const route=`/vacunas/${encodeURIComponent(id)}/versiones`,body={nombre:v.nombre,enfermedadObjetivo:v.enfermedadObjetivo,fabricante:v.fabricante,dosis:doses(d),versionEsquemaAnterior:_label};return mapVaccine((await http.post<VaccineDto>(route,body,{idempotencyKey:commandKey(route,body)})).data);},
    async obtenerVacunas() { return (await http.get<VaccineDto[]>('/vacunas')).data.map(mapVaccine); },
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
