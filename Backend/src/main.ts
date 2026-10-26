import 'reflect-metadata';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppModule } from './composicion/app.module.js';
import { crearAplicacionHttp } from './composicion/crear-aplicacion-http.js';
import { leerContratoOpenApi } from './composicion/leer-contrato-openapi.js';
import { crearDependenciasBackend, ErrorConfiguracionBackend } from './composicion/crear-dependencias-backend.js';
import { ErrorConfiguracion, parsearConfiguracion } from './configuracion/entorno.js';

export async function iniciarServidor(
  variables: Readonly<Record<string, string | undefined>> = process.env,
) {
  const configuracion = parsearConfiguracion(variables);
  const rutaContrato = fileURLToPath(new URL('./docs/openapi.yaml', import.meta.url));
  const contrato = leerContratoOpenApi(rutaContrato);
  const dependencias = await crearDependenciasBackend(variables);
  try {
    const aplicacion = await crearAplicacionHttp(
      AppModule.registrar(configuracion, dependencias ? {
        bundles: dependencias.bundles,
        verificadorIdentidad: dependencias.verificadorIdentidad,
        cerrarRecursos: dependencias.cerrar,
      } : {}),
      contrato,
    );
    aplicacion.enableShutdownHooks();
    await aplicacion.listen(configuracion.puerto, configuracion.host);
    return aplicacion;
  } catch (error: unknown) {
    try { await dependencias?.cerrar(); } catch { /* Conserva el fallo original del arranque. */ }
    throw error;
  }
}

const rutaInvocada = process.argv[1] ? resolve(process.argv[1]) : '';
if (rutaInvocada === fileURLToPath(import.meta.url)) {
  void iniciarServidor().catch((error: unknown) => {
    if (error instanceof ErrorConfiguracion || error instanceof ErrorConfiguracionBackend) {
      console.error(
        `Configuración inválida. Revisa las variables: ${error.variables.join(', ')}.`,
      );
    } else {
      console.error('No se pudo iniciar el servidor por un error interno.');
    }
    process.exitCode = 1;
  });
}
