/**
 * Реальный backend-контракт (`streamer.API#65`/`#67`, `stream.Front#115`) — НЕ мок,
 * в отличие от `features/news/models/*` (те обслуживают публичную страницу
 * «Новости», всё ещё на моках `NewsService`/`NewsTagService`). Умышленно не
 * унифицированы в этой задаче — `NewsItem.imageUrl: string | null` (одна
 * картинка) и `NewsTag.severity?: CheckboxSeverity` (фронтовое понятие) не
 * совпадают со здешними `images: AdminNewsImage[]`/`color: string`; перевод
 * публичной страницы на реальный API — отдельная будущая задача.
 */
export interface AdminNewsImage {
  id: string;
  url: string;
  order: number;
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
