/**
 * YIQ-приближение воспринимаемой яркости (без гамма-коррекции — для выбора
 * направления подложки под текст в режиме подложки `NewsCard` этого
 * достаточно, не для проверки WCAG-контраста, `stream.Front#127`). Порог
 * 128 — середина диапазона 0..255, тот же практический эвристический порог,
 * что широко используется для выбора чёрного/белого текста на произвольном
 * фоне. Невалидный hex считается тёмным (`false`) — тот же safe-fallback,
 * что у `hexToRgba()`.
 */
export function isLightColor(hex: string): boolean {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace('#', ''));
  if (!match) {
    return false;
  }

  const [, r, g, b] = match;
  const yiq = (parseInt(r, 16) * 299 + parseInt(g, 16) * 587 + parseInt(b, 16) * 114) / 1000;
  return yiq >= 128;
}
