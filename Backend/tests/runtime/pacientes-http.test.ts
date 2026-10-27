import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { crearAplicacionHttp } from '../../src/composicion/crear-aplicacion-http.js';
import { AppModule } from '../../src/composicion/app.module.js';
import { crearBundlesInstitucionales, type MapaRepositoriosInstitucion } from '../../src/composicion/crear-bundles-institucionales.js';
import { parsearConfiguracion } from '../../src/configuracion/entorno.js';
import { leerContratoOpenApi } from '../../src/composicion/leer-contrato-openapi.js';
import { RepositorioCuentaEnMemoria } from '../../src/adaptadores/salida/identidad/repositorio-cuenta-en-memoria.js';
import { VerificadorIdentidadMemoria, type TokenSinteticoConfig } from '../../src/adaptadores/salida/identidad/verificador-identidad-memoria.js';
import { CUENTAS_SINTETICAS } from '../../src/adaptadores/salida/identidad/semillas-sinteticas.js';
import { RepositorioPacientesMemoria } from '../../src/adaptadores/salida/pacientes/repositorio-pacientes-memoria.js';
import { INSTITUCIONES_CANONICAS } from '../../src/dominio/compartido/institucion.js';
import type { PacienteDto } from '../../src/aplicacion/casos-uso/pacientes/dtos-pacientes.js';

const configuracion = parsearConfiguracion({
  APP_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  INSTITUTIONS: INSTITUCIONES_CANONICAS.join(','),
});
const contrato = leerContratoOpenApi(resolve(process.cwd(), 'docs/openapi.yaml'));

