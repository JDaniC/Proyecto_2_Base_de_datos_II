import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { Controller, Get, Module, Post, type INestApplication } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { crearAplicacionHttp } from '../../src/composicion/crear-aplicacion-http.js';
import { AppModule } from '../../src/composicion/app.module.js';
import { crearBundlesInstitucionales, type MapaRepositoriosInstitucion } from '../../src/composicion/crear-bundles-institucionales.js';
import { parsearConfiguracion } from '../../src/configuracion/entorno.js';
import { leerContratoOpenApi } from '../../src/composicion/leer-contrato-openapi.js';
import { RepositorioCuentaEnMemoria } from '../../src/adaptadores/salida/identidad/repositorio-cuenta-en-memoria.js';
import { VerificadorIdentidadMemoria, type TokenSinteticoConfig } from '../../src/adaptadores/salida/identidad/verificador-identidad-memoria.js';
import { CUENTAS_SINTETICAS } from '../../src/adaptadores/salida/identidad/semillas-sinteticas.js';
import { RequiereAcceso } from '../../src/adaptadores/entrada/http/decoradores-auth.js';
import type { CuentaAutorizada } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { RepositorioCuenta } from '../../src/aplicacion/puertos/repositorio-cuenta.js';
import { INSTITUCIONES_CANONICAS, type Institucion } from '../../src/dominio/compartido/institucion.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';

const configuracion = parsearConfiguracion({
  APP_ENV: 'test', HOST: '127.0.0.1', PORT: '3000',
  INSTITUTIONS: INSTITUCIONES_CANONICAS.join(','),
});
const contrato = leerContratoOpenApi(resolve(process.cwd(), 'docs/openapi.yaml'));

@ApiExcludeController()
@Controller('pruebas-acceso')
class ControladorPruebaAcceso {
  @Get('historial')
  @RequiereAcceso({ permisos: ['historial.leer'], capacidad: 'HISTORIAL_CLINICO' })
  historial() { return { permitido: true }; }

  @Get('agenda')
  @RequiereAcceso({ permisos: ['consultas.registrar'], capacidad: 'AGENDA' })
  agenda() { return { permitido: true }; }

  @Post('consulta')
  @RequiereAcceso({ permisos: ['consultas.registrar'], capacidad: 'CONSULTAS' })
  consulta() { return { permitido: true }; }

  @Post('receta')
  @RequiereAcceso({ permisos: ['recetas.emitir'], capacidad: 'CONSULTAS' })
  receta() { return { permitido: true }; }

  @Post('validar-resultados')
  @RequiereAcceso({ permisos: ['resultados.validar'], capacidad: 'LABORATORIO' })
  validarResultados() { return { permitido: true }; }

  @Post('analizar-resultados')
  @RequiereAcceso({ permisos: ['resultados.analizar'], capacidad: 'LABORATORIO' })
  analizarResultados() { return { permitido: true }; }
}

