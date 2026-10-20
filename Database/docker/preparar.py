#!/usr/bin/env python3
"""Genera credenciales locales sin imprimirlas ni reemplazar las existentes."""
import argparse
import base64
import os
from pathlib import Path
import secrets

ROOT = Path(__file__).resolve().parents[2]
NOMBRES = ('postgres_admin_password', 'postgres_app_password', 'mysql_root_password',
           'mysql_app_password', 'mongo_admin_password', 'mongo_app_password', 'mongo_keyfile')


def preparar(destino):
    if destino.is_symlink():
        raise ValueError('El directorio de secretos no puede ser un enlace simbolico.')
    destino.mkdir(parents=True, exist_ok=True, mode=0o700)
    destino.chmod(0o700)
    creados = 0
    for nombre in NOMBRES:
        ruta = destino / nombre
        if ruta.is_symlink():
            raise ValueError('Un archivo de secretos no puede ser un enlace simbolico.')
        if ruta.exists():
            valor = ruta.read_text().strip()
            if not valor:
                raise ValueError(f'Archivo vacio: {nombre}. No se reemplaza automaticamente.')
            ruta.chmod(0o600)
            continue
        valor = base64.b64encode(os.urandom(512)).decode() if nombre == 'mongo_keyfile' else secrets.token_hex(32)
        descriptor = os.open(ruta, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'w') as archivo:
            archivo.write(valor + '\n')
        creados += 1
    return creados


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--secrets-dir', type=Path, default=ROOT / '.docker/secrets')
    args = parser.parse_args()
    print(f'Credenciales preparadas: {preparar(args.secrets_dir)} nuevas; existentes conservadas. Valores no mostrados.')
