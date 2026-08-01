import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import { AdminNews } from '@features/admin/models/news.model';
import { PaginatedResponse } from '@features/admin/services/admin-users.service';

export interface LikeResponse {
  likeCount: number;
  likedByCurrentUser: boolean;
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

  getPage(page: number, limit: number): Observable<PaginatedResponse<AdminNews>> {
    return this.api.get<PaginatedResponse<AdminNews>>('/news', { page, limit });
  }

  like(id: string): Observable<LikeResponse> {
    return this.api.post<LikeResponse>(`/news/${id}/like`);
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.api.delete<LikeResponse>(`/news/${id}/like`);
  }
}
