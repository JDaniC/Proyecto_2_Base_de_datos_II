import { fechaCivil } from '../compartido/fecha-civil.js';
import { solicitudInvalida } from '../compartido/error-dominio.js';

/** Meses civiles cumplidos; no convierte cumpleaños a instantes ni depende de TZ. */
export function edadMesesEnFecha(nacimiento: unknown, medicion: unknown): number {
  const n = fechaCivil(nacimiento, 'fecha_nacimiento');
  const m = fechaCivil(medicion, 'fecha_medicion');
  if (m < n) throw solicitudInvalida('La medición no puede preceder al nacimiento.');
  const [ny, nm, nd] = n.split('-').map(Number);
  const [my, mm, md] = m.split('-').map(Number);
  return (my! - ny!) * 12 + mm! - nm! - (md! < nd! ? 1 : 0);
}

/** Resultado aritmético sin clasificación clínica ni recomendaciones. */
export function indiceMasaCorporal(peso: number | null, talla: number | null): number | null {
  for (const [campo, valor] of [['peso_kg', peso], ['talla_cm', talla]] as const) {
    if (valor !== null && (!Number.isFinite(valor) || valor <= 0)) {
      throw solicitudInvalida('La medición debe ser positiva y finita.', campo);
    }
  }
  if (peso === null || talla === null) return null;
  return Number((peso / ((talla / 100) ** 2)).toFixed(2));
}
