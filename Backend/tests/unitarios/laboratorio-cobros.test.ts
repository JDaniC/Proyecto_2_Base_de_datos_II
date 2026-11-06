import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {dinero} from '../../src/dominio/compartido/dinero.js';
import {emitirFactura,totalFactura,registrarPago,revertirPago,anularFactura,saldoFactura,exigirRevisionFactura} from '../../src/dominio/laboratorio/cobros/factura.js';
import {documentoFactura,mapearFactura,documentoPago,mapearPago} from '../../src/adaptadores/salida/mongodb/cobros/persistencia-cobros.js';
import type {OrdenLaboratorio} from '../../src/dominio/laboratorio/ordenes.js';
const fecha='2026-11-05T10:00:00.000Z';
function escenario(){
 const orden:OrdenLaboratorio={id:randomUUID(),pacienteId:randomUUID(),solicitanteId:randomUUID(),registradoPorId:randomUUID(),instante:fecha,prioridad:'RUTINA',indicaciones:'Sintética',estado:'CREADA',version:1,total:dinero(12345),items:[{id:randomUUID(),precio:dinero(12345),estado:'SOLICITADO',prueba:{id:randomUUID(),codigo:'SINT',nombre:'Prueba sintética',version:1,activo:true,metodoId:randomUUID(),tiposMuestraIds:[randomUUID()],parametros:[]}}]};
 const f=emitirFactura(orden,{id:randomUUID(),numero:'SINT-1',receptor:{nombre:'Receptor sintético',tipoIdentificacion:'SINT',numeroIdentificacion:'SINT'},fecha,actorId:randomUUID(),lineaIds:[randomUUID()]});
 const pagar=(importe:number,pagado=0)=>registrarPago(f,pagado,{id:randomUUID(),importe,moneda:'GTQ',metodo:'EFECTIVO',fecha,actorId:randomUUID(),clave:randomUUID()});return {orden,f,pagar};
}
test('factura congela precio/nombre/receptor y conserva centavos exactos en BSON long',()=>{
 const {orden,f}=escenario();const doc=documentoFactura(f);assert.deepEqual(mapearFactura(doc),f);assert.equal(totalFactura(f),12345);
 assert.equal(doc.lineas[0].precio_unitario._bsontype,'Long');(orden.items[0]!.prueba as {nombre:string}).nombre='Cambio futuro';assert.equal(f.lineas[0]!.descripcion,'Prueba sintética');assert.ok(Object.isFrozen(f.lineas));
});
test('pagos parciales, último centavo, reversión y anulación preservan historia',()=>{
 const {f,pagar}=escenario(),p=pagar(12344);assert.deepEqual(mapearPago(documentoPago(p)),p);assert.equal(saldoFactura(f,p.importe),1);assert.equal(pagar(1,p.importe).importe,1);
 assert.throws(()=>pagar(2,p.importe));assert.throws(()=>anularFactura(f,p.importe,'Motivo'));
 const r=revertirPago(f,p,{fecha,actorId:randomUUID(),motivo:'Reversión sintética'});assert.equal(r.estado,'ANULADO');assert.equal(p.estado,'CONFIRMADO');assert.deepEqual(mapearPago(documentoPago(r)),r);
 assert.throws(()=>revertirPago(f,r,{fecha,actorId:randomUUID(),motivo:'Duplicada'}));const anulada=anularFactura(f,0,'Anulación sintética');assert.equal(anulada.version,2);assert.equal(anulada.estado,'ANULADA');assert.equal(saldoFactura(anulada,0),0);assert.throws(()=>saldoFactura(anulada,1));assert.deepEqual(mapearFactura(documentoFactura(anulada)),anulada);
 assert.throws(()=>registrarPago(anulada,0,{...p,id:randomUUID()}));
});
test('rechaza entrada y saldo inválidos, desbordamientos y revisión antigua',()=>{
 const {f,pagar,orden}=escenario();for(const n of [0,-1,0.01,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>pagar(n));
 assert.throws(()=>exigirRevisionFactura(f,2));assert.throws(()=>saldoFactura(f,12346));
 assert.throws(()=>totalFactura({...f,lineas:[{...f.lineas[0]!,cantidad:2,precioUnitario:Number.MAX_SAFE_INTEGER}]}));
 assert.throws(()=>totalFactura({...f,lineas:[{...f.lineas[0]!,descuento:12346}]}));
 assert.throws(()=>emitirFactura({...orden,estado:'CANCELADA'},{id:randomUUID(),numero:'SINT',receptor:f.receptor,fecha,actorId:randomUUID(),lineaIds:[randomUUID()]}));
 assert.throws(()=>mapearFactura({...documentoFactura(f),moneda:'USD'}));assert.throws(()=>mapearFactura({...documentoFactura(f),revision_cobro:0}));
});
