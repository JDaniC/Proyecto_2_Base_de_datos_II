"""Auditoría local de E00-P1-03. Solo lee el contrato; no conecta API ni motores.

Ejecutar desde cualquier directorio con el venv documentado en Backend/docs.
Salida: resultados.json e inventario.csv, junto a este archivo.
Un FAIL reproduce una desviación del artefacto auditado, no un fallo de HTTP real.
"""
import copy
import csv
import importlib.util
import json
from collections import Counter
from decimal import Decimal
from pathlib import Path
import re
import shutil
import tempfile
import argparse
import hashlib
import subprocess

import yaml
from jsonschema import FormatChecker

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--revalidar', action='store_true', help='Escribe resultados actuales separados de la auditoría original.')
args = parser.parse_args()
base = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
if not args.revalidar:
    dirty = subprocess.run(['git', 'diff', '--quiet', 'HEAD', '--', 'Backend'], cwd=ROOT).returncode
    if base != '126bf9b09435bc21ee5b72d35031e4aea27926ac' or dirty:
        raise SystemExit('El contrato cambió desde la auditoría inicial. Usar --revalidar para conservar evidencia histórica.')
suffix = '-revalidacion' if args.revalidar else ''
module_spec = importlib.util.spec_from_file_location('contrato', ROOT / 'Backend/scripts/validar_contrato.py')
c = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(c)
spec = yaml.safe_load((c.DOCS / 'openapi.yaml').read_text())
fixtures = json.loads((c.DOCS / 'fixtures/contrato-v1.json').read_text(), parse_float=Decimal)
by_id = {f['id']: f['value'] for f in fixtures}
schemas = spec['components']['schemas']
results = []


def errors(schema, value):
    validator = c.ExactValidator({'components': c.decimal_values(spec['components']),
                                 '$ref': '#/components/schemas/' + schema},
                                format_checker=FormatChecker())
    return [str(e.message) for e in validator.iter_errors(value)]


def record(test_id, category, passed, evidence, finding=None):
    results.append({'id': test_id, 'categoria': category, 'resultado': 'PASS' if passed else 'FAIL',
                    'evidencia': evidence, 'hallazgo': finding,
                    'entorno': 'OFFLINE_SIN_API_NI_MOTORES'})


# Inventario primero: endpoints, esquemas, declaraciones y métodos de diseño,
# funciones Python y trazas UI. Los riesgos son clasificación de esta auditoría.
inventory = []
for path, item in spec['paths'].items():
    for method, op in item.items():
        inventory.append({'unidad': op['operationId'], 'tipo': 'ENDPOINT_ESPECIFICADO',
                          'riesgo': 'HIGH' if method == 'get' else 'CRITICAL',
                          'archivo': 'Backend/docs/openapi.yaml',
                          'referencia': method.upper() + ' ' + path, 'ejecutable': 'NO'})
for name in schemas:
    inventory.append({'unidad': name, 'tipo': 'ESQUEMA', 'riesgo': 'HIGH',
                      'archivo': 'Backend/docs/openapi.yaml', 'referencia': 'components.schemas.' + name,
                      'ejecutable': 'VALIDACION_OFFLINE'})
for row in json.loads((OUT / ('inventario-puertos' + suffix + '.json')).read_text()):
    inventory.append({**{k: v for k, v in row.items() if k != 'linea'},
                      'riesgo': 'CRITICAL' if row['unidad'] in ('UnidadDeTrabajo', 'UnidadDeTrabajo.ejecutar',
                                                               'VerificadorIdentidad.verificar') else 'HIGH',
                      'referencia': str(row['linea']), 'ejecutable': 'NO'})
with (OUT / 'inventario-python.csv').open() as stream:
    for row in csv.DictReader(stream):
        inventory.append({'unidad': row['unit'], 'tipo': 'FUNCION_PYTHON', 'riesgo': 'HIGH',
                          'archivo': 'Backend/' + row['path'], 'referencia': row['line'], 'ejecutable': 'SI'})
