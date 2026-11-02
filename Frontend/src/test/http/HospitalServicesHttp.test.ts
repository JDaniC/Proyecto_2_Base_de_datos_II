import {describe,it,expect,vi} from 'vitest';
import {createHttpExamRepository} from '../../services/http/hospital/httpExamRepository';
import {patientHospitalMethods} from '../../services/http/hospital/patientHospitalMethods';
import {HttpClient} from '../../services/http/httpClient';
import {HttpError} from '../../services/http/errors';
const institucion='HOSPITAL_GENERAL' as const;
const id='10000000-0000-4000-8000-000000000001';
const client=()=>({get:vi.fn(),post:vi.fn()}) as unknown as HttpClient;
describe('Servicios hospitalarios HTTP E04-P1-03',()=>{
 it('una confirmación perdida reintenta orden con idéntico cuerpo y clave, sin actor ni institución del cliente',async()=>{
  const http=client(),repo=createHttpExamRepository(http);
  vi.mocked(http.post).mockRejectedValueOnce(new HttpError({status:503,codigo:'PERSISTENCIA_NO_DISPONIBLE',mensaje:'Incierto'})).mockResolvedValue({meta:{correlacion:id},data:{id}});
  const dto={pacienteId:id,consultaId:id,versionConsulta:2,versionPaciente:4,medicoSolicitanteId:'suplantado',medicoSolicitanteNombre:'suplantado',pruebasIds:[id],prioridad:'RUTINA' as const,motivoClinico:'Prueba'};
  await expect(repo.crearOrden(institucion,dto,[])).rejects.toMatchObject({status:503});await repo.crearOrden(institucion,dto,[]);
  const a=vi.mocked(http.post).mock.calls;expect(a[1]).toEqual(a[0]);expect(a[0][1]).toEqual({consultaId:id,versionConsulta:2,versionPaciente:4,pruebasIds:[id],prioridad:'RUTINA',motivoClinico:'Prueba'});expect(a[0][2]?.idempotencyKey).toMatch(/^[\da-f-]{36}$/i);
 });
 it('la corrección envía versión de orden y emisión sin aceptar autor escrito',async()=>{
  const http=client();vi.mocked(http.post).mockResolvedValue({meta:{correlacion:id},data:{id,version:2}});
  await createHttpExamRepository(http).registrarResultado(institucion,{pacienteId:id,ordenId:id,pruebaId:id,versionEsperada:3,versionResultado:1,motivoCorreccion:'Corrección',responsableAnalisis:'suplantado',interpretacionClinica:'Rectificada',parametros:[{parametroId:id,valorMedido:'1',alerta:'NORMAL'}]},[]);
  expect(vi.mocked(http.post).mock.calls[0][1]).toEqual({versionEsperada:3,versionResultado:1,motivoCorreccion:'Corrección',pruebaId:id,interpretacionClinica:'Rectificada',parametros:[{parametroId:id,valorMedido:'1',alerta:'NORMAL'}]});
 });
 it('listado propaga página y hayMas sin convertir errores en listas vacías',async()=>{
  const http=client();vi.mocked(http.get).mockResolvedValueOnce({meta:{correlacion:id},data:{items:[],pagina:2,hayMas:true}}).mockRejectedValueOnce(new HttpError({status:503,codigo:'PERSISTENCIA_NO_DISPONIBLE',mensaje:'No disponible'}));
  const repo=createHttpExamRepository(http);expect(await repo.obtenerOrdenesPorPaciente(institucion,id,{pagina:2,limite:1})).toEqual({items:[],pagina:2,hayMas:true});expect(vi.mocked(http.get).mock.calls[0][1]?.query).toEqual({pacienteId:id,pagina:2,limite:1});await expect(repo.obtenerOrdenPorId(institucion,id)).rejects.toMatchObject({status:503});
 });
 it('solo 404 se proyecta a recurso ausente',async()=>{const http=client();vi.mocked(http.get).mockRejectedValue(new HttpError({status:404,codigo:'RECURSO_NO_ENCONTRADO',mensaje:'Ausente'}));expect(await createHttpExamRepository(http).obtenerResultadoPorId(institucion,id)).toBeNull();});
 it('afiliación preserva nombres, fecha civil y cero centavos, omite identidad visual y conserva clave',async()=>{
  const http=client();vi.mocked(http.post).mockResolvedValue({meta:{correlacion:id},data:{id,copagoCentavos:0,limiteMaximoAnualCentavos:null}});
  const repo=patientHospitalMethods(http),dto={versionPaciente:3,aseguradoraId:id,planId:id,numeroPoliza:'POL',numeroCertificado:'CERT',vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01',copagoConsultaGTQ:0,titular:{nombres:'Ana María',apellidos:'De la Cruz',nombreCompleto:'No dividir',numeroIdentificacion:'1234567890123',telefonoContacto:'55550000',parentesco:'TITULAR' as const}};
  expect((await repo.afiliarPolizaSeguro(institucion,id,dto)).copagoConsultaGTQ).toBe(0);await repo.afiliarPolizaSeguro(institucion,id,dto);
  const calls=vi.mocked(http.post).mock.calls;expect(calls[1]).toEqual(calls[0]);expect(calls[0][1]).toMatchObject({copagoCentavos:0,vigenciaDesde:'2026-01-01',titular:{nombres:'Ana María',apellidos:'De la Cruz'}});expect((calls[0][1] as typeof dto).titular).not.toHaveProperty('nombreCompleto');
 });
 it('procedimiento solo envía catálogo, consulta, versiones y hallazgos',async()=>{
  const http=client();vi.mocked(http.post).mockResolvedValue({meta:{correlacion:id},data:{id}});await patientHospitalMethods(http).registrarProcedimientoPaciente(institucion,id,{nombre:'Nombre UI',procedimientoId:id,consultaId:id,versionConsulta:2,versionPaciente:3,fechaHora:'2026-11-01T00:00:00Z',profesionalNombre:'suplantado',resultado:'Hallazgo',origen:'CONSULTA'});expect(vi.mocked(http.post).mock.calls[0][1]).toEqual({procedimientoId:id,consultaId:id,versionConsulta:2,versionPaciente:3,resultado:'Hallazgo'});
 });
});
