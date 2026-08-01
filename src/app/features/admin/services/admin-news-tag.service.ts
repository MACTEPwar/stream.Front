import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import { AdminNewsTag, CreateNewsTagPayload, UpdateNewsTagPayload } from '../models/news.model';

/**
 * Справочник тегов новостей в админ-панели (`stream.Front#115`, поверх
 * `streamer.API#65`) — `getAll()` (`GET /news-tags`, публичный, без guard —
 * переиспользуется и формой создания новости для мультиселекта тегов),
 * `create()`/`update()`/`remove()` (`/admin/news-tags`, `ADMIN`-only на
 * backend). Единственные потребители — `AdminNewsPage`/`AdminNewsTagsPage`.
 */
@Injectable({ providedIn: 'root' })
export class AdminNewsTagService {
  private readonly api = inject(ApiService);

  getAll(): Observable<AdminNewsTag[]> {
    return this.api.get<AdminNewsTag[]>('/news-tags');
  }

  create(payload: CreateNewsTagPayload): Observable<AdminNewsTag> {
    return this.api.post<AdminNewsTag>('/admin/news-tags', payload);
  }

  update(id: string, payload: UpdateNewsTagPayload): Observable<AdminNewsTag> {
    return this.api.patch<AdminNewsTag>(`/admin/news-tags/${id}`, payload);
  }

  remove(id: string): Observable<AdminNewsTag> {
    return this.api.delete<AdminNewsTag>(`/admin/news-tags/${id}`);
  }
}
