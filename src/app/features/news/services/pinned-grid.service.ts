import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';

import { PinnedGridLayout, PinnedGridViewport } from '../models/pinned-news-slot.model';

/**
 * Реальный источник раскладки закреплённой сетки новостей (`stream.Front#119`,
 * поверх `streamer.API#71`) — `GET /news/pinned-layout/:viewport` (публичный,
 * читает `NewsPage`) и `PUT /admin/news/pinned-layout/:viewport` (админ, JWT,
 * пишет `PinnedGridEditor`/`AdminNewsPinnedPage`). Заменяет мок-раскладку,
 * которая раньше жила в `NewsService` (`getLayout()`/`updateLayout()`).
 */
@Injectable({ providedIn: 'root' })
export class PinnedGridService {
  private readonly api = inject(ApiService);

  getLayout(viewport: PinnedGridViewport): Observable<PinnedGridLayout> {
    return this.api.get<PinnedGridLayout>(`/news/pinned-layout/${viewport}`);
  }

  updateLayout(viewport: PinnedGridViewport, layout: PinnedGridLayout): Observable<PinnedGridLayout> {
    return this.api.put<PinnedGridLayout>(`/admin/news/pinned-layout/${viewport}`, layout);
  }
}
