import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';

import {
  PinnedGridLayout,
  PinnedGridLayoutUpdate,
  PinnedGridViewport,
  toPinnedNewsPlacement,
} from '../models/pinned-news-slot.model';

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

  /**
   * Прочитанный слот отправлять обратно целиком нельзя (`stream.Front#137`):
   * ответ `GET` богаче того, что принимает `PUT`, а сервер работает с
   * `forbidNonWhitelisted` — лишнее поле даёт `400`, а не игнорируется.
   * Именно так и сломалось сохранение раскладки после `streamer.API#80`:
   * фронт продолжал слать `coverImageUrl`/`focalPoint`, снятые с контракта.
   *
   * Преобразование живёт здесь, а не у вызывающего: это свойство транспорта,
   * и любой новый потребитель получает его даром.
   */
  updateLayout(
    viewport: PinnedGridViewport,
    layout: PinnedGridLayout,
  ): Observable<PinnedGridLayout> {
    const payload: PinnedGridLayoutUpdate = {
      config: layout.config,
      slots: layout.slots.map(toPinnedNewsPlacement),
    };

    return this.api.put<PinnedGridLayout>(`/admin/news/pinned-layout/${viewport}`, payload);
  }
}
