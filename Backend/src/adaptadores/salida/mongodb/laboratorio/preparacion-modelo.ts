/** Contrato estático del destino011; comprobado contra el esquema por tests. */
export const preparacionLaboratorio = {
  "huella": "380abc7a0ac4f566c1aea7e26529ed8fd975faf617b63ea57cd4184850483416",
  "colecciones": [
    {
      "nombre": "ordenes",
      "huellaValidador": "ed02009c883b230300e2934e3770461bc8747992d53b5535acef49c3e1022c94",
      "indices": [
        {
          "name": "uq_orden_numero",
          "key": {
            "numero_orden": 1
          },
          "unique": true
        },
        {
          "name": "ix_orden_paciente_fecha",
          "key": {
            "paciente_id": 1,
            "fecha_orden": 1,
            "_id": 1
          }
        },
        {
          "name": "ix_orden_fecha",
          "key": {
            "fecha_orden": 1,
            "_id": 1
          }
        },
        {
          "name": "ix_orden_estado_fecha",
          "key": {
            "estado": 1,
            "fecha_orden": 1,
            "_id": 1
          }
        }
      ]
    },
    {
      "nombre": "muestras",
      "huellaValidador": "acca78944553fbd1fb2fc665526f88f8c16d62475442941c79e4330341cbc01e",
      "indices": [
        {
          "name": "uq_muestra_barras",
          "key": {
            "codigo_barras": 1
          },
          "unique": true
        },
        {
          "name": "ix_muestra_orden",
          "key": {
            "orden_id": 1,
            "_id": 1
          }
        },
        {
          "name": "ix_muestra_estado_fecha",
          "key": {
            "estado": 1,
            "fecha_toma": 1,
            "_id": 1
          }
        }
      ]
    },
    {
      "nombre": "eventos_muestra",
      "huellaValidador": "e18aaa345d9eb33d2804c7d86ebcf0b8c759a2efd82ee34d08912896ec9aa548",
      "indices": [
        {
          "name": "ix_evento_muestra_fecha",
          "key": {
            "muestra_id": 1,
            "fecha_hora": 1,
            "_id": 1
          }
        }
      ]
    }
  ]
} as const;
