import 'reflect-metadata';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppModule } from './composicion/app.module.js';
import { crearAplicacionHttp } from './composicion/crear-aplicacion-http.js';
import { leerContratoOpenApi } from './composicion/leer-contrato-openapi.js';
import { ErrorConfiguracion, parsearConfiguracion } from './configuracion/entorno.js';

export async function iniciarServidor(
  variables: Readonly<Record<string, string | undefined>> = process.env,
) {
  const configuracion = parsearConfiguracion(variables);
  const rutaContrato = fileURLToPath(new URL('./docs/openapi.yaml', import.meta.url));
  const contrato = leerContratoOpenApi(rutaContrato);
  const aplicacion = await crearAplicacionHttp(
    AppModule.registrar(configuracion),
    contrato,
  );
  await aplicacion.listen(configuracion.puerto, configuracion.host);
  return aplicacion;
}

const rutaInvocada = process.argv[1] ? resolve(process.argv[1]) : '';
if (rutaInvocada === fileURLToPath(import.meta.url)) {
  void iniciarServidor().catch((error: unknown) => {
    if (error instanceof ErrorConfiguracion) {
      console.error(
        `Configuración inválida. Revisa las variables: ${error.variables.join(', ')}.`,
      );
    } else {
      console.error('No se pudo iniciar el servidor por un error interno.');
    }
    process.exitCode = 1;
  });
}