describe('autenticación y autorización HTTP por institución', () => {
  let app: INestApplication | undefined;
  let baseUrl = '';
  let verificador: VerificadorIdentidadMemoria;
  let repositorios: Map<Institucion, RepositorioCuentaEnMemoria>;

  before(async () => {
    const tokens: TokenSinteticoConfig[] = CUENTAS_SINTETICAS.map((cuenta) => ({
      token: `token-${cuenta.uid}`,
      uid: cuenta.uid,
      institucion: cuenta.institucion,
    }));
    const cuentaHospital = cuentaPrueba('00000000-0000-4000-8000-000000000301', 'concurrente-hospital', 'HOSPITAL_GENERAL', ['ADMIN_INSTITUCIONAL'], ['historial.leer']);
    const cuentaLaboratorio = cuentaPrueba('00000000-0000-4000-8000-000000000302', 'concurrente-laboratorio', 'LABORATORIO_CLINICO', ['ADMIN_INSTITUCIONAL'], ['historial.leer']);
    tokens.push(
      { token: 'token-concurrente-hospital', uid: cuentaHospital.uid, institucion: cuentaHospital.institucion },
      { token: 'token-concurrente-laboratorio', uid: cuentaLaboratorio.uid, institucion: cuentaLaboratorio.institucion },
      { token: 'token-institucion-discordante', uid: 'fixture-uid-hospital-admin', institucion: 'LABORATORIO_CLINICO' },
      { token: 'token-vencido', uid: 'no-importa', institucion: 'HOSPITAL_GENERAL', expirado: true },
    );
    verificador = new VerificadorIdentidadMemoria(tokens);
    repositorios = new Map();
    const mapa: Partial<Record<Institucion, { readonly cuenta: RepositorioCuenta }>> = {};
    let llegadasConcurrentes = 0;
    let liberarConcurrentes: (() => void) | undefined;
    const barreraConcurrente = new Promise<void>((resolve) => { liberarConcurrentes = resolve; });

    for (const institucion of INSTITUCIONES_CANONICAS) {
      const cuentas = CUENTAS_SINTETICAS.filter((cuenta) => cuenta.institucion === institucion);
      if (institucion === 'HOSPITAL_GENERAL') cuentas.push(cuentaHospital);
      if (institucion === 'LABORATORIO_CLINICO') cuentas.push(cuentaLaboratorio);
      const base = new RepositorioCuentaEnMemoria(institucion, cuentas);
      repositorios.set(institucion, base);
      mapa[institucion] = {
        cuenta: {
          async porUid(uid) {
            if (uid === cuentaHospital.uid || uid === cuentaLaboratorio.uid) {
              llegadasConcurrentes++;
              if (llegadasConcurrentes === 2) liberarConcurrentes?.();
              await barreraConcurrente;
            }
            return base.porUid(uid);
          },
        },
      };
    }

    @Module({
      imports: [AppModule.registrar(configuracion, {
        bundles: crearBundlesInstitucionales(INSTITUCIONES_CANONICAS, mapa as MapaRepositoriosInstitucion),
        verificadorIdentidad: verificador,
      })],
      controllers: [ControladorPruebaAcceso],
    })
    class ModuloPruebaAcceso {}

    app = await crearAplicacionHttp(ModuloPruebaAcceso, contrato);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => { await app?.close(); });

  it('resuelve la sesión en el bundle declarado por el token para las cuatro instituciones', async () => {
    const cuentasAdmin = CUENTAS_SINTETICAS.filter((cuenta) => cuenta.roles.includes('ADMIN_INSTITUCIONAL'));
    assert.equal(cuentasAdmin.length, 4);
    for (const cuenta of cuentasAdmin) {
      const respuesta = await fetch(`${baseUrl}/api/v1/sesion`, {
        method: 'POST', headers: { authorization: `Bearer token-${cuenta.uid}` },
      });
      const cuerpo = await respuesta.json() as { data: { cuenta_id: string; institucion: Institucion } };
      assert.equal(respuesta.status, 200);
      assert.equal(cuerpo.data.institucion, cuenta.institucion);
      assert.equal(cuerpo.data.cuenta_id, cuenta.id);
    }
    const actual = await fetch(`${baseUrl}/api/v1/sesion`, {
      headers: { authorization: 'Bearer token-fixture-uid-hospital-admin' },
    });
    const perfil = await actual.json() as { data: { institucion: string; cuenta_id: string; roles: string[]; permisos: string[] } };
    assert.equal(actual.status, 200);
    assert.equal(perfil.data.institucion, 'HOSPITAL_GENERAL');
    assert.ok(perfil.data.roles.includes('ADMIN_INSTITUCIONAL'));
    assert.ok(perfil.data.permisos.includes('usuarios.administrar'));
    assert.equal('uid' in perfil.data, false);
  });

  it('rechaza token ausente, malformado, vencido y revocado con 401', async () => {
    const casos = [
      { headers: {} },
      { headers: { authorization: 'Bearer' } },
      { headers: { authorization: 'Bearer token-vencido' } },
      { headers: { authorization: 'Bearer token-fixture-uid-hospital-admin extra' } },
    ];
    for (const caso of casos) {
      const respuesta = await fetch(`${baseUrl}/api/v1/sesion`, { headers: caso.headers });
      const cuerpo = await respuesta.json() as { error: { codigo: string } };
      assert.equal(respuesta.status, 401);
      assert.equal(cuerpo.error.codigo, 'NO_AUTENTICADO');
    }
    const token = 'token-fixture-uid-hospital-secretaria';
    const cierre = await fetch(`${baseUrl}/api/v1/sesion/cierre`, {
      method: 'POST', headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(cierre.status, 200);
    const siguiente = await fetch(`${baseUrl}/api/v1/sesion`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(siguiente.status, 401);
  });

  it('deniega cuenta inactiva y claim institucional discordante con la cuenta local', async () => {
    const inactiva = await fetch(`${baseUrl}/api/v1/sesion`, {
      headers: { authorization: 'Bearer token-fixture-uid-hospital-cuenta-inactiva' },
    });
    const errorInactiva = await inactiva.json() as { error: { codigo: string } };
    assert.equal(inactiva.status, 403);
    assert.equal(errorInactiva.error.codigo, 'CUENTA_NO_HABILITADA');

    const discordante = await fetch(`${baseUrl}/api/v1/sesion`, {
      headers: { authorization: 'Bearer token-institucion-discordante' },
    });
    assert.equal(discordante.status, 403);
  });

  it('lee estado y permisos actuales en cada petición; un cambio de cuenta surte efecto de inmediato', async () => {
    const token = 'token-fixture-uid-hospital-admin';
    const antes = await fetch(`${baseUrl}/api/v1/pruebas-acceso/historial`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(antes.status, 200);

    const repositorio = repositorios.get('HOSPITAL_GENERAL')!;
    const cuenta = await repositorio.porUid('fixture-uid-hospital-admin');
    assert.ok(cuenta);
    repositorio.registrarCuenta({ ...cuenta, permisos: [] });
    const despues = await fetch(`${baseUrl}/api/v1/pruebas-acceso/historial`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const cuerpo = await despues.json() as { error: { codigo: string } };
    assert.equal(despues.status, 403);
    assert.equal(cuerpo.error.codigo, 'SIN_PERMISO');
  });

  it('deniega capacidades no disponibles aunque el permiso local coincida', async () => {
    const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-acceso/agenda`, {
      headers: { authorization: 'Bearer token-fixture-uid-lab-medico' },
    });
    assert.equal(respuesta.status, 403);
  });

  it('aplica permisos vigentes a lectura, consulta, receta y validación por API', async () => {
    const secretaria = 'token-fixture-uid-dental-secretaria';
    for (const [ruta, metodo] of [
      ['historial', 'GET'],
      ['consulta', 'POST'],
      ['receta', 'POST'],
    ] as const) {
      const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-acceso/${ruta}`, {
        method: metodo,
        headers: { authorization: `Bearer ${secretaria}` },
      });
      assert.equal(respuesta.status, 403, `${ruta} debe denegarse a secretaría`);
    }

    const analista = await fetch(`${baseUrl}/api/v1/pruebas-acceso/validar-resultados`, {
      method: 'POST', headers: { authorization: 'Bearer token-fixture-uid-lab-analista' },
    });
    assert.equal(analista.status, 403);

    const validador = await fetch(`${baseUrl}/api/v1/pruebas-acceso/validar-resultados`, {
      method: 'POST', headers: { authorization: 'Bearer token-fixture-uid-lab-validador' },
    });
    assert.equal(validador.status, 201);

    const analistaPermitido = await fetch(`${baseUrl}/api/v1/pruebas-acceso/analizar-resultados`, {
      method: 'POST', headers: { authorization: 'Bearer token-fixture-uid-lab-analista' },
    });
    assert.equal(analistaPermitido.status, 201);
  });

  it('no acepta autoridad enviada en el body ni cambia el bundle por query', async () => {
    const cuerpoFalsificado = await fetch(`${baseUrl}/api/v1/sesion`, {
      method: 'POST',
      headers: { authorization: 'Bearer token-fixture-uid-hospital-admin', 'content-type': 'application/json' },
      body: JSON.stringify({ institucion: 'LABORATORIO_CLINICO', actor_id: 'otro', rol: 'ADMIN_INSTITUCIONAL' }),
    });
    assert.equal(cuerpoFalsificado.status, 400);

    const conSelector = await fetch(`${baseUrl}/api/v1/sesion?institucion=LABORATORIO_CLINICO`, {
      headers: { authorization: 'Bearer token-fixture-uid-hospital-admin' },
    });
    const cuerpo = await conSelector.json() as { data: { institucion: string } };
    assert.equal(conSelector.status, 200);
    assert.equal(cuerpo.data.institucion, 'HOSPITAL_GENERAL');
  });

  it('mantiene el aislamiento al intercalar peticiones simultáneas de hospital y laboratorio', async () => {
    const [hospital, laboratorio] = await Promise.all([
      fetch(`${baseUrl}/api/v1/sesion`, { headers: { authorization: 'Bearer token-concurrente-hospital' } }),
      fetch(`${baseUrl}/api/v1/sesion`, { headers: { authorization: 'Bearer token-concurrente-laboratorio' } }),
    ]);
    const [sesionHospital, sesionLaboratorio] = await Promise.all([
      hospital.json() as Promise<{ data: { institucion: string; cuenta_id: string } }>,
      laboratorio.json() as Promise<{ data: { institucion: string; cuenta_id: string } }>,
    ]);
    assert.equal(hospital.status, 200);
    assert.equal(laboratorio.status, 200);
    assert.equal(sesionHospital.data.institucion, 'HOSPITAL_GENERAL');
    assert.equal(sesionHospital.data.cuenta_id, cuentaHospitalId);
    assert.equal(sesionLaboratorio.data.institucion, 'LABORATORIO_CLINICO');
    assert.equal(sesionLaboratorio.data.cuenta_id, cuentaLaboratorioId);
  });

  it('falla cerrado con 503 si Firebase Auth no está disponible', async () => {
    verificador.establecerDisponibilidad(false);
    try {
      const respuesta = await fetch(`${baseUrl}/api/v1/sesion`, {
        headers: { authorization: 'Bearer token-fixture-uid-hospital-admin' },
      });
      const cuerpo = await respuesta.json() as { error: { codigo: string } };
      assert.equal(respuesta.status, 503);
      assert.equal(cuerpo.error.codigo, 'IDENTIDAD_NO_DISPONIBLE');
    } finally {
      verificador.establecerDisponibilidad(true);
    }
  });
});

const cuentaHospitalId = '00000000-0000-4000-8000-000000000301';
const cuentaLaboratorioId = '00000000-0000-4000-8000-000000000302';

function cuentaPrueba(
  id: string,
  uid: string,
  institucion: Institucion,
  roles: CuentaAutorizada['roles'],
  permisos: CuentaAutorizada['permisos'],
): CuentaAutorizada {
  return Object.freeze({
    id: uuidPublico(id), uid, institucion, estado: 'ACTIVA', roles, permisos,
    version: versionPositiva(1),
  });
}
