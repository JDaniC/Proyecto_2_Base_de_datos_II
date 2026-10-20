/* Solo en replica set temporal. Crea una base nueva y la elimina al terminar.
 * FAIL expresa una violacion del contrato, no un error de infraestructura.
 */
(async () => {
  const { randomUUID: uid } = require('node:crypto');
  const anterior = process.env.MONGO_LAB_DB;
  const nombre = `laboratorio_clinico_test_audit_${Date.now()}`;
  const destino = db.getSiblingDB(nombre);
  if ((await destino.getCollectionInfos()).length) throw new Error('Se requiere base nueva.');
  process.env.MONGO_LAB_DB = nombre;
  try {
    await load('Database/laboratorio_clinico_mongodb.js');
    const fecha = new Date('2026-10-19T12:00:00Z');
    const crear = () => ({ _id: uid(), revision: NumberInt(1), paciente_id: uid(), historial_id: uid(),
      solicitante_medico_id: uid(), registrado_por_id: uid(), fecha_hora: fecha, motivo: 'SINTETICO',
      estado: 'ABIERTA', diagnosticos: [], tratamientos: [{ tratamiento_id: uid(), nombre: 'SINTETICO',
        fecha_inicio: fecha, fecha_fin: new Date('2026-10-18T12:00:00Z') }] });
    const invalido = crear();
    let rechazado = false;
    try { await destino.consultas_clinicas.insertOne(invalido); }
    catch (e) { if (e.code !== 121) throw e; rechazado = true; }
    if (!rechazado) throw new Error('REGRESION_MG01_FECHAS_INVERTIDAS');
    print(`${rechazado ? 'PASS' : 'FAIL'} MG01 tratamiento con fin anterior al inicio`);
    const valido = crear(); valido.tratamientos[0].fecha_fin = fecha;
    await destino.consultas_clinicas.insertOne(valido);
    print('PASS MG02 tratamiento con fechas iguales (control)');
    const assert = require('node:assert/strict');
    const rechazo = async (documento, caso) => {
      await assert.rejects(() => destino.consultas_clinicas.insertOne(documento), (e) => e.code === 121);
      print(`PASS ${caso}`);
    };
    const sinFin = crear(); delete sinFin.tratamientos[0].fecha_fin;
    await destino.consultas_clinicas.insertOne(sinFin); print('PASS MG03 tratamiento sin fecha fin');
    const actualizado = { ...valido.tratamientos[0], fecha_fin: new Date('2026-10-18T12:00:00Z') };
    await assert.rejects(() => destino.consultas_clinicas.updateOne({ _id: valido._id }, { $set: { tratamientos: [actualizado] } }), (e) => e.code === 121);
    print('PASS MG04 UPDATE tampoco invierte fechas');
    const documento = crear(); documento.tratamientos = [];
    const medicamento = { medicamento_id: uid(), nombre: 'SINTETICO', presentacion: 'PRUEBA', concentracion: 'PRUEBA',
      dosis: 'PRUEBA', frecuencia: 'PRUEBA', duracion: 'PRUEBA', via: 'PRUEBA', indicaciones: 'PRUEBA' };
    documento.receta = { receta_id: uid(), version: NumberInt(1), estado: 'EMITIDA', fecha_emision: fecha,
      prescriptor_id: uid(), prescriptor_nombre_historico: 'SINTETICO', colegiado_historico: 'PRUEBA', medicamentos: [medicamento] };
    await rechazo(documento, 'MG05 prescriptor distinto');
    documento.receta.prescriptor_id = documento.solicitante_medico_id;
    documento.receta.medicamentos.push({ ...medicamento, dosis: 'OTRA' });
    await rechazo(documento, 'MG06 medicamento duplicado por ID');
    documento.receta.medicamentos.pop();
    await destino.consultas_clinicas.insertOne(documento); print('PASS MG07 receta coherente');

  } finally {
    await destino.dropDatabase();
    if (anterior === undefined) delete process.env.MONGO_LAB_DB;
    else process.env.MONGO_LAB_DB = anterior;
  }
})();
