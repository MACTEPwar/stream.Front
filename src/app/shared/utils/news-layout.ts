import { PinnedGridViewport } from '@features/news/models/pinned-news-slot.model';

import { CONTENT_MAX_WIDTH_PX } from './breakpoints';

/**
 * Как витрина и лента делят ширину страницы «Новости» (`stream.Front#126`,
 * спека НОВ, блок `РАЗ`) — TS-зеркало `src/styles/_news-layout.scss`, оба
 * файла держатся синхронными вручную при правке любого из них (`АДП-Ф-04`;
 * значения SCSS-переменных из TS не читаются).
 *
 * Величины ниже описывают СОДЕРЖИМОЕ блоков, а не форму окна, и потому
 * порогами компоновки не являются (`АДП-О-13`) — поэтому живут здесь, а не
 * рядом с брейкпоинтами в `breakpoints.ts`.
 *
 * Правило целиком: положение ленты определяется не классом компоновки, а
 * тем, остаётся ли витрине место (`АДП-О-12`, `РАЗ-О-02`). Раньше страница
 * решала это по пресету — стоило окну пройти в `large`, лента вставала сбоку
 * и забирала эталонные 660 независимо от остатка: на 1024×768 витрине
 * доставалось 134 точки.
 */

/** Эталон ширины ленты (макет Full HD). */
export const NEWS_PAGE_ARCHIVE_WIDTH_PX = 660;
/** Минимум ленты: превью строки 175 + минимум её текстовой части 250, с запасом на полосу прокрутки. */
export const NEWS_PAGE_ARCHIVE_MIN_WIDTH_PX = 440;
/** Эталон зазора между витриной и лентой (макет Full HD). */
export const NEWS_PAGE_ARCHIVE_GAP_PX = 110;
/** Минимум зазора — обычный зазор между блоками страницы. */
export const NEWS_PAGE_ARCHIVE_GAP_MIN_PX = 20;
/**
 * Ширина витрины, достаточная для того, чтобы лента имела право стоять
 * сбоку. Не абсолютный минимум витрины: когда лента уходит вниз, витрина
 * занимает всю ширину и на узком телефоне оказывается заметно уже — рядом с
 * ней уже ничего не стоит.
 */
export const NEWS_PAGE_GRID_SUFFICIENT_WIDTH_PX = 500;

/** `:host { padding }` в `news-page.scss` — своё значение на каждый пресет вьюпорта. */
export const NEWS_PAGE_PADDING_PX: Record<PinnedGridViewport, number> = {
  small: 20,
  large: 60,
};

/**
 * Ширина витрины при эталонном экране — не отдельное решение, а то, что
 * остаётся после отступов, ленты и зазора. Вычисляется, чтобы правка любого
 * из слагаемых не оставила здесь устаревшее число.
 */
export const NEWS_PAGE_GRID_REFERENCE_WIDTH_PX =
  CONTENT_MAX_WIDTH_PX -
  2 * NEWS_PAGE_PADDING_PX.large -
  NEWS_PAGE_ARCHIVE_WIDTH_PX -
  NEWS_PAGE_ARCHIVE_GAP_PX;

/**
 * Доступная ширина, начиная с которой лента встаёт сбоку. Отдельным числом
 * НЕ задаётся (`РАЗ-Ф-03`): вытекает из минимумов ленты, зазора и витрины —
 * иначе разошлась бы с ними при первой же их правке.
 */
export const NEWS_PAGE_SIDE_BY_SIDE_MIN_CONTENT_WIDTH_PX =
  NEWS_PAGE_ARCHIVE_MIN_WIDTH_PX +
  NEWS_PAGE_ARCHIVE_GAP_MIN_PX +
  NEWS_PAGE_GRID_SUFFICIENT_WIDTH_PX;

function clamp(min: number, value: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Доступная ширина внутри паддингов страницы — то, что делят между собой
 * витрина, зазор и лента. От порога центрирования расти перестаёт
 * (`.news-page { max-width }`, `АДП-О-06`).
 */
export function newsPageContentWidth(screenWidthPx: number, viewport: PinnedGridViewport): number {
  return Math.min(screenWidthPx - 2 * NEWS_PAGE_PADDING_PX[viewport], CONTENT_MAX_WIDTH_PX);
}

/** Хватает ли места обоим блокам, чтобы лента стояла сбоку (`РАЗ-О-02`). Граница включительна. */
export function isNewsArchiveBeside(contentWidthPx: number): boolean {
  return contentWidthPx >= NEWS_PAGE_SIDE_BY_SIDE_MIN_CONTENT_WIDTH_PX;
}

/**
 * Лента отдаёт ширину ПЕРВОЙ (`РАЗ-Ф-01`): пока витрина держит эталон, весь
 * дефицит вычитается отсюда — от 660 вниз до 440.
 */
export function newsArchiveWidth(contentWidthPx: number): number {
  return clamp(
    NEWS_PAGE_ARCHIVE_MIN_WIDTH_PX,
    contentWidthPx - NEWS_PAGE_ARCHIVE_GAP_PX - NEWS_PAGE_GRID_REFERENCE_WIDTH_PX,
    NEWS_PAGE_ARCHIVE_WIDTH_PX,
  );
}

/**
 * Зазор сжимается ПОСЛЕДНИМ из трёх (`РАЗ-Ф-04`) — его формула начинает
 * работать только там, где и лента, и витрина уже дошли до нижних значений.
 */
export function newsArchiveGap(contentWidthPx: number): number {
  return clamp(
    NEWS_PAGE_ARCHIVE_GAP_MIN_PX,
    contentWidthPx - NEWS_PAGE_ARCHIVE_MIN_WIDTH_PX - NEWS_PAGE_GRID_SUFFICIENT_WIDTH_PX,
    NEWS_PAGE_ARCHIVE_GAP_PX,
  );
}

/**
 * Витрина — главное содержимое страницы и получает ОСТАТОК (`РАЗ-О-01`), а
 * с лентой, ушедшей вниз, — всю ширину целиком (`РАЗ-Ф-02`). Порядок уступок
 * получается сам, без ветвлений: остаток по определению отдаёт своё после
 * ленты.
 */
export function newsGridWidth(contentWidthPx: number): number {
  if (!isNewsArchiveBeside(contentWidthPx)) {
    return contentWidthPx;
  }

  return contentWidthPx - newsArchiveWidth(contentWidthPx) - newsArchiveGap(contentWidthPx);
}
