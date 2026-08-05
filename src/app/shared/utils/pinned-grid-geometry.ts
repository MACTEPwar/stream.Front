import { PinnedGridViewport } from '@features/news/models/pinned-news-slot.model';

import { BREAKPOINT_LARGE_PX, BREAKPOINT_MIDDLE_PX } from './breakpoints';

/**
 * Геометрия области под сетку закреплённых новостей на реальной странице
 * «Новости» (`news-page.scss`/`shell.scss`) — источник правды для холста
 * `PinnedGridEditor` (`stream.Front#118`, доработка «pinned-grid-rework»):
 * раньше редактор рисовал условные 16:9-пресеты, никак не связанные с
 * реальной доступной площадью, из-за чего то, что видел админ, и то, что
 * видел посетитель, расходилось (на `large` — более чем в 2 раза по
 * пропорции). Все числа ниже — РУЧНОЕ зеркало значений из SCSS (эти
 * значения не читаются оттуда напрямую, TS не видит SCSS-переменные) — при
 * правке любого паддинга/ширины архива/высоты шапки в `news-page.scss`/
 * `shell.scss` нужно поправить и здесь, иначе холст редактора снова
 * разойдётся с реальной страницей.
 */

/** `:host { padding }` в `news-page.scss` — своё значение на каждый пресет вьюпорта. */
export const NEWS_PAGE_PADDING_PX: Record<PinnedGridViewport, number> = {
  small: 20,
  middle: 32,
  large: 60,
};

/** `$archive-gap`/`$archive-width` (`news-page.scss`) — архив сбоку сетки ТОЛЬКО на `large`; на `middle`/`small` уходит под сетку и не отнимает ширину у грида. */
export const NEWS_PAGE_ARCHIVE_GAP_PX = 110;
export const NEWS_PAGE_ARCHIVE_WIDTH_PX = 660;

/** `.shell__header` (`shell.scss`) — `padding: 12px 48px` (24px по вертикали) + высота лого 40px = 64px. Влияет на высоту сетки только на `large` (единственный пресет с фиксированной, не content-based, высотой). */
export const SHELL_HEADER_HEIGHT_PX = 64;

export interface GridAreaSize {
  readonly width: number;
  /** `null` — высота НЕ фиксирована (`middle`/`small`, `news-page.scss`/`pinned-news-grid.scss` переходят на `height: auto`) — сетка растёт по контенту, как на реальной странице, вместо холста фиксированного размера. */
  readonly height: number | null;
}

/** Те же пороги, что `_breakpoints.scss`/`shared/utils/breakpoints.ts` — `small` (`< 768`), `middle` (`768..1279`), `large` (`>= 1280`). */
export function resolvePinnedGridViewport(screenWidthPx: number): PinnedGridViewport {
  if (screenWidthPx < BREAKPOINT_MIDDLE_PX) {
    return 'small';
  }
  if (screenWidthPx < BREAKPOINT_LARGE_PX) {
    return 'middle';
  }
  return 'large';
}

/**
 * Реальная площадь под сетку закреплённых новостей для экрана
 * `screenWidthPx`×`screenHeightPx` — формулы зеркалят `news-page.scss`:
 * - **`large`**: архив занимает `$archive-width` + `$archive-gap` СПРАВА от
 *   сетки, паддинг `:host` со всех четырёх сторон, сверху к паддингу ещё
 *   добавляется высота шапки `Shell`:
 *   `W = screenW − 2×padding − archiveWidth − archiveGap`,
 *   `H = screenH − shellHeaderHeight − 2×padding`.
 * - **`middle`/`small`**: архив уходит ПОД сетку (`flex-direction: column`),
 *   ширина — экран минус паддинги по бокам, высота — НЕ фиксирована
 *   (`height: auto` и на `.news-page`/`:host`, и на самой сетке,
 *   `pinned-news-grid.scss`) — страница скроллится целиком, возвращается
 *   `null` вместо числа.
 */
export function computePinnedGridAreaSize(screenWidthPx: number, screenHeightPx: number): GridAreaSize {
  const viewport = resolvePinnedGridViewport(screenWidthPx);
  const padding = NEWS_PAGE_PADDING_PX[viewport];

  if (viewport === 'large') {
    return {
      width: screenWidthPx - 2 * padding - NEWS_PAGE_ARCHIVE_WIDTH_PX - NEWS_PAGE_ARCHIVE_GAP_PX,
      height: screenHeightPx - SHELL_HEADER_HEIGHT_PX - 2 * padding,
    };
  }

  return {
    width: screenWidthPx - 2 * padding,
    height: null,
  };
}

export interface ScreenSizePreset {
  readonly key: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Реальные размеры окна браузера для предпросмотра в `PinnedGridEditor` —
 * НЕ пресеты сетки/раскладки самой по себе (это `PinnedGridViewport`,
 * выводится из `width` через {@link resolvePinnedGridViewport}), а размеры
 * экрана посетителя, из которых уже вычисляется и то, какая раскладка
 * сейчас редактируется, и площадь под сетку.
 */
export const SCREEN_SIZE_PRESETS: readonly ScreenSizePreset[] = [
  { key: 'phone', label: 'Телефон (375×812)', width: 375, height: 812 },
  { key: 'tablet-portrait', label: 'Планшет книжкой (810×1080)', width: 810, height: 1080 },
  { key: 'tablet-landscape', label: 'Планшет альбомом (1180×820)', width: 1180, height: 820 },
  { key: 'laptop', label: 'Ноутбук (1366×768)', width: 1366, height: 768 },
  { key: 'desktop', label: 'Десктоп (1920×1080)', width: 1920, height: 1080 },
];

/** Значение `key` для произвольного размера, введённого вручную — не входит в {@link SCREEN_SIZE_PRESETS}. */
export const CUSTOM_SCREEN_SIZE_KEY = 'custom';
