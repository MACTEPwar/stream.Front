/**
 * Единые breakpoint-пороги приложения (`stream.Front#122`) — TS-зеркало
 * `src/styles/_breakpoints.scss` для `@angular/cdk/layout` `BreakpointObserver`
 * (значения из SCSS-переменных недоступны напрямую в TS, оба файла держатся
 * синхронными вручную при правке любого из них). Имена порогов совпадают с
 * `PinnedGridViewport` (`@features/news/models/pinned-news-slot.model`) —
 * `small`/`middle`/`large`.
 */
export const BREAKPOINT_MIDDLE_PX = 768;
export const BREAKPOINT_LARGE_PX = 1280;

export const SMALL_QUERY = `(max-width: ${BREAKPOINT_MIDDLE_PX - 1}px)`;
export const MIDDLE_QUERY = `(min-width: ${BREAKPOINT_MIDDLE_PX}px) and (max-width: ${BREAKPOINT_LARGE_PX - 1}px)`;
export const LARGE_QUERY = `(min-width: ${BREAKPOINT_LARGE_PX}px)`;
