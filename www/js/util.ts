import i18next from 'i18next';

/* formatting units for display:
  - if value >= 100, round to the nearest integer
   e.g. "105 mi", "119 kmph"
  - if 1 <= value < 100, round to 3 significant digits
    e.g. "7.02 km", "11.3 mph"
  - if value < 1, round to 2 decimal places
    e.g. "0.07 mi", "0.75 km" */
export function formatForDisplay(value: number, opts: Intl.NumberFormatOptions = {}): string {
  opts.maximumFractionDigits ??= value >= 100 ? 0 : 1;
  return Intl.NumberFormat(i18next.resolvedLanguage, opts).format(value);
}
