import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { OpenAPIObject } from '@nestjs/swagger';

export function leerContratoOpenApi(ruta: string): OpenAPIObject {
  const contenido = readFileSync(ruta, 'utf8');
  const documento: unknown = parse(contenido);

  if (
    typeof documento !== 'object' ||
    documento === null ||
    !('openapi' in documento) ||
    documento.openapi !== '3.1.0' ||
    !('paths' in documento) ||
    typeof documento.paths !== 'object' ||
    documento.paths === null
  ) {
    throw new Error('The canonical OpenAPI document is invalid.');
  }

  return documento as OpenAPIObject;
}
