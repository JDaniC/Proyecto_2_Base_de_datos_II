import {afterEach,it,expect,vi} from 'vitest';
import {createHttpVaccineRepository} from '../../services/http/pediatrics/httpVaccineRepository';
import {HttpClient} from '../../services/http/httpClient';
afterEach(()=>vi.unstubAllGlobals());
it('consulta esquema calculado por servidor sin enviar edad o institución del cliente',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{items:[]}}),{status:200}));vi.stubGlobal('fetch',fetch);
 expect(await createHttpVaccineRepository(new HttpClient()).obtenerEsquemaCompletoPaciente('CENTRO_PEDIATRICO','menor',999)).toEqual([]);
 expect(fetch.mock.calls[0][0]).toMatch(/\/pacientes\/menor\/esquemas$/);
});
it('reintento conserva intención, omite actor y campos de presentación',async()=>{
 const fetch=vi.fn().mockRejectedValue(new TypeError('offline'));vi.stubGlobal('fetch',fetch);
 const repo=createHttpVaccineRepository(new HttpClient());
 for(let i=0;i<2;i++)await expect(repo.registrarAplicacion('CENTRO_PEDIATRICO','menor',{vacunaId:'vacuna',dosisId:'dosis',fechaAplicacion:'2026-11-02',lote:'L',sitioAnatomico:'Brazo'},'Actor falso')).rejects.toMatchObject({status:503});
 const a=fetch.mock.calls[0][1],b=fetch.mock.calls[1][1];expect(a.headers['Idempotency-Key']).toBe(b.headers['Idempotency-Key']);expect(JSON.parse(a.body)).not.toHaveProperty('profesional');expect(a.body).toBe(b.body);
});
it('servicio caído propaga error y no representa cero vacunas',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{codigo:'PERSISTENCIA_NO_DISPONIBLE',mensaje:'No disponible'}}),{status:503})));
 await expect(createHttpVaccineRepository(new HttpClient()).obtenerAplicaciones('CENTRO_PEDIATRICO','menor')).rejects.toMatchObject({status:503});
});
it('asigna versión explícita y corrección envía revisión observada sin identidad de UI',async()=>{
 const app={id:'p__v__d',pacienteId:'p',vacunaId:'v',dosisId:'d',fechaAplicacion:'2026-11-02',lote:'L',sitioAplicacion:'Brazo',pediatraId:'profesional-verificado',estado:'APLICADA',version:3,versionEsquemaId:'anterior',esquema:{nombre:'Vacuna histórica',dosis:[{dosisId:'d',numero:2,etiquetaDosis:'Refuerzo histórico'}]}};
 const fetch=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({data:app}),{status:200}));vi.stubGlobal('fetch',fetch);
 const repo=createHttpVaccineRepository(new HttpClient());await repo.asignarEsquema!('p','v','anterior');
 expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({vacunaId:'v',versionId:'anterior'});
 const r=await repo.corregirAplicacion('CENTRO_PEDIATRICO','p__v__d',{lote:'L',motivo:'Rectificación sintética'},'Actor falso',2);
 expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({lote:'L',motivo:'Rectificación sintética',versionEsperada:2});
 expect(r.nombreVacuna).toBe('Vacuna histórica');expect(r.etiquetaDosis).toBe('Refuerzo histórico');expect(r.versionRegistro).toBe(3);
});
it('publica nueva versión preservando IDs dosis y versión anterior observada',async()=>{
 const {createHttpCatalogRepository}=await import('../../services/http/catalogs/httpCatalogRepository');
 const vacuna={id:'vacuna',nombre:'Vacuna sintética',enfermedadObjetivo:'Objetivo sintético',fabricante:'Fabricante sintético',versionVigente:'version-vieja',dosis:[{dosisId:'dosis-estable',numero:1,edadMesesRecomendada:2}]};
 const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({data:[vacuna]}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({data:{...vacuna,versionVigente:'version-nueva'}}),{status:201}));vi.stubGlobal('fetch',fetch);
 const r=await createHttpCatalogRepository(new HttpClient()).crearVersionEsquemaVacuna!('CENTRO_PEDIATRICO','vacuna','version-vieja',[{dosisId:'dosis-estable',numeroDosis:1,etiquetaDosis:'Primera',edadRecomendadaMeses:3}]);
 expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({nombre:vacuna.nombre,enfermedadObjetivo:vacuna.enfermedadObjetivo,fabricante:vacuna.fabricante,versionEsquemaAnterior:'version-vieja',dosis:[{dosisId:'dosis-estable',numero:1,edadMesesRecomendada:3}]});
 expect(r.esquemaVersion).toBe('version-nueva');expect(vacuna.versionVigente).toBe('version-vieja');
});
it('nueva administración con datos idénticos tras anular usa clave nueva y etiqueta numérica',async()=>{
 const app={id:'p__v__d',pacienteId:'p',vacunaId:'v',dosisId:'d',fechaAplicacion:'2026-11-02',lote:'L',sitioAplicacion:'Brazo',pediatraId:'profesional',estado:'APLICADA',version:1,versionEsquemaId:'ver',esquema:{nombre:'Histórica',dosis:[{dosisId:'d',numero:2}]}};
 const fetch=vi.fn().mockImplementation(async(url:string)=>new Response(JSON.stringify({data:url.endsWith('/anulacion')?{...app,estado:'ANULADA',version:2}:app}),{status:200}));vi.stubGlobal('fetch',fetch);
 const repo=createHttpVaccineRepository(new HttpClient()),dto={vacunaId:'v',dosisId:'d',fechaAplicacion:'2026-11-02',lote:'L',sitioAnatomico:'Brazo'};
 const primera=await repo.registrarAplicacion('CENTRO_PEDIATRICO','p',dto,'');
 await repo.anularAplicacion('CENTRO_PEDIATRICO','p__v__d','Error','',1);
 await repo.registrarAplicacion('CENTRO_PEDIATRICO','p',dto,'');
 expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).not.toBe(fetch.mock.calls[2][1].headers['Idempotency-Key']);
 expect(primera.etiquetaDosis).toBe('Dosis 2');
});
