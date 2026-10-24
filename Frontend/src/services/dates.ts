const CLINIC_TIME_ZONE = 'America/Guatemala';

export function toClinicDateTimeInput(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (name: string) => parts.find(part => part.type === name)!.value;
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

export function fromClinicDateTimeInput(value: string): string {
  // Guatemala uses UTC−06:00; a datetime-local input does not carry this offset.
  return new Date(`${value}-06:00`).toISOString();
}

export function formatCalendarDate(value: string): string {
  // Calendar dates must not move to the previous day when displayed in Guatemala.
  return new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}
