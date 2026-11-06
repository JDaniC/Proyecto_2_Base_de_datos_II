import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {Long,type Db,type ClientSession} from 'mongodb';
import {crearLectorCobros,mapearPago,mapearFactura,documentoFactura,documentoPago} from '../../src/adaptadores/salida/mongodb/cobros/persistencia-cobros.js';
import {uuidPublico} from '../../src/dominio/compartido/uuid.js';
import type {Factura,Pago} from '../../src/dominio/laboratorio/cobros/factura.js';
const fallo=(e:unknown)=>e instanceof Error&&'codigo' in e&&e.codigo==='PERSISTENCIA_NO_DISPONIBLE';
test('lectores ligados a session rechazan legado duplicado, agregado inseguro y datos corruptos',async()=>{
 const id=uuidPublico(randomUUID()),s={} as ClientSession;let docs:unknown[]=[];let sesionObservada:unknown;
 const db={collection:()=>({findOne:async(_f:unknown,o:{session:unknown})=>{sesionObservada=o.session;return null;},find:()=>({limit:()=>({toArray:async()=>docs})}),aggregate:()=>({toArray:async()=>docs})})} as unknown as Db;
 const l=crearLectorCobros(db,s);assert.equal(await l.facturaPorId(id),null);assert.equal(sesionObservada,s);assert.equal(await l.pagoPorId(id),null);assert.equal(await l.facturaPorOrden(id),null);assert.equal(await l.totalPagado(id),0);
 docs=[{},{}];await assert.rejects(l.facturaPorOrden(id),fallo);
 for(const d of [{invalidos:1,total:Long.fromNumber(1)},{invalidos:0,total:Long.fromString('9007199254740992')},{invalidos:0,total:Long.fromNumber(-1)}]){docs=[d];await assert.rejects(l.totalPagado(id),fallo);}
 docs=[{invalidos:0,total:Long.fromNumber(12345)}];assert.equal(await l.totalPagado(id),12345);
 const f:Factura={id,numero:'SINT',ordenId:randomUUID(),moneda:'GTQ',estado:'EMITIDA',version:1,fecha:'2026-11-05T00:00:00.000Z',actorId:randomUUID(),receptor:{nombre:'SINT',tipoIdentificacion:'SINT',numeroIdentificacion:'SINT'},lineas:[{id:randomUUID(),itemId:randomUUID(),descripcion:'SINT',cantidad:1,precioUnitario:1,descuento:0,impuesto:0}]};
 for(const cambio of [{estado:'BORRADOR'},{moneda:'USD'},{lineas:null},{fecha_emision:'ayer'},{numero_factura:''},{revision_cobro:0},{estado:'ANULADA'}])assert.throws(()=>mapearFactura({...documentoFactura(f),...cambio}),fallo);
 const p:Pago={id:randomUUID(),facturaId:id,importe:1,moneda:'GTQ',metodo:'EFECTIVO',fecha:f.fecha,actorId:f.actorId,clave:randomUUID(),estado:'CONFIRMADO'};
 for(const cambio of [{importe:Long.fromNumber(0)},{importe:Long.fromString('9007199254740992')},{estado:'ANULADO'},{moneda:'USD'},{metodo:'INVALIDO'},{clave_idempotencia:'invalida'},{fecha_hora:'ayer'}])assert.throws(()=>mapearPago({...documentoPago(p),...cambio}),fallo);
});
