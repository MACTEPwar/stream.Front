/**
 * Единые breakpoint-пороги приложения (`stream.Front#122`, ориентация —
 * `pinned-grid-rework`) — TS-зеркало `src/styles/_breakpoints.scss` для
 * `@angular/cdk/layout` `BreakpointObserver` (значения из SCSS-переменных
 * недоступны напрямую в TS, оба файла держатся синхронными вручную при
 * правке любого из них). Имена порогов совпадают с `PinnedGridViewport`
 * (`@features/news/models/pinned-news-slot.model`) — `small`/`large`.
 *
 * Правило учитывает ОРИЕНТАЦИЮ, а не только ширину — по ширине планшет
 * книжкой от планшета альбомом не отличить (см. `_breakpoints.scss`):
 * `large` = альбомная ориентация от `BREAKPOINT_TABLET_MIN_WIDTH_PX`×
 * `BREAKPOINT_TABLET_MIN_HEIGHT_PX` ИЛИ ширина от `BREAKPOINT_LARGE_MIN_WIDTH_PX`
 * независимо от ориентации; `small` — всё остальное.
 */
export const BREAKPOINT_TABLET_MIN_WIDTH_PX = 768;
export const BREAKPOINT_TABLET_MIN_HEIGHT_PX = 600;
export const BREAKPOINT_LARGE_MIN_WIDTH_PX = 1280;

/** Комма — OR (native `matchMedia`/CDK `BreakpointObserver` поддерживают список через запятую в одной строке запроса). */
export const LARGE_QUERY =
  `(orientation: landscape) and (min-width: ${BREAKPOINT_TABLET_MIN_WIDTH_PX}px) and (min-height: ${BREAKPOINT_TABLET_MIN_HEIGHT_PX}px), ` +
  `(min-width: ${BREAKPOINT_LARGE_MIN_WIDTH_PX}px)`;

export const SMALL_QUERY =
  `(max-width: ${BREAKPOINT_LARGE_MIN_WIDTH_PX - 1}px) and (orientation: portrait), ` +
  `(max-width: ${BREAKPOINT_TABLET_MIN_WIDTH_PX - 1}px), ` +
  `(max-width: ${BREAKPOINT_LARGE_MIN_WIDTH_PX - 1}px) and (max-height: ${BREAKPOINT_TABLET_MIN_HEIGHT_PX - 1}px)`;
