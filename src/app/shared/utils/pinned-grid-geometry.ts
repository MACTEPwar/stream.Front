import { PinnedGridViewport } from '@features/news/models/pinned-news-slot.model';

import {
  BREAKPOINT_LARGE_MIN_WIDTH_PX,
  BREAKPOINT_TABLET_MIN_HEIGHT_PX,
  BREAKPOINT_TABLET_MIN_WIDTH_PX,
} from './breakpoints';
import {
  NEWS_PAGE_ARCHIVE_BESIDE_MAX_SCREEN_WIDTH_PX,
  NEWS_PAGE_PADDING_PX,
  isNewsArchiveBesideForScreen,
  newsGridWidth,
  newsPageContentWidth,
} from './news-layout';

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

/** `.shell__header` (`shell.scss`) — `padding: 12px 48px` (24px по вертикали) + высота лого 40px = 64px. Влияет на высоту сетки только там, где она фиксирована, а не content-based. */
export const SHELL_HEADER_HEIGHT_PX = 64;

export interface GridAreaSize {
  readonly width: number;
  /** `null` — высота НЕ фиксирована: с лентой, ушедшей под витрину, страница переходит на document-level скролл и `news-page.scss`/`pinned-news-grid.scss` берут `height: auto` — сетка растёт по контенту, как на реальной странице, вместо холста фиксированного размера. */
  readonly height: number | null;
}

/**
 * Те же пороги, что `_breakpoints.scss`/`shared/utils/breakpoints.ts` —
 * учитывает ОРИЕНТАЦИЮ, а не только ширину (`pinned-grid-rework`, прямое
 * решение пользователя): по одной ширине планшет книжкой от планшета
 * альбомом не отличить (iPad Pro 12.9 книжкой — 1024px, шире обычного
 * планшета альбомом).
 *
 * `large` — альбомная ориентация от `BREAKPOINT_TABLET_MIN_WIDTH_PX`×
 * `BREAKPOINT_TABLET_MIN_HEIGHT_PX` (планшет альбомом, ноутбук, десктоп) ИЛИ
 * ширина от `BREAKPOINT_LARGE_MIN_WIDTH_PX` независимо от ориентации;
 * `small` — всё остальное (телефон, планшет книжкой).
 */
export function resolvePinnedGridViewport(
  screenWidthPx: number,
  screenHeightPx: number,
): PinnedGridViewport {
  const isLandscape = screenWidthPx >= screenHeightPx;
  const isLandscapeLarge =
    isLandscape &&
    screenWidthPx >= BREAKPOINT_TABLET_MIN_WIDTH_PX &&
    screenHeightPx >= BREAKPOINT_TABLET_MIN_HEIGHT_PX;

  if (isLandscapeLarge || screenWidthPx >= BREAKPOINT_LARGE_MIN_WIDTH_PX) {
    return 'large';
  }
  return 'small';
}

/**
 * Реальная площадь под сетку закреплённых новостей для экрана
 * `screenWidthPx`×`screenHeightPx` — формулы зеркалят `news-page.scss` через
 * общее правило раздела ширины (`news-layout.ts`, `stream.Front#126`).
 *
 * Ключевое: положение ленты определяется НЕ пресетом вьюпорта, а тем,
 * остаётся ли витрине место (`АДП-О-12`). До #126 холст считал, что на
 * `large` архив всегда сбоку, — и на 1024×768 рисовал витрине 134 точки, ту
 * же неверную геометрию, что показывала посетителю сама страница.
 *
 * - **лента сбоку**: витрина получает остаток после ленты и зазора, каждый
 *   из которых сжимается в своём порядке (`РАЗ-Ф-01`); высота фиксирована —
 *   экран минус шапка `Shell` и паддинги `:host` сверху и снизу;
 * - **лента внизу**: витрина получает всю доступную ширину (`РАЗ-Ф-02`), а
 *   страница переходит на document-level скролл, поэтому высота не
 *   фиксирована — `null` вместо числа.
 */
export function computePinnedGridAreaSize(
  screenWidthPx: number,
  screenHeightPx: number,
): GridAreaSize {
  const viewport = resolvePinnedGridViewport(screenWidthPx, screenHeightPx);
  const contentWidth = newsPageContentWidth(screenWidthPx, viewport);

  if (!isNewsArchiveBesideForScreen(screenWidthPx, contentWidth)) {
    return { width: contentWidth, height: null };
  }

  return {
    width: newsGridWidth(contentWidth),
    height: screenHeightPx - SHELL_HEADER_HEIGHT_PX - 2 * NEWS_PAGE_PADDING_PX[viewport],
  };
}

/** Два состояния холста на раскладку (`РАБ-Ф-07`, `РАБ-Ф-08`, `specs/02-admin/05-pinned/spec.md`) — просторное (эталон) и тесное (самый узкий случай, в котором раскладка ещё показывается посетителю). Третьего не предусмотрено — выбор устройства и произвольный размер убраны (`РАБ-Ф-01`, `РАБ-Ф-02`). */
export type PinnedGridCanvasDensity = 'reference' | 'tight';

export interface PinnedGridCanvasScreen {
  readonly width: number;
  readonly height: number;
}

/**
 * Экраны, между которыми витрина живёт у посетителя — источник для двух
 * состояний холста редактора (`РАБ-Ф-07`, `РАБ-Ф-08`), НЕ произвольный выбор
 * устройства (`РАБ-Ф-01`, `РАБ-Ф-02` — оба закрыты).
 *
 * `large.reference` — витрина при экране Full HD, тот же эталон, что и
 * `NEWS_PAGE_GRID_REFERENCE_WIDTH_PX` (`news-layout.ts`).
 * `large.tight` — на 1px уже потолка `NEWS_PAGE_ARCHIVE_BESIDE_MAX_SCREEN_WIDTH_PX`
 * (`news-layout.ts`): самый узкий экран, на котором лента у посетителя ЕЩЁ
 * стоит сбоку — «её достаточная ширина 500» из спеки. Высота держится
 * эталонной (Full HD) в обоих состояниях большой раскладки: сама по себе
 * она не решает, встаёт ли лента сбоку, — это делает только ширина
 * (`isNewsArchiveBesideForScreen`), поэтому менять её незачем.
 *
 * `small.reference` — типичная ширина телефона (`Принятые решения`,
 * `specs/02-admin/05-pinned/spec.md`: макета под компактную раскладку нет,
 * поэтому используется одно устоявшееся представительное значение, а не
 * произвольный ввод). `small.tight` — минимальная поддерживаемая ширина
 * проекта (та же величина, что и в `computePinnedGridAreaSize`-тестах).
 */
export const PINNED_GRID_CANVAS_SCREENS: Record<
  PinnedGridViewport,
  Record<PinnedGridCanvasDensity, PinnedGridCanvasScreen>
> = {
  large: {
    reference: { width: 1920, height: 1080 },
    tight: { width: NEWS_PAGE_ARCHIVE_BESIDE_MAX_SCREEN_WIDTH_PX + 1, height: 1080 },
  },
  small: {
    reference: { width: 375, height: 812 },
    tight: { width: 320, height: 568 },
  },
};
