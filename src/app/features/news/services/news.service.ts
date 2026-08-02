import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { NewsItem } from '../models/news.model';
import {
  DEFAULT_CARD_STYLE,
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROWS,
  PinnedGridConfig,
  PinnedGridLayout,
  PinnedGridViewport,
  PinnedNewsSlot,
} from '../models/pinned-news-slot.model';

/** Тексты — Lorem ipsum ровно из макета (`docs/figma/news1.json`, `heading`/`text`). */
const LONG_TITLE = 'Lorem ipsum dolor sit amet consectetur.';
const SHORT_TITLE = 'Заголовок';
const LONG_EXCERPT =
  'Lorem ipsum dolor sit amet consectetur. Id nunc feugiat ac imperdiet sed eget. Id vitae erat aenean mattis non ultrices tincidunt ultricies. Varius diam eget a massa feugiat. Leo nunc feugiat sed non at a imperdiet. Nunc nulla morbi ac nunc imperdiet.';
const MEDIUM_EXCERPT = 'Lorem ipsum dolor sit amet consectetur. Id nunc feugiat ac imperdiet sed eget.';
const SHORT_EXCERPT = 'Lorem ipsum dolor sit amet consectetur. Enim ultricies varius iaculis.';

/**
 * Тестовые картинки, уже лежащие в `public/images/` (те же, что использует
 * `MainCarousel`, stream.Front#28) — отдельных бинарников под новости не
 * заводилось; часть записей намеренно с `imageUrl: null`, чтобы был виден и
 * плейсхолдер-прямоугольник макета.
 */
const TEST_IMAGE_0 = '/images/main-carousel/slide-0-test.png';
const TEST_IMAGE_1 = '/images/main-carousel/slide-1-test.png';

const MOCK_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: LONG_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: TEST_IMAGE_0,
    imageUrls: [TEST_IMAGE_0],
    tagIds: ['tournament', 'mlbb'],
    views: 980,
    likes: 1400,
    publishedAt: new Date(2023, 11, 6),
    viewedByCurrentUser: true,
    likedByCurrentUser: false,
  },
  {
    id: 'news-2',
    title: SHORT_TITLE,
    excerpt: MEDIUM_EXCERPT,
    imageUrl: TEST_IMAGE_1,
    imageUrls: [TEST_IMAGE_1],
    tagIds: ['announcement'],
    views: 743,
    likes: 210,
    publishedAt: new Date(2023, 11, 4),
    viewedByCurrentUser: false,
    likedByCurrentUser: false,
  },
  {
    id: 'news-3',
    title: SHORT_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: null,
    imageUrls: [],
    tagIds: ['stream', 'pc-games'],
    views: 2400,
    likes: 890,
    publishedAt: new Date(2023, 10, 28),
    viewedByCurrentUser: true,
    likedByCurrentUser: true,
  },
  {
    id: 'news-4',
    title: LONG_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: TEST_IMAGE_1,
    imageUrls: [TEST_IMAGE_1],
    tagIds: ['rsikk'],
    views: 312,
    likes: 96,
    publishedAt: new Date(2023, 10, 21),
    viewedByCurrentUser: false,
    likedByCurrentUser: true,
  },
  {
    id: 'news-5',
    title: SHORT_TITLE,
    excerpt: SHORT_EXCERPT,
    imageUrl: null,
    imageUrls: [],
    tagIds: ['esports', 'mobile-games'],
    views: 1120,
    likes: 1500,
    publishedAt: new Date(2023, 10, 15),
    viewedByCurrentUser: true,
    likedByCurrentUser: false,
  },
  {
    id: 'news-6',
    title: SHORT_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: TEST_IMAGE_0,
    imageUrls: [TEST_IMAGE_0],
    tagIds: ['tournament', 'esports'],
    views: 640,
    likes: 175,
    publishedAt: new Date(2023, 10, 9),
    viewedByCurrentUser: false,
    likedByCurrentUser: false,
  },
  {
    id: 'news-7',
    title: LONG_TITLE,
    excerpt: LONG_EXCERPT,
    imageUrl: TEST_IMAGE_1,
    imageUrls: [TEST_IMAGE_1],
    tagIds: ['mlbb'],
    views: 5300,
    likes: 2100,
    publishedAt: new Date(2023, 10, 2),
    viewedByCurrentUser: true,
    likedByCurrentUser: true,
  },
];

const MOCK_ARCHIVE: NewsItem[] = [
  ...MOCK_NEWS.slice(1).map(
    (item, index): NewsItem => ({
      ...item,
      id: `archive-${index + 1}`,
      excerpt: SHORT_EXCERPT,
    }),
  ),
  {
    id: 'archive-7',
    title: LONG_TITLE,
    excerpt: SHORT_EXCERPT,
    imageUrl: null,
    imageUrls: [],
    tagIds: ['announcement'],
    views: 205,
    likes: 44,
    publishedAt: new Date(2023, 9, 27),
    viewedByCurrentUser: false,
    likedByCurrentUser: true,
  },
  {
    id: 'archive-8',
    title: SHORT_TITLE,
    excerpt: SHORT_EXCERPT,
    imageUrl: TEST_IMAGE_0,
    imageUrls: [TEST_IMAGE_0],
    tagIds: ['stream'],
    views: 88,
    likes: 12,
    publishedAt: new Date(2023, 9, 18),
    viewedByCurrentUser: true,
    likedByCurrentUser: false,
  },
];

