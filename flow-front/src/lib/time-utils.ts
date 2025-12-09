/**
 * Utilitários para manipulação de horas e minutos
 * Precisão: 5 minutos (0.0833h)
 */

/**
 * Converte decimal de horas para objeto com horas e minutos
 * @example decimalToHoursAndMinutes(1.5) → { hours: 1, minutes: 30 }
 * @example decimalToHoursAndMinutes(2.0833) → { hours: 2, minutes: 5 }
 */
export function decimalToHoursAndMinutes(decimal: number): { hours: number; minutes: number } {
  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

/**
 * Converte horas e minutos para decimal
 * @example hoursAndMinutesToDecimal(1, 30) → 1.5
 * @example hoursAndMinutesToDecimal(2, 5) → 2.0833
 */
export function hoursAndMinutesToDecimal(hours: number, minutes: number): number {
  const decimal = hours + (minutes / 60);
  // Arredonda para 4 casas decimais para evitar problemas de ponto flutuante
  return Math.round(decimal * 10000) / 10000;
}

/**
 * Arredonda decimal de horas para múltiplos de 5 minutos
 * @example roundToFiveMinutes(1.52) → 1.5 (1h 30min)
 * @example roundToFiveMinutes(1.54) → 1.5833 (1h 35min)
 */
export function roundToFiveMinutes(decimal: number): number {
  const totalMinutes = decimal * 60;
  const roundedMinutes = Math.round(totalMinutes / 5) * 5;
  return Math.round((roundedMinutes / 60) * 10000) / 10000;
}

/**
 * Formata decimal de horas para exibição
 * @example formatHoursToDisplay(1.5) → "1h 30min"
 * @example formatHoursToDisplay(2.0833) → "2h 5min"
 * @example formatHoursToDisplay(0.5) → "30min"
 * @example formatHoursToDisplay(8) → "8h"
 * @example formatHoursToDisplay(0) → "0min"
 */
export function formatHoursToDisplay(decimal: number | string | null | undefined): string {
  const value = Number(decimal) || 0;
  const { hours, minutes } = decimalToHoursAndMinutes(value);

  if (hours === 0 && minutes === 0) {
    return '0min';
  }

  if (hours === 0) {
    return `${minutes}min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

/**
 * Formata decimal de horas para exibição compacta (para tabelas e cards)
 * @example formatHoursCompact(1.5) → "1:30"
 * @example formatHoursCompact(2.0833) → "2:05"
 * @example formatHoursCompact(0.5) → "0:30"
 */
export function formatHoursCompact(decimal: number | string | null | undefined): string {
  const value = Number(decimal) || 0;
  const { hours, minutes } = decimalToHoursAndMinutes(value);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Gera array de opções de minutos (0, 5, 10, ... 55)
 */
export function getMinuteOptions(): number[] {
  return Array.from({ length: 12 }, (_, i) => i * 5);
}

/**
 * Valida se o valor de minutos é múltiplo de 5
 */
export function isValidMinutes(minutes: number): boolean {
  return minutes >= 0 && minutes < 60 && minutes % 5 === 0;
}

/**
 * Formata a diferença de horas (para histórico)
 * @example formatHoursDiff(1.5) → "+1h 30min"
 * @example formatHoursDiff(-0.5) → "-30min"
 */
export function formatHoursDiff(decimal: number | string | null | undefined): string {
  const value = Number(decimal) || 0;
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatHoursToDisplay(Math.abs(value))}`;
}
