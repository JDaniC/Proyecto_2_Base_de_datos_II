import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const directorioDestino = resolve(process.argv[2] ?? 'dist', 'docs');
await mkdir(directorioDestino, { recursive: true });
await copyFile(resolve('docs/openapi.yaml'), resolve(directorioDestino, 'openapi.yaml'));
