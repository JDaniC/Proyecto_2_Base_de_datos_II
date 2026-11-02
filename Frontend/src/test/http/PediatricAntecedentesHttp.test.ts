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
it('mutación exige versiones observadas y motivo antes de hacer tráfico',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 await expect(createHttpPatientRepository(new HttpClient()).confirmarSinAlergias!('CENTRO_PEDIATRICO','menor','Autor falso')).rejects.toMatchObject({status:400});expect(fetch).not.toHaveBeenCalled();
});
it('reintento conserva cuerpo y clave y omite el autor de presentación',async()=>{
 const fetch=vi.fn().mockRejectedValue(new TypeError('offline'));vi.stubGlobal('fetch',fetch);
 const r=createHttpPatientRepository(new HttpClient()),cambio={versionAntecedentes:2,motivo:'Confirmación sintética'};
 for(let i=0;i<2;i++)await expect(r.confirmarSinAlergias!('CENTRO_PEDIATRICO','menor','Autor falso',4,cambio)).rejects.toMatchObject({status:503});
 const a=fetch.mock.calls[0][1],b=fetch.mock.calls[1][1];expect(a.body).toBe(b.body);expect(a.headers['Idempotency-Key']).toBe(b.headers['Idempotency-Key']);
 expect(JSON.parse(a.body)).toEqual({version_paciente:4,version_antecedentes:2,motivo:'Confirmación sintética'});
});

it('historia persistida se presenta sin sustituirla por listas vacías',async()=>{
 const historia={patologicos:['Antecedente sintético'],quirurgicos:[],familiares:['Familiar sintético'],medicamentosActuales:[]};
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{version:4,alergias:[],historia}}),{status:200})));
 const a=await createHttpPatientRepository(new HttpClient()).obtenerAntecedentes!('CENTRO_PEDIATRICO','menor');expect(a.patologicos).toEqual(historia.patologicos);expect(a.familiares).toEqual(historia.familiares);
});

it('repositorio traduce mediciones y versión de vínculo a los tipos de presentación',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({data:[{consulta_id:'consulta',version_consulta:2,fecha:'2026-11-01',fecha_hora:'2026-11-01T12:00:00Z',profesional:'Pediatra',edad_meses:12,peso_kg:10,talla_cm:null,perimetro_cefalico_cm:null,imc:null}],meta:{siguiente_cursor:'cursor'}}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({data:{responsable:{id:'responsable',nombre:'Ana',version:2},version_vinculo:3,activo:false}}),{status:200}));
 vi.stubGlobal('fetch',fetch);const r=createHttpPatientRepository(new HttpClient());
 const pagina=await r.obtenerCrecimientoPediatrico!('menor',{});expect(pagina.elementos[0]).toMatchObject({consultaId:'consulta',versionConsulta:2,edadMeses:12,pesoKg:10,tallaCm:null,imc:null});expect(pagina.elementos[0]).not.toHaveProperty('consulta_id');expect(pagina.siguienteCursor).toBe('cursor');
 const responsable=await r.buscarResponsablePediatrico!('menor','CUI','1234567890101');expect(responsable.versionVinculo).toBe(3);expect(responsable).not.toHaveProperty('version_vinculo');
});
