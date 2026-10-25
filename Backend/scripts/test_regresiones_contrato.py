"""Regresiones de diseño AF01–AF07, sin API/motores ni dobles de persistencia.

Valida representabilidad y coherencia de los fixtures/contratos; no demuestra
que un adaptador guarde, recupere o autorice versiones en ejecución.
"""
import copy
import json
import re
import unittest

import yaml
from jsonschema import FormatChecker
from validar_contrato import DOCS, ROOT, ExactValidator, decimal_values


class RegresionesContrato(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = yaml.safe_load((DOCS / 'openapi.yaml').read_text())
        cls.components = decimal_values(cls.spec['components'])
        cls.fixtures = {f['id']: f['value'] for f in json.loads((DOCS / 'fixtures/contrato-v1.json').read_text())}

    def valid(self, schema, data):
        return ExactValidator({'components': self.components, '$ref': '#/components/schemas/' + schema},
                              format_checker=FormatChecker()).is_valid(data)

    def test_af01_lecturas_conservan_maximos_de_los_cuatro_modelos(self):
        for institution, limit in [('HOSPITAL_GENERAL', 161), ('CLINICA_ODONTOLOGICA', 160),
                                   ('LABORATORIO_CLINICO', 161), ('CENTRO_MEDICO_PEDIATRICO', 200)]:
            with self.subTest(institution=institution):
                response = copy.deepcopy(self.fixtures['respuesta-Paciente'])
                response['data'].update(institucion=institution, nombres='A' * limit, apellidos='B' * limit)
                self.assertTrue(self.valid('RespuestaPaciente', response))
                self.assertTrue(self.valid('RespuestaPacientes', {'data': [response['data']], 'meta': response['meta']}))
                record = copy.deepcopy(self.fixtures['respuesta-Expediente'])
                record['data']['paciente'] = response['data']
                self.assertTrue(self.valid('RespuestaExpediente', record))
                self.assertFalse(self.valid('AltaPaciente', {'nombres': 'A' * limit, 'apellidos': 'B',
                                                           'fecha_nacimiento': '2015-01-01', 'sexo': 'OTRO'}))

    def test_af04_lecturas_preservan_campos_legados_sin_ampliar_captura(self):
        response = copy.deepcopy(self.fixtures['respuesta-Paciente-campos-legados'])
        patient = response['data']
        self.assertEqual(len(patient['direccion']), 501)
        self.assertTrue(self.valid('RespuestaPaciente', response))
        self.assertTrue(self.valid('RespuestaPacientes', {'data': [patient], 'meta': response['meta']}))
        record = copy.deepcopy(self.fixtures['respuesta-Expediente'])
        record['data']['paciente'] = patient
        self.assertTrue(self.valid('RespuestaExpediente', record))

        for length in (500, 501, 4000, 4001):
            patient['direccion'] = 'D' * length
            with self.subTest(direccion=length):
                self.assertTrue(self.valid('RespuestaPaciente', response))

        capture = self.fixtures['pacienteCrear-valido']
        invalid_capture = [
            ('sexo', 'F'),
            ('identificacion', {'tipo': 'DOCUMENTO_LEGADO', 'numero': 'I' * 80}),
            ('telefono', 'T' * 31),
            ('correo', 'correo legado sin formato'),
            ('direccion', 'D' * 501),
            ('grupo_sanguineo', 'SIN SABER'),
        ]
        for field, value in invalid_capture:
            candidate = copy.deepcopy(capture)
            candidate[field] = value
            with self.subTest(captura=field):
                self.assertFalse(self.valid('AltaPaciente', candidate))

        responsible = {
            'id': '00000000-0000-4000-8000-000000000003',
            'nombre': 'N' * 401,
            'telefono': 'T' * 40,
            'documento': {'tipo': 'DOCUMENTO_LEGADO', 'numero': 'I' * 120},
            'version': 1,
            'nombres': 'N' * 200,
            'apellidos': 'A' * 200,
        }
        link = {
            'responsable_id': responsible['id'],
            'version_responsable': 1,
            'parentesco': 'Madre',
            'es_principal': True,
            'autoriza_atencion': True,
        }
        self.assertTrue(self.valid('ResponsablePaciente', {
            'responsable': responsible,
            'vinculo': link,
            'version_vinculo': 1,
        }))

    def test_af05_snapshot_de_autorizacion_acepta_identificacion_legada(self):
        ports = (DOCS / 'puertos-v1.ts').read_text()
        type_fixtures = (DOCS / 'fixtures/puertos-v1.test-d.ts').read_text()
        self.assertRegex(ports, r'identificacionHistorica:\s*IdentificacionLeida')
        self.assertRegex(ports, r"tipo: 'ALTA_RESPONSABLE'; readonly responsable: ResponsableCapturado")
        self.assertIn("tipo: 'DOCUMENTO_LEGADO'", type_fixtures)
        self.assertIn('@ts-expect-error La captura nueva sigue restringida a CUI/PASAPORTE.', type_fixtures)

    def test_af06_liberacion_acepta_identidad_legada_reserva_restringida(self):
        ports = (DOCS / 'puertos-v1.ts').read_text()
        type_fixtures = (DOCS / 'fixtures/puertos-v1.test-d.ts').read_text()
        self.assertRegex(ports, r"tipo: 'LIBERAR_IDENTIDAD'; readonly identidad: IdentificacionLeida")
        self.assertRegex(ports, r"tipo: 'RESERVAR_IDENTIDAD'; readonly identidad: Identificacion")
        self.assertIn("tipo: 'LIBERAR_IDENTIDAD', identidad: legacyIdentity", type_fixtures)
        self.assertIn('@ts-expect-error La reserva recibe solo Identificacion del catálogo de captura.', type_fixtures)

    def test_af07_tratamiento_etiqueta_se_mapea_a_nombre_con_limites_por_modelo(self):
        treatment = self.components['schemas']['Tratamiento']
        self.assertEqual(treatment['x-mapeo-persistencia'], {
            'HOSPITAL_GENERAL': 'tratamiento.descripcion',
            'CLINICA_ODONTOLOGICA': 'tratamiento.nombre',
            'LABORATORIO_CLINICO': 'consultas_clinicas.tratamientos[].nombre',
            'CENTRO_MEDICO_PEDIATRICO': 'consultas.tratamientos[].nombre',
        })
        self.assertIn('Tratamiento / Procedimiento',
                      (ROOT / 'Frontend/src/features/consultations/NewConsultationWizardPage.tsx').read_text())
        compat = (DOCS / 'COMPATIBILIDAD_PERSISTENCIA_V1.md').read_text()
        self.assertIn('AF07:', compat)
        self.assertIn('consulta_tratamiento', compat)
        complete_rules = self.spec['paths']['/consultas/completas']['post']['x-reglas-institucionales']['CLINICA_ODONTOLOGICA']
        add_rules = self.spec['paths']['/consultas/{id}/tratamientos']['post']['x-reglas-institucionales']['CLINICA_ODONTOLOGICA']
        correction_rules = self.spec['paths']['/consultas/{id}/correcciones']['post']['x-reglas-institucionales']['CLINICA_ODONTOLOGICA']
        self.assertIn('400 SOLICITUD_INVALIDA', complete_rules)
        self.assertIn('409 ESTADO_INVALIDO', add_rules)
        self.assertIn('400 SOLICITUD_INVALIDA', correction_rules)

        complete = copy.deepcopy(self.fixtures['consultaCompleta-valido'])
        dental_complete = copy.deepcopy(self.fixtures['completa-CLINICA_ODONTOLOGICA'])
        add = copy.deepcopy(self.fixtures['consultaTratamiento-valido'])
        correction = copy.deepcopy(self.fixtures['consultaCorregir-valido'])
        correction['contenido']['tratamientos'][0]['descripcion'] = 'L' * 2000
        read_treatment = copy.deepcopy(self.fixtures['respuesta-Consulta']['data']['tratamientos'][0])
        read_treatment['descripcion'] = 'L' * 2000

        # New capture is <=200 for three institutions; dentistry uses <=180.
        for length in (180, 181, 200, 201):
            complete['tratamientos'][0]['descripcion'] = 'N' * length
            add['tratamiento']['descripcion'] = 'N' * length
            with self.subTest(captura=length):
                self.assertEqual(self.valid('ConsultaCompleta', complete), length <= 200)
                self.assertEqual(self.valid('AgregarTratamiento', add), length <= 200)
        for schema, value, field in [
            ('ConsultaDental', dental_complete, 'tratamientos'),
            ('AgregarTratamientoDental', add, 'tratamiento'),
        ]:
            for length in (180, 181):
                candidate = copy.deepcopy(value)
                target = candidate[field][0] if field == 'tratamientos' else candidate[field]
                target['descripcion'] = 'D' * length
                with self.subTest(esquema=schema, captura=length):
                    self.assertEqual(self.valid(schema, candidate), length <= 180)

        # Correction replaces a full snapshot: Hospital can replay legacy TEXT;
        # the other three engines remain bounded by their persisted name fields.
        for length in (200, 201, 2000, 2001):
            candidate = copy.deepcopy(correction)
            candidate['contenido']['tratamientos'][0]['descripcion'] = 'H' * length
            with self.subTest(correccion='HOSPITAL_GENERAL', length=length):
                self.assertEqual(self.valid('CorregirConsulta', candidate), length <= 2000)
        for schema, maximum in [('CorregirConsultaDental', 180),
                                ('CorregirConsultaPediatrica', 200),
                                ('CorregirConsultaLaboratorio', 200)]:
            for length in (maximum, maximum + 1):
                candidate = copy.deepcopy(correction)
                candidate['contenido']['tratamientos'][0]['descripcion'] = 'C' * length
                with self.subTest(correccion=schema, length=length):
                    self.assertEqual(self.valid(schema, candidate), length <= maximum)

        self.assertTrue(self.valid('TratamientoRegistrado', read_treatment))
        read_treatment['descripcion'] += 'X'
        self.assertFalse(self.valid('TratamientoRegistrado', read_treatment))

    def test_af02_limite_dental_se_aplica_a_los_tres_comandos(self):
        sql = (ROOT / 'Database/clinica_odontologica_mysql.sql').read_text()
        table = sql.split('CREATE TABLE IF NOT EXISTS diagnostico (', 1)[1].split(') ENGINE=InnoDB;', 1)[0]
        limit = int(re.search(r'nombre VARCHAR\((\d+)\)', table).group(1))
        for path, base, overlay, fixture, nested in [
            ('/consultas/completas', 'ConsultaCompleta', 'ConsultaDental', 'completa-CLINICA_ODONTOLOGICA', None),
            ('/consultas/{id}/diagnosticos', 'AgregarDiagnostico', 'AgregarDiagnosticoDental', 'consultaDiagnostico-valido', 'diagnostico'),
            ('/consultas/{id}/correcciones', 'CorregirConsulta', 'CorregirConsultaDental', 'consultaCorregir-valido', 'contenido'),
        ]:
            operation = self.spec['paths'][path]['post']
            self.assertEqual(operation['x-esquemas-institucionales']['CLINICA_ODONTOLOGICA']['$ref'],
                             '#/components/schemas/' + overlay)
            for length in (180, 181, 200, 201):
                with self.subTest(path=path, length=length):
                    value = copy.deepcopy(self.fixtures[fixture])
                    diagnosis = (value['diagnostico'] if nested == 'diagnostico' else
                                 value['contenido']['diagnosticos'][0] if nested == 'contenido' else value['diagnosticos'][0])
                    diagnosis['nombre'] = 'D' * length
                    self.assertEqual(self.valid(overlay, value), length <= limit)
                    self.assertEqual(self.valid(base, value), length <= 200)

    def test_af03_version_obligatoria_en_todos_los_eventos_clinicos(self):
        for kind in ('CONSULTA', 'DIAGNOSTICO', 'TRATAMIENTO', 'RECETA'):
            with self.subTest(kind=kind):
                event = copy.deepcopy(self.fixtures['AF03-evento-version-' + kind])
                self.assertTrue(self.valid('EventoHistorial', event))
                del event['version_consulta']
                self.assertFalse(self.valid('EventoHistorial', event))
        operation = self.spec['paths']['/consultas/{id}']['get']
        query = {p['name']: p['schema'] for p in operation['parameters'] if p.get('in') == 'query'}
        self.assertEqual(query, {'version': {'$ref': '#/components/schemas/Version'}})
        self.assertEqual(operation['x-query-schema']['$ref'], '#/components/schemas/SeleccionConsulta')

    def test_af03_snapshots_de_modificacion_y_retirada_no_invalidan_eventos_previos(self):
        # Índice solo de los datos sintéticos del contrato; no es un adaptador.
        for case in json.loads((DOCS / 'fixtures/historia-versionada-v1.json').read_text()):
            with self.subTest(case=case['caso']):
                event, snapshots = case['evento'], case['snapshots']
                index = {(s['id'], s['version']): s for s in snapshots}
                self.assertEqual(len(index), len(snapshots))
                self.assertTrue(self.valid('EventoHistorial', event))
                for snapshot in snapshots:
                    self.assertTrue(self.valid('Consulta', snapshot))
                original = index[(event['consulta_id'], event['version_consulta'])]
                modified = index[(event['consulta_id'], 2)]
                latest = index[(event['consulta_id'], 3)]
                field = {'DIAGNOSTICO': 'diagnosticos', 'TRATAMIENTO': 'tratamientos', 'RECETA': 'receta'}[event['tipo']]
                def component(snapshot):
                    items = [snapshot[field]] if field == 'receta' and field in snapshot else snapshot.get(field, [])
                    return next((c for c in items if c['id'] == event['recurso_id']), None)
                self.assertIsNotNone(component(original))
                self.assertNotEqual(component(original), component(modified))
                self.assertIsNone(component(latest))
                self.assertNotIn((event['consulta_id'], case['version_ausente']), index)


if __name__ == '__main__':
    unittest.main()
