import unittest
from cola import cargar, evaluar


def fila(id, estado="PENDIENTE", ejecutor="—", dependencias="Puerta de fase"):
    return f"| [{id}](tarea.md) | {id.split('-')[1]} | {ejecutor} | {estado} | {dependencias} | Sin ejecución |"


class ColaTests(unittest.TestCase):
    def test_ambos_lotes_disponibles_sin_asignacion_personal(self):
        tareas, cierres = cargar(fila("E00-P1-01") + "\n" + fila("E00-P2-01"))
        self.assertEqual([t['id'] for t in evaluar(tareas, cierres)['disponibles']], ["E00-P1-01", "E00-P2-01"])

    def test_dependencia_pendiente_impide_avance(self):
        tareas, cierres = cargar(fila("E00-P1-01") + "\n" + fila("E00-P2-02", dependencias="E00-P1-01"))
        self.assertEqual(len(evaluar(tareas, cierres)['disponibles']), 1)

    def test_cambiar_de_persona_no_cambia_dependencias(self):
        tareas, cierres = cargar(fila("E00-P1-01", "HECHA", "Davidix888") + "\n" + fila("E00-P2-02", dependencias="E00-P1-01"))
        self.assertEqual(evaluar(tareas, cierres)['disponibles'][0]['id'], "E00-P2-02")

    def test_puerta_exige_tareas_y_cierre(self):
        tareas, cierres = cargar(fila("E00-P1-01", "HECHA") + "\n" + fila("E01-P1-01") + "\n| E00 | PENDIENTE | cierre.md |")
        self.assertEqual(evaluar(tareas, cierres)['disponibles'], [])
        cierres["E00"] = "HECHA"
        self.assertEqual(evaluar(tareas, cierres)['disponibles'][0]['id'], "E01-P1-01")
        tareas["E00-P1-01"]["estado"] = "EN_REVISION"
        self.assertEqual(evaluar(tareas, cierres)['disponibles'], [])

    def test_reservada_y_liberada_no_se_duplican(self):
        for estado, ejecutor in [("EN_CURSO", "JDaniC"), ("PENDIENTE", "Davidix888"), ("BLOQUEADA", "—")]:
            tareas, cierres = cargar(fila("E00-P2-01", estado, ejecutor))
            self.assertEqual(evaluar(tareas, cierres)['disponibles'], [])

    def test_dependencia_desconocida_falla_sin_suponer_disponibilidad(self):
        with self.assertRaisesRegex(ValueError, "inexistente"):
            cargar(fila("E00-P1-01", dependencias="E00-P2-99"))

    def test_ciclo(self):
        with self.assertRaisesRegex(ValueError, "Ciclo"):
            cargar(fila("E00-P1-01", dependencias="E00-P2-01") + "\n" + fila("E00-P2-01", dependencias="E00-P1-01"))

    def test_duplicado_estado_y_fila_invalidos(self):
        for texto in [fila("E00-P1-01") + "\n" + fila("E00-P1-01"), fila("E00-P1-01", "LISTA"), "| [E00-P1-01](x) | P1 | PENDIENTE |"]:
            with self.assertRaises(ValueError):
                cargar(texto)