/**
 * Раскладка закреплённых новостей сетки 3×12 (`PinnedNewsSlot`,
 * `stream.Front#112`) — уже "предзаполнена", как будто админ (через ещё не
 * существующую админку) расставил её сам. По одному слоту на каждую запись
 * `MOCK_NEWS`, покрывает сетку без пропусков и пересечений (проверено
 * `pinned-news-slot.model.spec.ts`): крупная `news-1` — вся левая колонка
 * сверху, `news-2`/`news-3` — компактные справа сверху, широкая `news-4`
 * (`colSpan: 2`) — по центру, `news-5` — вторая крупная слева снизу,
 * `news-6`/`news-7` — компактные справа снизу.
 */
const MOCK_PINNED_SLOTS: PinnedNewsSlot[] = [
  { newsId: 'news-1', colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 7, style: DEFAULT_CARD_STYLE, coverImageUrl: null },
  { newsId: 'news-2', colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 4, style: DEFAULT_CARD_STYLE, coverImageUrl: null },
  { newsId: 'news-3', colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 4, style: DEFAULT_CARD_STYLE, coverImageUrl: null },
  { newsId: 'news-4', colStart: 2, rowStart: 5, colSpan: 2, rowSpan: 4, style: DEFAULT_CARD_STYLE, coverImageUrl: null },
  { newsId: 'news-5', colStart: 1, rowStart: 8, colSpan: 1, rowSpan: 5, style: DEFAULT_CARD_STYLE, coverImageUrl: null },
  { newsId: 'news-6', colStart: 2, rowStart: 9, colSpan: 1, rowSpan: 4, style: DEFAULT_CARD_STYLE, coverImageUrl: null },
  { newsId: 'news-7', colStart: 3, rowStart: 9, colSpan: 1, rowSpan: 4, style: DEFAULT_CARD_STYLE, coverImageUrl: null },
];

const DEFAULT_LAYOUT: PinnedGridLayout = {
  config: { columns: DEFAULT_GRID_COLUMNS, rows: DEFAULT_GRID_ROWS },
  slots: MOCK_PINNED_SLOTS,
};

/**
 * Мок-источник новостей страницы «Новости» — тот же паттерн, что у
 * `NewsTagService` (реального backend-эндпоинта под новости ещё нет).
 * `getNews()` — новости, из которых собирается закреплённая сетка слева,
 * `getArchive()` — строки панели архива справа (в макете это два
 * независимых блока: `news` и `news_archive`).
 *
 * **Раскладка — мутируемое состояние, не константа, и своя на каждый пресет
 * вьюпорта** (`layouts`, `stream.Front#118`, доработка: "колонки/строки и
 * карточки — свои у каждого вьюпорта", тот же принцип, что реальный
 * responsive-дизайн): `signal<Record<PinnedGridViewport, PinnedGridLayout>>`,
 * все три пресета изначально засеяны одной и той же `MOCK_PINNED_SLOTS`
 * (проходит `validatePinnedNewsSlots()` без ошибок, `pinned-news-slot.model.spec.ts`) —
 * `PinnedGridEditor` их дальше разводит независимо. `getLayout()`/
 * `updateLayout()` — на конкретный `PinnedGridViewport`. Backend-эндпоинта
 * для сохранения ещё нет — `providedIn: 'root'` делает сервис синглтоном на
 * всё приложение, поэтому правки в `PinnedGridEditor` админки сразу видны на
 * публичной странице «Новости» в рамках той же сессии (без перезагрузки),
 * имитируя будущее сохранение на backend.
 *
 * **Публичная страница «Новости» пока не выбирает пресет по реальному
 * устройству посетителя** (отдельная будущая задача) — `getPinnedSlots()`/
 * `getGridConfig()` остаются для обратной совместимости с `NewsPage` и
 * отдают раскладку пресета `'large'` (десктоп) как единственную, что видит
 * посетитель сейчас.
 */
@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly layouts = signal<Record<PinnedGridViewport, PinnedGridLayout>>({
    small: DEFAULT_LAYOUT,
    middle: DEFAULT_LAYOUT,
    large: DEFAULT_LAYOUT,
  });

  getNews(): Observable<NewsItem[]> {
    return of(MOCK_NEWS);
  }

  getArchive(): Observable<NewsItem[]> {
    return of(MOCK_ARCHIVE);
  }

  getLayout(viewport: PinnedGridViewport): Observable<PinnedGridLayout> {
    return of(this.layouts()[viewport]);
  }

  updateLayout(viewport: PinnedGridViewport, layout: PinnedGridLayout): Observable<PinnedGridLayout> {
    this.layouts.update((layouts) => ({ ...layouts, [viewport]: layout }));
    return of(layout);
  }

  getPinnedSlots(): Observable<PinnedNewsSlot[]> {
    return of(this.layouts().large.slots);
  }

  getGridConfig(): Observable<PinnedGridConfig> {
    return of(this.layouts().large.config);
  }
}
