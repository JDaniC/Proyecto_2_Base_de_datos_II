import {AppModule} from '../../src/composicion/app.module.js';
import {crearAplicacionHttp} from '../../src/composicion/crear-aplicacion-http.js';
import {leerContratoOpenApi} from '../../src/composicion/leer-contrato-openapi.js';
import {parsearConfiguracion} from '../../src/configuracion/entorno.js';
import {VerificadorIdentidadMemoria} from '../../src/adaptadores/salida/identidad/verificador-identidad-memoria.js';
import {resolve} from 'node:path';
import type {AddressInfo} from 'node:net';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import type {Db,Document} from 'mongodb';
import type {BundleInstitucional} from '../../src/aplicacion/puertos/bundle-institucional.js';
import type {OrdenLaboratorio} from '../../src/dominio/laboratorio/ordenes.js';
import {crearContextoAutenticado} from '../../src/aplicacion/puertos/contexto-autenticado.js';
import {instanteUtc} from '../../src/dominio/compartido/instante-utc.js';
import {uuidPublico} from '../../src/dominio/compartido/uuid.js';
import {GestionarCobrosLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/gestionar-cobros.js';
import {ConsultarCobrosLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/consultar-cobros.js';
import {documentoOrdenLaboratorio} from '../../src/adaptadores/salida/mongodb/laboratorio/documento-orden.js';
import {RegistrarPaciente} from '../../src/aplicacion/casos-uso/pacientes/registrar-paciente.js';
import {CambiarEstadoHistorial} from '../../src/aplicacion/casos-uso/historiales/cambiar-estado-historial.js';
import {verificarCobros} from '../../src/adaptadores/salida/mongodb/cobros/verificar-cobros.js';
const codigo=(c:string)=>(e:unknown)=>e instanceof Error&&'codigo' in e&&e.codigo===c;
export async function probarCobros(db:Db,bundle:BundleInstitucional,base:OrdenLaboratorio){
 const existente=await db.collection<{_id:string}&Document>('roles').findOne({nombre:'ADMIN_INSTITUCIONAL'});
 const rol=existente?._id??randomUUID(),actor=randomUUID(),uid=`cobros-${randomUUID()}`,fecha=instanteUtc('2026-11-05T12:00:00.000Z');
 if(existente)await db.collection<{_id:string}&Document>('roles').updateOne({_id:rol},{$addToSet:{permisos:{$each:['cobros.administrar','pacientes.administrar','historial.archivar']}}});
 else await db.collection<{_id:string}&Document>('roles').insertOne({_id:rol,revision:1,nombre:'ADMIN_INSTITUCIONAL',permisos:['cobros.administrar','pacientes.administrar','historial.archivar']});
 await db.collection<{_id:string}&Document>('usuarios').insertOne({_id:actor,revision:1,auth_uid:uid,proveedor_identidad:'FIREBASE',institucion_id:'LABORATORIO_CLINICO',rol_ids:[rol],estado:'ACTIVO',activo:true,nombre_usuario:uid});
 const cuenta=await bundle.cuenta!.porUid(uid);assert.ok(cuenta);
 const contexto=crearContextoAutenticado({uid,institucion:'LABORATORIO_CLINICO',emitidoEn:fecha},cuenta,uuidPublico(randomUUID()));
 const deps={reloj:{ahora:()=>fecha},ids:{nuevo:()=>uuidPublico(randomUUID())},hash:{sha256:async(s:string)=>createHash('sha256').update(s).digest('hex')}};
 const paciente=(await new RegistrarPaciente(deps).ejecutar({contexto,bundle,claveIdempotencia:uuidPublico(randomUUID()),entrada:{nombres:'Cobros',apellidos:'Sintéticos',fecha_nacimiento:'2000-01-01',sexo:'FEMENINO'}})).respuesta;
 const orden={...base,id:randomUUID(),pacienteId:paciente.id,version:1};
 await db.collection<{_id:string}&Document>('ordenes').insertOne(documentoOrdenLaboratorio(orden,orden.id));
 await verificarCobros(db);
 const esquemaFactura=await db.listCollections({name:'facturas'}).next();assert.ok(esquemaFactura&&'options' in esquemaFactura);
 try{await db.command({collMod:'facturas',validator:{$jsonSchema:{bsonType:'object'}},validationLevel:'strict',validationAction:'error'});await assert.rejects(verificarCobros(db),codigo('PERSISTENCIA_NO_DISPONIBLE'));}
 finally{await db.command({collMod:'facturas',validator:esquemaFactura.options.validator,validationLevel:esquemaFactura.options.validationLevel,validationAction:esquemaFactura.options.validationAction});}

 const comandos=new GestionarCobrosLaboratorio(deps),consulta=new ConsultarCobrosLaboratorio();
 const invocar=(accion:'emitir'|'pagar'|'revertir'|'anular',entrada:unknown,id?:string,clave=uuidPublico(randomUUID()))=>comandos.ejecutar(accion,{contexto,bundle,entrada,claveIdempotencia:clave,...(id?{id:uuidPublico(id)}:{})});
 const entrada={ordenId:orden.id,versionOrden:1,numero:`SINT-${randomUUID()}`,receptor:{nombre:'Receptor sintético',tipoIdentificacion:'SINT',numeroIdentificacion:'SINT'}};
 const segundaOrden={...orden,id:randomUUID()};await db.collection<{_id:string}&Document>('ordenes').insertOne(documentoOrdenLaboratorio(segundaOrden,segundaOrden.id));
 const clave=uuidPublico(randomUUID()),emitida=await invocar('emitir',entrada,undefined,clave);const f=emitida.respuesta.factura;
 assert.deepEqual(await invocar('emitir',entrada,undefined,clave),emitida);
 const revisionesOrden=await db.collection('revisiones').find({tipo_recurso:'ordenes',recurso_id:orden.id,version:1}).toArray();assert.equal(revisionesOrden.length,1);assert.deepEqual(revisionesOrden[0]!.contenido_anterior,orden);
 await assert.rejects(invocar('emitir',{...entrada,versionOrden:2}),codigo('ESTADO_INVALIDO'));
 await assert.rejects(invocar('emitir',{...entrada,numero:'OTRO'},undefined,clave),codigo('CLAVE_REUTILIZADA'));
 const otra=await invocar('emitir',{...entrada,ordenId:segundaOrden.id,numero:`SINT-${randomUUID()}`});
 const facturaB=otra.respuesta.factura;
 const ver=()=>consulta.detalle({contexto,bundle,id:f.id});
 assert.equal((await ver()).total,base.total.centavos);assert.equal((await ver()).saldo,base.total.centavos);
 const pagoDto={versionEsperada:1,importe:100,moneda:'GTQ',metodo:'EFECTIVO'};
 for(const v of [{...pagoDto,moneda:'USD'},{...pagoDto,importe:0},{...pagoDto,importe:1.01}])await assert.rejects(invocar('pagar',v,f.id),codigo('SOLICITUD_INVALIDA'));
 await db.collection<{_id:string}&Document>('ordenes').updateOne({_id:orden.id},{$set:{'items.0.prueba_historica.nombre':'Nombre futuro'}});assert.equal((await ver()).factura.lineas[0]!.descripcion,base.items[0]!.prueba.nombre);
 const clavePago=uuidPublico(randomUUID()),pago=await invocar('pagar',pagoDto,f.id,clavePago);
 assert.deepEqual(await invocar('pagar',pagoDto,f.id,clavePago),pago);
 await assert.rejects(invocar('revertir',{versionEsperada:1,pagoId:pago.respuesta.pago!.id,motivo:'Cruce de factura'},facturaB.id),codigo('RECURSO_NO_ENCONTRADO'));
 assert.equal((await consulta.detalle({contexto,bundle,id:facturaB.id})).pagado,0);assert.equal((await ver()).saldo,base.total.centavos-100);
 // Auditoría falla después de datos: deben revertirse factura, pago, revisión y operación.
 const audit=await db.listCollections({name:'auditoria'}).next();assert.ok(audit&&'options' in audit);const opciones=audit.options;
 const antes=await ver();const nPagos=await db.collection('pagos').countDocuments({factura_id:f.id}),nRevisiones=await db.collection('revisiones').countDocuments({recurso_id:f.id});const claveFallida=uuidPublico(randomUUID());
 try{await db.command({collMod:'auditoria',validator:{$and:[opciones.validator,{$jsonSchema:{required:['fallo_inyectado']}}]},validationLevel:'strict',validationAction:'error'});
  await assert.rejects(invocar('pagar',{...pagoDto,versionEsperada:2},f.id,claveFallida));
 }finally{await db.command({collMod:'auditoria',validator:opciones.validator,validationLevel:opciones.validationLevel,validationAction:opciones.validationAction});}
 assert.deepEqual(await ver(),antes);assert.equal(await db.collection('pagos').countDocuments({factura_id:f.id}),nPagos);assert.equal(await db.collection('revisiones').countDocuments({recurso_id:f.id}),nRevisiones);assert.equal(await db.collection('operaciones').countDocuments({clave:claveFallida}),0);
 // Archivo permite terminar el cobro previo, no crea una orden nueva.
 await new CambiarEstadoHistorial(deps).ejecutar('archivar',{contexto,bundle,id:uuidPublico(paciente.id),claveIdempotencia:uuidPublico(randomUUID()),entrada:{version_esperada:1,motivo:'Archivo sintético',causa:'OTRA_ADMINISTRATIVA'}});
 const resto=antes.saldo;
 const carrera=await Promise.allSettled([invocar('pagar',{...pagoDto,versionEsperada:2,importe:resto},f.id),invocar('pagar',{...pagoDto,versionEsperada:2,importe:resto},f.id)]);
 assert.equal(carrera.filter(r=>r.status==='fulfilled').length,1);assert.equal((await ver()).saldo,0);assert.equal(await db.collection('pagos').countDocuments({factura_id:f.id}),2);
 await assert.rejects(invocar('pagar',{...pagoDto,versionEsperada:3,importe:1},f.id),codigo('SALDO_INSUFICIENTE'));
 await assert.rejects(invocar('anular',{versionEsperada:3,motivo:'Anulación sintética'},f.id),codigo('ESTADO_INVALIDO'));
 const config=parsearConfiguracion({APP_ENV:'test',HOST:'127.0.0.1',PORT:'3000',INSTITUTIONS:'HOSPITAL_GENERAL,CLINICA_ODONTOLOGICA,LABORATORIO_CLINICO,CENTRO_MEDICO_PEDIATRICO'});
 const token=`cobros-http-sintetico-${randomUUID()}`;
 const http=await crearAplicacionHttp(AppModule.registrar(config,{bundles:[bundle],verificadorIdentidad:new VerificadorIdentidadMemoria([{token,uid,institucion:'LABORATORIO_CLINICO'}])}),leerContratoOpenApi(resolve('docs/openapi.yaml')));
 try{
  await http.listen(0,'127.0.0.1');const url=`http://127.0.0.1:${(http.getHttpServer().address() as AddressInfo).port}/api/v1/laboratorio/facturas`,headers={authorization:`Bearer ${token}`};
  const laboratorioUrl=url.slice(0,url.lastIndexOf('/'));for(const ruta of ['/ordenes?limite=1','/catalogos/pruebas?limite=1'])assert.equal((await fetch(laboratorioUrl+ruta,{headers})).status,200,ruta);
  const detalle=await fetch(`${url}/${f.id}`,{headers});assert.equal(detalle.status,200);assert.equal(((await detalle.json()) as {data:{saldo:number}}).data.saldo,0);
  for(const ruta of ['',`/${f.id}/pagos`]){const r=await fetch(`${url}${ruta}?limite=1`,{headers});assert.equal(r.status,200);const body=await r.json() as {data:unknown[];meta:{siguiente_cursor?:string}};assert.equal(body.data.length,1);assert.ok(body.meta.siguiente_cursor);const next=await fetch(`${url}${ruta}?limite=1&cursor=${encodeURIComponent(body.meta.siguiente_cursor)}`,{headers});assert.equal(next.status,200);}
 }finally{await http.close();}
 const pagos=await consulta.listar('pagos',{contexto,bundle,id:f.id,entrada:{limite:1}});assert.equal(pagos.elementos.length,1);assert.ok(pagos.siguienteCursor);
 const uidB=`cobros-b-${randomUUID()}`,actorB=randomUUID();
 await db.collection<{_id:string}&Document>('usuarios').insertOne({_id:actorB,revision:1,auth_uid:uidB,proveedor_identidad:'FIREBASE',institucion_id:'LABORATORIO_CLINICO',rol_ids:[rol],estado:'ACTIVO',activo:true,nombre_usuario:uidB});
 const cuentaB=await bundle.cuenta!.porUid(uidB);assert.ok(cuentaB);const contextoB=crearContextoAutenticado({uid:uidB,institucion:'LABORATORIO_CLINICO',emitidoEn:fecha},cuentaB,uuidPublico(randomUUID()));
 assert.equal((await consulta.detalle({contexto:contextoB,bundle,id:f.id})).factura.id,f.id); // Alcance institucional, no propiedad por cajero.
 await assert.rejects(consulta.listar('pagos',{contexto:contextoB,bundle,id:f.id,entrada:{limite:1,cursor:pagos.siguienteCursor}}),codigo('SOLICITUD_INVALIDA'));
 await assert.rejects(consulta.listar('pagos',{contexto,bundle,id:f.id,entrada:{limite:1,cursor:pagos.siguienteCursor+'X'}}),codigo('SOLICITUD_INVALIDA'));
 const siguientes=await consulta.listar('pagos',{contexto,bundle,id:f.id,entrada:{limite:1,cursor:pagos.siguienteCursor}});assert.equal(siguientes.elementos.length,1);assert.notEqual(pagos.elementos[0]!.id,siguientes.elementos[0]!.id);
 await assert.rejects(consulta.listar('pagos',{contexto,bundle,id:f.id,entrada:{limite:1,cursor:pagos.siguienteCursor,estado:'CONFIRMADO'}}),codigo('SOLICITUD_INVALIDA'));
 let revision=3;
 for(const p of [...pagos.elementos,...siguientes.elementos]){const dto={versionEsperada:revision++,pagoId:p.id,motivo:'Reversión sintética'},clave=uuidPublico(randomUUID()),r=await invocar('revertir',dto,f.id,clave);assert.deepEqual(await invocar('revertir',dto,f.id,clave),r);}
 assert.equal((await ver()).saldo,base.total.centavos);
 await assert.rejects(invocar('revertir',{versionEsperada:revision,pagoId:pagos.elementos[0]!.id,motivo:'Duplicada'},f.id),codigo('ESTADO_INVALIDO'));
 const claveAnular=uuidPublico(randomUUID()),dtoAnular={versionEsperada:revision,motivo:'Anulación sintética'},anulada=await invocar('anular',dtoAnular,f.id,claveAnular);assert.deepEqual(await invocar('anular',dtoAnular,f.id,claveAnular),anulada);assert.equal((await ver()).factura.estado,'ANULADA');assert.equal((await ver()).saldo,0);
 assert.equal((await consulta.listar('facturas',{contexto,bundle,entrada:{pacienteId:paciente.id}})).elementos.length,2);
 const primeraPagina=await consulta.listar('facturas',{contexto,bundle,entrada:{limite:1}}),segundaPagina=await consulta.listar('facturas',{contexto,bundle,entrada:{limite:1,cursor:primeraPagina.siguienteCursor}});assert.notEqual(primeraPagina.elementos[0]!.id,segundaPagina.elementos[0]!.id);
 assert.equal((await consulta.listar('facturas',{contexto,bundle,entrada:{desde:fecha,hasta:'2026-11-05T12:00:00.001Z'}})).elementos.length,2);
 assert.equal((await consulta.listar('facturas',{contexto,bundle,entrada:{desde:'2026-11-05T12:00:00.000000001Z'}})).elementos.length,0);
 assert.equal((await consulta.listar('facturas',{contexto,bundle,entrada:{hasta:'2026-11-05T12:00:00.000000001Z'}})).elementos.length,2);
 await assert.rejects(consulta.listar('facturas',{contexto,bundle,entrada:{desde:fecha,hasta:fecha}}),codigo('SOLICITUD_INVALIDA'));
 await db.collection<{_id:string}&Document>('usuarios').updateOne({_id:actor},{$set:{estado:'INACTIVO',activo:false}});
 await assert.rejects(invocar('emitir',entrada,undefined,clave));await assert.rejects(ver());
 console.log('PASS cobros: emisión, centavos, replay, rollback auditoría, archivo, carrera, paginación, reversión, anulación, cuenta actual.');
}