describe('API HTTP de pacientes', () => {
  let app: INestApplication | undefined;
  let baseUrl = '';
  let repoPacientesHospital: RepositorioPacientesMemoria;
  let repoPacientesPediatria: RepositorioPacientesMemoria;

  const tokenAdminHosp = 'token-admin-hospital';
  const tokenSecretariaHosp = 'token-secretaria-hospital';
  const tokenMedicoHosp = 'token-medico-hospital';
  const tokenAdminPed = 'token-admin-pediatria';

  before(async () => {
    const adminHosp = CUENTAS_SINTETICAS.find(
      (c) => c.institucion === 'HOSPITAL_GENERAL' && c.roles.includes('ADMIN_INSTITUCIONAL'),
    )!;
    const secreHosp = CUENTAS_SINTETICAS.find(
      (c) => c.institucion === 'HOSPITAL_GENERAL' && c.roles.includes('SECRETARIA'),
    )!;
    const medicoHosp = CUENTAS_SINTETICAS.find(
      (c) => c.institucion === 'HOSPITAL_GENERAL' && c.roles.includes('MEDICO'),
    )!;
    const adminPed = CUENTAS_SINTETICAS.find(
      (c) => c.institucion === 'CENTRO_MEDICO_PEDIATRICO' && c.roles.includes('ADMIN_INSTITUCIONAL'),
    )!;

    const tokens: TokenSinteticoConfig[] = [
      { token: tokenAdminHosp, uid: adminHosp.uid, institucion: adminHosp.institucion },
      { token: tokenSecretariaHosp, uid: secreHosp.uid, institucion: secreHosp.institucion },
      { token: tokenMedicoHosp, uid: medicoHosp.uid, institucion: medicoHosp.institucion },
      { token: tokenAdminPed, uid: adminPed.uid, institucion: adminPed.institucion },
    ];
    const verificador = new VerificadorIdentidadMemoria(tokens);

    repoPacientesHospital = new RepositorioPacientesMemoria();
    repoPacientesPediatria = new RepositorioPacientesMemoria();

    const mapaRepos: MapaRepositoriosInstitucion = {
      HOSPITAL_GENERAL: {
        cuenta: new RepositorioCuentaEnMemoria('HOSPITAL_GENERAL', CUENTAS_SINTETICAS.filter((c) => c.institucion === 'HOSPITAL_GENERAL')),
        pacientes: repoPacientesHospital,
        uow: repoPacientesHospital.crearUnidadDeTrabajo(),
      },
      CENTRO_MEDICO_PEDIATRICO: {
        cuenta: new RepositorioCuentaEnMemoria('CENTRO_MEDICO_PEDIATRICO', CUENTAS_SINTETICAS.filter((c) => c.institucion === 'CENTRO_MEDICO_PEDIATRICO')),
        pacientes: repoPacientesPediatria,
        uow: repoPacientesPediatria.crearUnidadDeTrabajo(),
      },
      CLINICA_ODONTOLOGICA: {
        cuenta: new RepositorioCuentaEnMemoria('CLINICA_ODONTOLOGICA', CUENTAS_SINTETICAS.filter((c) => c.institucion === 'CLINICA_ODONTOLOGICA')),
      },
      LABORATORIO_CLINICO: {
        cuenta: new RepositorioCuentaEnMemoria('LABORATORIO_CLINICO', CUENTAS_SINTETICAS.filter((c) => c.institucion === 'LABORATORIO_CLINICO')),
      },
    };

    const bundles = crearBundlesInstitucionales(INSTITUCIONES_CANONICAS, mapaRepos);

    const modulo = AppModule.registrar(configuracion, {
      bundles,
      verificadorIdentidad: verificador,
    });

    app = await crearAplicacionHttp(modulo, contrato);
    await app.listen(0, '127.0.0.1');
    const direccion = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${direccion.port}`;
  });

  after(async () => {
    if (app) await app.close();
  });

  describe('POST /api/v1/pacientes', () => {
    it('crea un paciente hospitalario con 201 y sobre de respuesta', async () => {
      const idempotencyKey = randomUUID();
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          nombres: 'Julio Cesar',
          apellidos: 'Mendez Montenegro',
          fecha_nacimiento: '1980-03-22',
          sexo: 'MASCULINO',
          identificacion: { tipo: 'CUI', numero: '2020123450101' },
          grupo_sanguineo: 'A+',
          contacto_emergencia: {
            nombres: 'Patricia',
            apellidos: 'Mendez',
            parentesco: 'Hermana',
            telefono: '55543210',
          },
        }),
      });

      assert.equal(respuesta.status, 201);
      const cuerpo = await respuesta.json() as { data: PacienteDto; meta: { correlacion: string } };
      assert.ok(cuerpo.data.id);
      assert.match(cuerpo.data.codigo_legible, /^HOSP-[A-F0-9]{6}$/);
      assert.equal(cuerpo.data.nombres, 'Julio Cesar');
      assert.equal(cuerpo.data.apellidos, 'Mendez Montenegro');
      assert.equal(cuerpo.data.grupo_sanguineo, 'A+');
      assert.equal(cuerpo.data.contacto_emergencia?.nombres, 'Patricia');
      assert.equal(cuerpo.data.contacto_emergencia?.apellidos, 'Mendez');
      assert.equal(cuerpo.data.contacto_emergencia?.parentesco, 'Hermana');
      assert.equal(cuerpo.data.contacto_emergencia?.telefono, '55543210');
      assert.equal(cuerpo.data.version, 1);
      assert.ok(cuerpo.meta.correlacion);
    });

    it('devuelve el resultado previo reproducible ante repetición idempotente conservando correlacionOriginal', async () => {
      const idempotencyKey = randomUUID();
      const payload = {
        nombres: 'Idem',
        apellidos: 'Prueba',
        fecha_nacimiento: '1988-08-08',
        sexo: 'FEMENINO',
        identificacion: { tipo: 'CUI', numero: '2020999990101' },
      };

      const res1 = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      assert.equal(res1.status, 201);
      const cuerpo1 = await res1.json() as { data: PacienteDto; meta: { correlacion: string } };

      const res2 = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      assert.equal(res2.status, 201);
      const cuerpo2 = await res2.json() as { data: PacienteDto; meta: { correlacion: string } };

      assert.equal(cuerpo2.data.id, cuerpo1.data.id);
      assert.equal(cuerpo2.data.codigo_legible, cuerpo1.data.codigo_legible);
      assert.equal(cuerpo2.meta.correlacion, cuerpo1.meta.correlacion);
      assert.equal(res2.headers.get('x-correlation-id'), res1.headers.get('x-correlation-id'));
      assert.equal(res2.headers.get('x-correlation-id'), cuerpo1.meta.correlacion);
    });

    it('responde 409 si se reintenta con la misma clave de idempotencia pero carga útil distinta (CLAVE_REUTILIZADA)', async () => {
      const idempotencyKey = randomUUID();
      const res1 = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          nombres: 'Primer',
          apellidos: 'Intento',
          fecha_nacimiento: '1985-01-01',
          sexo: 'MASCULINO',
        }),
      });
      assert.equal(res1.status, 201);

      const res2 = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          nombres: 'Segundo',
          apellidos: 'IntentoDiferente',
          fecha_nacimiento: '1985-01-01',
          sexo: 'MASCULINO',
        }),
      });
      assert.equal(res2.status, 409);
      const cuerpo2 = await res2.json() as { error: { codigo: string } };
      assert.equal(cuerpo2.error.codigo, 'CLAVE_REUTILIZADA');
    });

    it('responde 400 si un responsable nuevo pediátrico carece de nombres o teléfono', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminPed}`,
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          nombres: 'Bebe',
          apellidos: 'Incompleto',
          fecha_nacimiento: '2023-01-01',
          sexo: 'MASCULINO',
          responsables: [
            {
              parentesco: 'Tutor',
              es_principal: true,
              autoriza_atencion: true,
            },
          ],
        }),
      });

      assert.equal(respuesta.status, 400);
      const cuerpo = await respuesta.json() as { error: { codigo: string } };
      assert.equal(cuerpo.error.codigo, 'SOLICITUD_INVALIDA');
    });

    it('registra paciente pediátrico con responsables y valida campos en snake_case', async () => {
      const idempotencyKey = randomUUID();
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminPed}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          nombres: 'Danielito',
          apellidos: 'Morales',
          fecha_nacimiento: '2020-04-10',
          sexo: 'MASCULINO',
          responsables: [
            {
              nombres: 'Sofia',
              apellidos: 'Morales',
              telefono: '55512345',
              parentesco: 'Madre',
              es_principal: true,
              autoriza_atencion: true,
              documento: { tipo: 'CUI', numero: '1099123450101' },
            },
          ],
        }),
      });

      assert.equal(respuesta.status, 201);
      const cuerpo = await respuesta.json() as {
        data: {
          id: string;
          responsables: Array<{
            responsable: { id: string; nombres: string; apellidos: string; nombre: string; telefono: string; version: number };
            vinculo: { responsable_id: string; version_responsable: number; parentesco: string; es_principal: boolean; autoriza_atencion: boolean };
            version_vinculo: number;
          }>;
        };
        meta: { correlacion: string };
      };
      assert.ok(cuerpo.data.responsables);
      assert.equal(cuerpo.data.responsables.length, 1);
      const r = cuerpo.data.responsables[0]!;
      assert.equal(r.responsable.nombres, 'Sofia');
      assert.equal(r.responsable.nombre, 'Sofia Morales');
      assert.equal(r.vinculo.parentesco, 'Madre');
      assert.equal(r.vinculo.es_principal, true);
      assert.equal(r.vinculo.autoriza_atencion, true);
      assert.ok(r.vinculo.responsable_id);
      assert.equal(r.version_vinculo, 1);
    });

    it('responde 400 si se envía grupo_sanguineo en institución pediátrica', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminPed}`,
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          nombres: 'Ped',
          apellidos: 'Invalido',
          fecha_nacimiento: '2021-01-01',
          sexo: 'MASCULINO',
          grupo_sanguineo: 'O+',
          responsables: [
            {
              nombres: 'Tutor',
              apellidos: 'Test',
              telefono: '55511111',
              parentesco: 'Padre',
              es_principal: true,
              autoriza_atencion: true,
            },
          ],
        }),
      });

      assert.equal(respuesta.status, 400);
      const cuerpo = await respuesta.json() as { error: { codigo: string; mensaje: string } };
      assert.equal(cuerpo.error.codigo, 'SOLICITUD_INVALIDA');
      assert.equal(cuerpo.error.mensaje, 'La solicitud no es válida.');
    });

    it('responde 400 si falta la cabecera Idempotency-Key', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
        },
        body: JSON.stringify({
          nombres: 'Sin',
          apellidos: 'Clave',
          fecha_nacimiento: '1990-01-01',
          sexo: 'MASCULINO',
        }),
      });

      assert.equal(respuesta.status, 400);
      const cuerpo = await respuesta.json() as { error: { codigo: string } };
      assert.equal(cuerpo.error.codigo, 'SOLICITUD_INVALIDA');
    });

    it('responde 401 si no hay token de autenticación', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          nombres: 'Anonimo',
          apellidos: 'Prueba',
          fecha_nacimiento: '1990-01-01',
          sexo: 'MASCULINO',
        }),
      });

      assert.equal(respuesta.status, 401);
    });

    it('responde 403 si el rol carece de permiso pacientes.administrar', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenMedicoHosp}`,
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          nombres: 'Medico',
          apellidos: 'IntentaCrear',
          fecha_nacimiento: '1990-01-01',
          sexo: 'MASCULINO',
        }),
      });

      assert.equal(respuesta.status, 403);
    });

    it('responde 409 si la identificación ya existe', async () => {
      const ident = { tipo: 'CUI', numero: '2020888880101' };

      await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          nombres: 'Original',
          apellidos: 'Titular',
          fecha_nacimiento: '1985-01-01',
          sexo: 'FEMENINO',
          identificacion: ident,
        }),
      });

      const duplicado = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          nombres: 'Segundo',
          apellidos: 'Intento',
          fecha_nacimiento: '1986-02-02',
          sexo: 'MASCULINO',
          identificacion: ident,
        }),
      });

      assert.equal(duplicado.status, 409);
      const cuerpo = await duplicado.json() as { error: { codigo: string } };
      assert.equal(cuerpo.error.codigo, 'PACIENTE_DUPLICADO');
    });
  });

  describe('GET y PATCH /api/v1/pacientes/:id', () => {
    let pacienteId: string;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/v1/pacientes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          nombres: 'Laura',
          apellidos: 'Paz',
          fecha_nacimiento: '1993-07-14',
          sexo: 'FEMENINO',
          telefono: '55577777',
        }),
      });
      const cuerpo = await res.json() as { data: PacienteDto };
      pacienteId = cuerpo.data.id;
    });

    it('obtiene paciente por ID con 200 y sobre de respuesta', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes/${pacienteId}`, {
        headers: { 'authorization': `Bearer ${tokenSecretariaHosp}` },
      });

      assert.equal(respuesta.status, 200);
      const cuerpo = await respuesta.json() as { data: PacienteDto; meta: { correlacion: string } };
      assert.equal(cuerpo.data.id, pacienteId);
      assert.equal(cuerpo.data.nombres, 'Laura');
      assert.ok(cuerpo.meta.correlacion);
    });

    it('responde 404 para un UUID inexistente', async () => {
      const fakeId = '00000000-0000-4000-8000-999999999999';
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes/${fakeId}`, {
        headers: { 'authorization': `Bearer ${tokenSecretariaHosp}` },
      });

      assert.equal(respuesta.status, 404);
    });

    it('actualiza demografía con PATCH parcial y versión esperada', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes/${pacienteId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          version_esperada: 1,
          telefono: '55588888',
          correo: 'laura.paz@example.com',
        }),
      });

      assert.equal(respuesta.status, 200);
      const cuerpo = await respuesta.json() as { data: PacienteDto };
      assert.equal(cuerpo.data.id, pacienteId);
      assert.equal(cuerpo.data.telefono, '55588888');
      assert.equal(cuerpo.data.correo, 'laura.paz@example.com');
      assert.equal(cuerpo.data.version, 2);
    });

    it('responde 409 si la version_esperada no coincide', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes/${pacienteId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          version_esperada: 1, // ya es versión 2
          telefono: '55500000',
        }),
      });

      assert.equal(respuesta.status, 409);
    });

    it('responde 400 si solo se envía version_esperada sin campos para actualizar', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes/${pacienteId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${tokenAdminHosp}`,
          'idempotency-key': randomUUID(),
        },
        body: JSON.stringify({
          version_esperada: 2,
        }),
      });

      assert.equal(respuesta.status, 400);
    });
  });

  describe('GET /api/v1/pacientes', () => {
    it('busca pacientes por término q con 200', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes?q=Laura`, {
        headers: { 'authorization': `Bearer ${tokenSecretariaHosp}` },
      });

      assert.equal(respuesta.status, 200);
      const cuerpo = await respuesta.json() as { data: PacienteDto[]; meta: { correlacion: string } };
      assert.ok(Array.isArray(cuerpo.data));
      assert.ok(cuerpo.data.length >= 1);
      assert.ok(cuerpo.meta.correlacion);
    });

    it('responde 400 si falta el parámetro q', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes`, {
        headers: { 'authorization': `Bearer ${tokenSecretariaHosp}` },
      });

      assert.equal(respuesta.status, 400);
    });

    it('responde 400 si se envía un cursor inválido o malformado', async () => {
      const respuesta = await fetch(`${baseUrl}/api/v1/pacientes?q=Laura&cursor=cursor-invalido-123`, {
        headers: { 'authorization': `Bearer ${tokenSecretariaHosp}` },
      });

      assert.equal(respuesta.status, 400);
      const cuerpo = await respuesta.json() as { error: { codigo: string } };
      assert.equal(cuerpo.error.codigo, 'SOLICITUD_INVALIDA');
    });
  });
});
