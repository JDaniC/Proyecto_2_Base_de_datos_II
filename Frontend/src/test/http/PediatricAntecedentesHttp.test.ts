import {afterEach,it,expect,vi} from 'vitest';
import {createHttpPatientRepository} from '../../services/http/patients/httpPatientRepository';
import {HttpClient} from '../../services/http/httpClient';
afterEach(()=>vi.unstubAllGlobals());
it('lectura pediátrica usa endpoint propio y no confunde registro vacío con verificación médica',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{version:0,alergias:[]}}),{status:200}));vi.stubGlobal('fetch',fetch);
 const a=await createHttpPatientRepository(new HttpClient()).obtenerAntecedentes!('CENTRO_PEDIATRICO','menor');
 expect(fetch.mock.calls[0][0]).toContain('/pacientes/menor/antecedentes-pediatricos');expect(a.verificacionAlergias).toBeUndefined();expect(a.versionAntecedentes).toBe(0);
});
it('historia desactivada no aparece como alergia activa y conserva ID para rectificación',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{version:3,alergias:[{id:'a',sustancia:'Polen',severidad:'LEVE',reaccion:'Sintética',activa:true,fechaHora:'2026-11-01T12:00:00Z',actorId:'medico'},{id:'b',sustancia:'Otra',activa:false}]}}),{status:200})));
 const a=await createHttpPatientRepository(new HttpClient()).obtenerAntecedentes!('CENTRO_PEDIATRICO','menor');expect(a.alergias).toHaveLength(1);expect(a.alergias[0].id).toBe('a');expect(a.versionAntecedentes).toBe(3);
});
it('falla de preparación conserva 503 sin listas vacías simuladas',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{codigo:'PERSISTENCIA_NO_DISPONIBLE',mensaje:'Preparación pendiente'}}),{status:503})));
 await expect(createHttpPatientRepository(new HttpClient()).obtenerAntecedentes!('CENTRO_PEDIATRICO','menor')).rejects.toMatchObject({status:503});
});
