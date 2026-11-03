import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConsultarEsquemaVacunas } from '../../src/aplicacion/casos-uso/pediatria/consultar-esquema-vacunas.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { fechaCivil } from '../../src/dominio/compartido/fecha-civil.js';
import { escenarioClinico } from '../fixtures/clinica-comun.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
for(const falla of ['catalogo','aplicaciones'])test(`fallo de ${falla} espera a la lectura hermana antes de finalizar petición`,async()=>{
  const s=escenarioClinico('CENTRO_MEDICO_PEDIATRICO');
  let iniciar!:()=>void,liberar!:()=>void;
  const iniciada=new Promise<void>(r=>{iniciar=r;}),pendiente=new Promise<void>(r=>{liberar=r;});
  let finalizo=false,hermanaFinalizada=false;
  const error=new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Fallo de lectura sintético.');
  const vacunas:NonNullable<BundleInstitucional['vacunasPediatricas']>={
    obtenerCatalogo:async()=>{if(falla==='catalogo')throw error;return [];},
    obtenerEsquemas:async()=>{iniciar();await pendiente;hermanaFinalizada=true;return [];},
    obtenerAplicaciones:async()=>{if(falla==='aplicaciones')throw error;return [];},
    obtenerVersionEsquema:async()=>null,obtenerPorId:async()=>null,
  };
  const bundle:BundleInstitucional={...s.bundle,vacunasPediatricas:vacunas,pacientes:{porId:async()=>({...s.paciente,fechaNacimiento:fechaCivil('2020-01-01')}),buscar:async()=>({elementos:[]})}};
  const resultado=new ConsultarEsquemaVacunas().ejecutar(s.contexto,bundle,s.paciente.id).then(()=>{finalizo=true;return null;},e=>{finalizo=true;return e;});
  await iniciada;
  await new Promise<void>(r=>setImmediate(r));
  const finalizoAntesDeHermana=finalizo;
  liberar();
  assert.equal(await resultado,error);
  assert.equal(hermanaFinalizada,true);
  assert.equal(finalizoAntesDeHermana,false,'La petición terminó dejando una lectura pendiente fuera de su ciclo de vida.');
});
