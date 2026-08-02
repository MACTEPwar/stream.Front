/**
 * Одна новость в сетке/архиве страницы «Новости» (`docs/figma/news1.json`).
 * Источник — мок (`NewsService`), реального backend-эндпоинта под новости ещё
 * нет; поля — ровно те, что рисует вёрстка карточки/строки архива.
 */
export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  /** `null` — картинки нет, рисуется серый плейсхолдер (`picture`-прямоугольник макета, `rgb(217, 217, 217)`). */
  imageUrl: string | null;
  /** Все картинки новости, в порядке (`stream.Front#118`) — источник выбора обложки для конкретного пина в `PinnedGridEditor` (`coverImageUrl`); отдельно от `imageUrl`, т.к. у новости может быть несколько картинок, а `imageUrl` — только "своя" (первая по порядку). */
  imageUrls: string[];
  tagIds: string[];
  views: number;
  likes: number;
  publishedAt: Date;
  /** Личный флаг «текущий пользователь уже просматривал эту новость» — не общий счётчик `views`. Пока мок, реального auth-флага с backend ещё нет. */
  viewedByCurrentUser: boolean;
  /** Личный флаг «текущий пользователь лайкнул эту новость» — не общий счётчик `likes`. Пока мок, реального auth-флага с backend ещё нет. */
  likedByCurrentUser: boolean;
}
