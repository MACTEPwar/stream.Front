/**
 * Реальный backend-контракт (`streamer.API#65`/`#67`, `stream.Front#115`) — НЕ мок,
 * в отличие от `features/news/models/*` (те обслуживают публичную страницу
 * «Новости», всё ещё на моках `NewsService`/`NewsTagService`). Умышленно не
 * унифицированы в этой задаче — `NewsItem.imageUrl: string | null` (одна
 * картинка) и `NewsTag.severity?: CheckboxSeverity` (фронтовое понятие) не
 * совпадают со здешними `images: AdminNewsImage[]`/`color: string`; перевод
 * публичной страницы на реальный API — отдельная будущая задача.
 */
/**
 * Один размерный вариант изображения (`streamer.API#78`, `ImageVariantDto`)
 * — сервер отдаёт готовый набор, клиент выбирает по `width`, не угадывая имя
 * файла по конвенции (`stream.Front#130`, `selectImageVariant()`).
 */
export interface ImageVariant {
  readonly width: number;
  readonly url: string;
}

export interface AdminNewsImage {
  id: string;
  url: string;
  order: number;
  /** Focal point картинки, 0..100 (%), `null` — центр 50/50 (`pinned-grid-rework`, поверх `streamer.API#73`). Правится через `AdminNewsService.updateImageFocalPoint()` (`PATCH /admin/news/images/:id/focal-point`), не через `update()` самой новости. */
  focalX: number | null;
  focalY: number | null;
  /** Размерные варианты ЭТОЙ картинки (`streamer.API#78`) — только реально существующие (вариант шире оригинала не создаётся). */
  variants: readonly ImageVariant[];
}

export interface UpdateImageFocalPointPayload {
  focalX: number | null;
  focalY: number | null;
}

export interface AdminNewsTag {
  id: string;
  name: string;
  color: string;
  textColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNews {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  likedByCurrentUser: boolean | null;
  viewedByCurrentUser: boolean | null;
  images: AdminNewsImage[];
  tags: AdminNewsTag[];
  /**
   * Обложка новости (`stream.Front#137`, поверх `streamer.API#80`) — заменила
   * булев `hasNoImage`. Флаг хранился, но ни на что не влиял; теперь состояние
   * обложки записано явно, и «осознанно без обложки» отличимо от «ещё не
   * выбрали» (`ОБЛ-Б-01`).
   */
  cover: NewsCover;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewsPayload {
  title: string;
  description: string;
  /** Уже загруженные через `POST /upload` пути (`/uploads/*`) или внешние `http(s)`-ссылки, в порядке добавления. */
  imageUrls: string[];
  /** ISO-строка, опционально — по умолчанию backend подставляет текущее время. */
  publishedAt?: string;
  tagIds: string[];
  /**
   * Состояние обложки (`stream.Front#137`, поверх `streamer.API#80`). Не
   * передано — сервер оставляет текущее. Интерфейс выбора из трёх состояний —
   * задача `stream.Front#132`; пока форма новости обложку не задаёт.
   */
  cover?: NewsCoverInput;
}

/**
 * Что принимает сервер при сохранении обложки: `url` нужен только для
 * `image`/`custom`. Для `custom` это либо уже загруженный `/uploads/*`, либо
 * внешняя ссылка — сервер скачает её к себе (`ОБЛ-Б-02`).
 */
export interface NewsCoverInput {
  type: NewsCoverType;
  url?: string | null;
}

/** Состояние обложки — зеркало `NewsCoverDto` бэкенда (`streamer.API#80`). */
export type NewsCoverType = 'none' | 'image' | 'custom';

/** Точка фокуса в процентах от размеров картинки; `null` — центр 50/50. */
export interface NewsCoverFocalPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Обложка в ответе сервера. `url` — `null` при `type: 'none'`: это осознанное
 * состояние «обложки нет», а не «ещё не выбрали», и подставлять вместо неё
 * первую картинку новости запрещено (`ОБЛ-О-05`, `ЗАК-О-06`).
 *
 * Живёт здесь, а не в моделях страницы «Новости»: обложка — часть контракта
 * новости, и её читают обе фичи (`features/news` уже импортирует `AdminNews`
 * отсюда).
 */
export interface NewsCover {
  readonly type: NewsCoverType;
  readonly url: string | null;
  readonly focalPoint: NewsCoverFocalPoint | null;
  /** Размерные варианты обложки (`streamer.API#78`), пусто при `url: null`. */
  readonly variants: readonly ImageVariant[];
}

export type UpdateNewsPayload = Partial<CreateNewsPayload>;

export interface AdminNewsListParams {
  search?: string;
  tagId?: string;
}

export interface CreateNewsTagPayload {
  name: string;
  color: string;
  textColor: string;
}

export type UpdateNewsTagPayload = Partial<CreateNewsTagPayload>;
