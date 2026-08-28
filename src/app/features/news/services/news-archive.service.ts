import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import { AdminNews } from '@features/admin/models/news.model';
import { PaginatedResponse } from '@features/admin/services/admin-users.service';

export interface LikeResponse {
  likeCount: number;
  likedByCurrentUser: boolean;
}

export interface ViewResponse {
  viewCount: number;
  viewedByCurrentUser: true;
}

/**
 * Условия отбора ленты — 1:1 с query-параметрами `GET /news`
 * (`streamer.API#77`). Все опциональны и комбинируются `AND`.
 *
 * **Отсутствие поля ≠ `false`.** У признаков взаимодействия `false` означает
 * «только НЕ просмотренные»/«без моего лайка», поэтому снятый тумблер обязан
 * поле не отправлять, а не отправлять `false`. Глобальный `ValidationPipe`
 * бэкенда работает с `forbidNonWhitelisted`, так что лишний параметр даст
 * `400`, а не будет молча проигнорирован.
 *
 * Признаки взаимодействия требуют сессии — без неё бэкенд отвечает `401`
 * (см. `NewsPage.onOwnReactionFilterChange()`).
 */
export interface NewsArchiveQuery {
  /** Нижняя граница периода публикации, ISO. Включается в результат. */
  publishedFrom?: string;
  /** Верхняя граница периода публикации, ISO. Тоже включается. */
  publishedTo?: string;
  /** Несколько тем сразу — новость подходит, если относится к любой из них. */
  tagIds?: readonly string[];
  likedByCurrentUser?: boolean;
  viewedByCurrentUser?: boolean;
}

/**
 * Реальный источник панели архива публичной страницы «Новости»
 * (`stream.Front#118`, поверх `streamer.API#65`/`#67`) — `GET /news`
 * (публичный, сортировка по умолчанию на бэке — `publishedAt desc`, "новые
 * сначала" не требует клиентской сортировки) и `POST`/`DELETE /news/:id/like`
 * (требуют авторизации). Переиспользует `AdminNews`/`PaginatedResponse<T>` из
 * админ-фичи — тот же самый backend-контракт (`GET /news` публичный, просто
 * уже был типизирован там для `AdminNewsPage`), заводить дубликат типов ради
 * "не админского" происхождения не нужно.
 *
 * Закреплённая сетка слева (`PinnedNewsGrid`) по-прежнему на моках
 * (`NewsService`) — эта задача переводит на реальный API только архив справа.
 */
@Injectable({ providedIn: 'root' })
export class NewsArchiveService {
  private readonly api = inject(ApiService);

  /**
   * `query` уходит вместе с запросом порции, а не применяется к уже
   * загруженному списку (`stream.Front#129`, поверх `streamer.API#77`): сервер
   * отбирает по всему архиву и считает по отобранному `meta.total`, поэтому
   * признак «больше грузить нечего» достоверен.
   */
  getPage(
    page: number,
    limit: number,
    query: NewsArchiveQuery = {},
  ): Observable<PaginatedResponse<AdminNews>> {
    return this.api.get<PaginatedResponse<AdminNews>>('/news', {
      page,
      limit,
      ...query,
    });
  }

  like(id: string): Observable<LikeResponse> {
    return this.api.post<LikeResponse>(`/news/${id}/like`);
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.api.delete<LikeResponse>(`/news/${id}/like`);
  }

  /** Идемпотентная, НЕ переключаемая отметка просмотра — первый вызов инкрементит `viewCount` и создаёт запись, повторные просто возвращают текущее состояние без повторного инкремента; unview не существует. */
  markViewed(id: string): Observable<ViewResponse> {
    return this.api.post<ViewResponse>(`/news/${id}/view`);
  }
}
