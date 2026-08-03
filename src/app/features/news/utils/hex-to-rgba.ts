/**
 * `#RRGGBB`/`#RGB` → `rgba(r, g, b, alpha)` — для случаев вроде разделителя
 * `NewsCard` (`stream.Front#121`), где по макету нужна не сплошная заливка
 * `PinnedNewsCardStyle.textColor`, а её же оттенок с прозрачностью (10%).
 * Невалидный hex возвращается как есть (без alpha) — не бросает, чтобы
 * админский произвольный цвет никогда не ронял рендер карточки.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace('#', ''));
  if (!match) {
    return hex;
  }

  const [, r, g, b] = match;
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`;
}