mapping = json.loads((c.DOCS / 'mapa-ui-v1.json').read_text())
for row in mapping:
    inventory.append({'unidad': row['metodo'], 'tipo': 'TRAZA_UI', 'riesgo': 'HIGH',
                      'archivo': 'Backend/docs/mapa-ui-v1.json', 'referencia': row['destino'],
                      'ejecutable': 'SOLO_MAPEO'})
with (OUT / ('inventario' + suffix + '.csv')).open('w') as stream:
    writer = csv.DictWriter(stream, lineterminator='\n', fieldnames=['unidad', 'tipo', 'riesgo', 'archivo', 'referencia', 'ejecutable'])
    writer.writeheader()
    writer.writerows(inventory)


baseline = c.validate_artifacts()
record('T01', 'Sintaxis/fixtures/mapa', baseline['resultado'] == 'PASS', baseline)
record('T02', 'Funciones: Decimal recursivo',
       c.decimal_values({'a': [36.3, True, None]}) == {'a': [Decimal('36.3'), True, None]},
       'Decimal conserva precisión, booleanos y null en objetos/arreglos.')
record('T03', 'Funciones: entero matemático y tipo incorrecto',
       c.is_integer(None, Decimal('120.0')) and not c.is_integer(None, Decimal('120.5'))
       and not c.is_integer(None, True) and not c.is_integer(None, Decimal('Infinity')),
       '120.0 aceptado; 120.5, booleano e infinito rechazados como integer.')
try:
    c.require(False, 'prueba sintética')
    raised = False
except ValueError as exc:
    raised = str(exc) == 'prueba sintética'
record('T04', 'Funciones: excepción controlada', c.require(True, '') is None and raised,
       'require(True) continúa; require(False) lanza ValueError con mensaje esperado.')

# Excepciones y faltantes, en copias desechables: nunca se edita Backend/docs.
for case_id, mutation in [('T05', 'fixture'), ('T06', 'destino')]:
    with tempfile.TemporaryDirectory(prefix='auditoria-e00-') as directory:
        tmp = Path(directory) / 'docs'
        shutil.copytree(c.DOCS, tmp)
        if mutation == 'fixture':
            rows = json.loads((tmp / 'fixtures/contrato-v1.json').read_text())
            rows[0]['valid'] = not rows[0]['valid']
            (tmp / 'fixtures/contrato-v1.json').write_text(json.dumps(rows))
        else:
            rows = json.loads((tmp / 'mapa-ui-v1.json').read_text())
            next(r for r in rows if r['destino'] == 'COMUN_V1')['operationId'] = 'NO_EXISTE'
            (tmp / 'mapa-ui-v1.json').write_text(json.dumps(rows))
        original = c.DOCS
        c.DOCS = tmp
        try:
            c.validate_artifacts()
            raised = False
        except ValueError as exc:
            raised = True
            message = str(exc)
        finally:
            c.DOCS = original
        record(case_id, 'Funciones: rechazo de artefacto inconsistente', raised,
               message if raised else 'Aceptó artefacto inconsistente.')

# Fronteras independientes del contrato, útiles para ambas personas.
for schema, value, valid, label in [
    ('FechaCivil', '2024-02-29', True, 'bisiesto válido'),
    ('FechaCivil', '2026-02-29', False, 'día inexistente'),
    ('InstanteUTC', '2026-10-25T06:00:00-06:00', False, 'evento sin Z'),
    ('UUID', '1', False, 'ID nativo'),
    ('Cursor', '', False, 'cursor vacío'),
    ('Cursor', 'a' * 2048, True, 'cursor en límite sintáctico'),
    ('Cursor', 'a' * 2049, False, 'cursor sobre límite'),
    ('SignosVitales', {'temperatura_c': Decimal('36.3')}, True, 'precisión decimal válida'),
    ('SignosVitales', {'temperatura_c': Decimal('36.31')}, False, 'precisión excedida'),
    ('SignosVitales', {'presion_sistolica': Decimal('120.5')}, False, 'presión fraccionaria'),
    ('CambioPaciente', {'version_esperada': 1}, False, 'PATCH vacío'),
    ('CambioPaciente', {'version_esperada': 1, 'correo': None}, True, 'retirar opcional'),
    ('CambioPaciente', {'version_esperada': 1, 'nombres': None}, False, 'retirar obligatorio'),
]:
    observed = not errors(schema, value)
    record('T07-' + label, 'Entrada/límite/fecha', observed == valid,
           {'esquema': schema, 'esperado_valido': valid, 'observado_valido': observed})

