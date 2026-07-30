/**
 * Счётчики просмотров/лайков в формате макета (`docs/figma/news1.json`:
 * `980`, `1.4k`) — тысячи с одним знаком после точки, `.0` не печатается
 * (`1000` → `1k`), меньше тысячи — как есть.
 */
export function formatCompactCount(value: number): string {
  if (value < 1000) {
    return String(value);
  }
  return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}
