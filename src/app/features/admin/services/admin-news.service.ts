import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import { AdminNews, AdminNewsListParams, CreateNewsPayload, UpdateNewsPayload } from '../models/news.model';
import { PaginatedResponse } from './admin-users.service';

/**
 * Новости в админ-панели (`stream.Front#115`, поверх `streamer.API#65`/`#67`)
 * — `getAll()` (`GET /news`, публичный, но с пагинацией/фильтрами —
 * переиспользуется списком `AdminNewsPage`; `search`/`tagId` опциональны),
 * `create()` (`POST /admin/news`), `update(id, dto)` (`PATCH /admin/news/:id`,
 * `dto` — частичный `CreateNewsPayload`), `remove(id)` (`DELETE /admin/news/:id`)
 * — все три `ADMIN`-only на backend. `PaginatedResponse<T>` переиспользован из
 * `admin-users.service.ts` (тот же конверт `{ items, meta }`, дублировать
 * ради одного поля не нужно). Единственный потребитель — `AdminNewsPage`.
 */
@Injectable({ providedIn: 'root' })
export class AdminNewsService {
  private readonly api = inject(ApiService);

  getAll(page: number, limit: number, filter?: AdminNewsListParams): Observable<PaginatedResponse<AdminNews>> {
    return this.api.get<PaginatedResponse<AdminNews>>('/news', {
      page,
      limit,
      ...(filter?.search && { search: filter.search }),
      ...(filter?.tagId && { tagId: filter.tagId }),
    });
  }

  create(payload: CreateNewsPayload): Observable<AdminNews> {
    return this.api.post<AdminNews>('/admin/news', payload);
  }

  update(id: string, payload: UpdateNewsPayload): Observable<AdminNews> {
    return this.api.patch<AdminNews>(`/admin/news/${id}`, payload);
  }

  remove(id: string): Observable<AdminNews> {
    return this.api.delete<AdminNews>(`/admin/news/${id}`);
  }
}
