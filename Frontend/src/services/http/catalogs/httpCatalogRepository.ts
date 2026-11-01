import type { CatalogRepository } from '../../contracts';
import type {
  CatalogoOdontologiaDTO,
  InstitucionId,
  MedicoCatalogo,
  ProcedimientoOdontologico,
} from '../../types';
import { createApiAdapterUnavailableError } from '../../../app/ServiceContext';
import { HttpClient } from '../httpClient';

export function createHttpCatalogRepository(http: HttpClient): CatalogRepository {
  const methods = {
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