for field in ('actor', 'motor', 'institucion'):
    value = copy.deepcopy(by_id['completa-CLINICA_ODONTOLOGICA'])
    value[field] = 'FALSIFICADO'
    record('T08-' + field, 'Entrada cerrada', bool(errors('ConsultaDental', value)),
           'Campo desconocido rechazado por esquema; no prueba autenticación efectiva.')

# AF01: dos nombres físicos válidos de 40 caracteres producen 81 con separador.
legacy = copy.deepcopy(by_id['respuesta-Paciente'])
legacy['data']['nombres'] = 'A' * 40 + ' ' + 'B' * 40
legacy_errors = errors('RespuestaPaciente', legacy)
record('T09', 'Conservación de lectura legada', not legacy_errors,
       {'longitud_nombres': len(legacy['data']['nombres']), 'errores': legacy_errors,
        'esperado': 'Lectura válida sin truncar grupos permitidos en el modelo físico.'}, 'AF01')

# AF02: nombre clínico aceptado sobrepasa la columna dental actual.
dental = copy.deepcopy(by_id['completa-CLINICA_ODONTOLOGICA'])
dental['diagnosticos'][0]['nombre'] = 'D' * 181
sql = (ROOT / 'Database/clinica_odontologica_mysql.sql').read_text()
diagnosis_table = sql.split('CREATE TABLE IF NOT EXISTS diagnostico (', 1)[1].split(') ENGINE=InnoDB;', 1)[0]
limit = int(re.search(r'nombre VARCHAR\((\d+)\)', diagnosis_table).group(1))
contract_valid = not errors('ConsultaDental', dental)
record('T10', 'Compatibilidad declarada con modelo dental', not contract_valid or 181 <= limit,
       {'contrato_acepta': contract_valid, 'longitud': 181, 'limite_columna_actual': limit,
        'tipo': 'CONTRASTE_ESTATICO; no inserción SQL ni adaptador ejecutado',
        'esperado': 'Límite compatible o decisión de extensión/mapeo explícita antes de congelar.'}, 'AF02')

# AF03: corrección válida retira un diagnóstico; el enlace documentado consulta
# la versión vigente y busca un UUID que ya no existe en ella.
event = copy.deepcopy(by_id['historial-padre-DIAGNOSTICO'])
current = copy.deepcopy(by_id['respuesta-Consulta'])
correction = copy.deepcopy(by_id['consultaCorregir-valido'])
correction['version_esperada'] = current['data']['version']
correction['contenido']['diagnosticos'] = []
current['data']['diagnosticos'] = []
current['data']['version'] += 1
values_valid = not errors('EventoHistorial', event) and not errors('RespuestaConsulta', current)
values_valid = values_valid and not errors('CorregirConsulta', correction)
resolved = any(d['id'] == event['recurso_id'] for d in current['data']['diagnosticos'])
if args.revalidar:
    # La regresión inicial buscaba en vigente. El contrato corregido selecciona
    # la versión indicada; estas son representaciones, no lecturas de un motor.
    original = copy.deepcopy(by_id['respuesta-Consulta']['data'])
    versions = {(original['id'], original['version']): original,
                (current['data']['id'], current['data']['version']): current['data']}
    selected = versions.get((event['consulta_id'], event.get('version_consulta')))
    version_parameter = any(p.get('name') == 'version' and p['schema'] == {'$ref': '#/components/schemas/Version'}
                            for p in spec['paths']['/consultas/{id}']['get']['parameters'])
    port = 'porVersion(id: UUID, version: Version)' in (ROOT / 'Backend/docs/puertos-v1.ts').read_text()
    resolved = bool(selected and any(d['id'] == event['recurso_id'] for d in selected['diagnosticos'])
                    and version_parameter and port)
