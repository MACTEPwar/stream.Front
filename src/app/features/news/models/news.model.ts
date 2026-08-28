import { NewsCover } from '@features/admin/models/news.model';

/**
 * Одна новость в сетке/архиве страницы «Новости» (`docs/figma/news1.json`).
 * Источник — мок (`NewsService`), реального backend-эндпоинта под новости ещё
 * нет; поля — ровно те, что рисует вёрстка карточки/строки архива.
 */
/** Одна картинка новости — источник галереи обложки в `PinnedGridEditor` (`coverImageUrl`) и `FocalPointPicker` (`pinned-grid-rework`, нужен `id` для `AdminNewsService.updateImageFocalPoint()`). */
export interface NewsItemImage {
  id: string;
  url: string;
  focalX: number | null;
  focalY: number | null;
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  /**
   * Обложка новости (`stream.Front#137`) — та картинка, что представляет
   * новость везде, где показывается одна: в витрине и в ленте. Не первая
   * картинка набора: «осознанно без обложки» — записанное состояние, и
   * подменять его первым изображением нельзя (`ОБЛ-О-05`).
   */
  cover: NewsCover;
  /** `null` — обложки нет, рисуется серый плейсхолдер (`picture`-прямоугольник макета, `rgb(217, 217, 217)`). Совпадает с `cover.url`. */
  imageUrl: string | null;
  /** Все картинки новости, в порядке (`stream.Front#118`) — источник выбора обложки для конкретного пина в `PinnedGridEditor` (`coverImageUrl`); отдельно от `imageUrl`, т.к. у новости может быть несколько картинок, а `imageUrl` — только "своя" (первая по порядку). */
  imageUrls: string[];
  /** То же самое, что `imageUrls`, но с `id`/focal point каждой картинки (`pinned-grid-rework`) — источник `FocalPointPicker` в `PinnedGridEditor`. */
  images: NewsItemImage[];
  tagIds: string[];
  views: number;
  likes: number;
  publishedAt: Date;
  /** Личный флаг «текущий пользователь уже просматривал эту новость» — не общий счётчик `views`. Пока мок, реального auth-флага с backend ещё нет. */
  viewedByCurrentUser: boolean;
  /** Личный флаг «текущий пользователь лайкнул эту новость» — не общий счётчик `likes`. Пока мок, реального auth-флага с backend ещё нет. */
  likedByCurrentUser: boolean;
}
