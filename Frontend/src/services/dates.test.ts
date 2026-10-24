import { describe, expect, it } from 'vitest';
import { formatCalendarDate, fromClinicDateTimeInput, toClinicDateTimeInput } from './dates';

describe('Fechas de la institución en Guatemala', () => {
  it('muestra la hora local en el formulario, sin copiar la hora UTC', () => {
    expect(toClinicDateTimeInput(new Date('2026-10-23T15:29:00Z'))).toBe('2026-10-23T09:29');
  });
  it('respeta el cambio de día al convertir desde UTC', () => {
    expect(toClinicDateTimeInput(new Date('2026-10-24T02:15:00Z'))).toBe('2026-10-23T20:15');
  });
  it('guarda la hora de Guatemala con el instante UTC correspondiente', () => {
    expect(fromClinicDateTimeInput('2026-10-23T09:29')).toBe('2026-10-23T15:29:00.000Z');
  });
  it.each([['2027-04-30', '30/4/2027'], ['2026-01-01', '1/1/2026'], ['2024-02-29', '29/2/2024']])('conserva el día de calendario %s', (date, expected) => {
    expect(formatCalendarDate(date)).toBe(expected);
  });
});