record('T11', 'Resolución de evento tras corrección', values_valid and resolved,
       {'evento_correccion_y_respuesta_validos': values_valid, 'uuid_hijo_en_lectura_seleccionada': resolved,
        'seleccion': 'version_exacta' if args.revalidar else 'vigente',
        'evento_tiene_version_consulta': 'version_consulta' in event,
        'GET_consulta_admite_version': any(p.get('name') == 'version' for p in
                                          spec['paths']['/consultas/{id}']['get']['parameters']),
        'esperado': 'Evento histórico conserva enlace inequívoco a su snapshot sin barrer revisiones.',
        'tipo': 'CONTRAEJEMPLO_DOCUMENTAL; no servidor ni corrección persistida ejecutados'}, 'AF03')

# AF04: la lectura conserva valores legados que los modelos almacenan con
# límites/formas más amplios que los comandos de alta y cambio.
legacy_patient = copy.deepcopy(by_id['respuesta-Paciente-campos-legados'])
legacy_data = legacy_patient['data']
read_valid = not errors('RespuestaPaciente', legacy_patient)
read_valid = read_valid and not errors('RespuestaPacientes', {
    'data': [legacy_data], 'meta': legacy_patient['meta']})
expediente = copy.deepcopy(by_id['respuesta-Expediente'])
expediente['data']['paciente'] = legacy_data
read_valid = read_valid and not errors('RespuestaExpediente', expediente)
for length in (501, 4000, 4001):
    candidate = copy.deepcopy(legacy_patient)
    candidate['data']['direccion'] = 'D' * length
    read_valid = read_valid and not errors('RespuestaPaciente', candidate)
write = copy.deepcopy(by_id['pacienteCrear-valido'])
write['direccion'] = 'D' * 501
create_rejects_over_limit = bool(errors('AltaPaciente', write))
patch_rejects_over_limit = bool(errors('CambioPaciente', {'version_esperada': 1, 'direccion': 'D' * 501}))
responsable = {
    'id': '00000000-0000-4000-8000-000000000003',
    'nombre': 'N' * 401,
    'telefono': 'T' * 40,
    'documento': {'tipo': 'DOCUMENTO_LEGADO', 'numero': 'I' * 120},
    'version': 1,
    'nombres': 'N' * 200,
    'apellidos': 'A' * 200,
}
vinculo = {
    'responsable_id': responsable['id'], 'version_responsable': 1, 'parentesco': 'Madre',
    'es_principal': True, 'autoriza_atencion': True,
}
responsable_read_valid = not errors('ResponsablePaciente', {
    'responsable': responsable, 'vinculo': vinculo, 'version_vinculo': 1})
record('T12', 'Conservación de lecturas legadas y límites de captura',
       read_valid and create_rejects_over_limit and patch_rejects_over_limit and responsable_read_valid,
       {'paciente_legado_valido_en_ficha_lista_y_expediente': read_valid,
        'longitudes_direccion_leida': [501, 4000, 4001],
        'alta_rechaza_direccion_501': create_rejects_over_limit,
        'cambio_rechaza_direccion_501': patch_rejects_over_limit,
        'responsable_legado_valido': responsable_read_valid,
        'tipo': 'CONTRATO_OFFLINE; no API ni motores ejecutados'}, 'AF04')

output = {'base_git': base, 'incluye_cambios_locales': bool(subprocess.run(
              ['git', 'diff', '--quiet', 'HEAD', '--', 'Backend'], cwd=ROOT).returncode),
          'sha256_artefactos': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                               for p in [c.DOCS / 'openapi.yaml', c.DOCS / 'puertos-v1.ts',
                                         c.DOCS / 'fixtures/contrato-v1.json']},
          'alcance': 'E00-P1-03', 'inventario': dict(Counter(r['tipo'] for r in inventory)),
          'total_unidades_incluye_trazas': len(inventory),
          'resultados': dict(Counter(r['resultado'] for r in results)), 'pruebas': results}
(OUT / ('resultados' + suffix + '.json')).write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in output.items() if k != 'pruebas'}, ensure_ascii=False, indent=2))
