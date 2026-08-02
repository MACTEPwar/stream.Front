import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { NotificationService } from '@core/services/notification.service';
import { ErrorMessage } from '@shared/components/error-message/error-message';
import { AdminNewsService } from '../../services/admin-news.service';
import { PinnedGridEditor } from '../../../news/components/pinned-grid-editor/pinned-grid-editor';
import { NewsItem } from '../../../news/models/news.model';
import {
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROWS,
  PINNED_GRID_VIEWPORTS,
  PinnedGridLayout,
  PinnedGridViewport,
} from '../../../news/models/pinned-news-slot.model';
import { NewsItemAdapterService } from '../../../news/services/news-item-adapter.service';
import { PinnedGridService } from '../../../news/services/pinned-grid.service';

/** Сколько новостей грузить сразу (`AdminNewsService.getAll()` пагинирован, но справочник новостей для этого редактора небольшой — постраничный подбор был бы преждевременным усложнением). */
const NEWS_PAGE_SIZE = 100;

const DEFAULT_LAYOUT: PinnedGridLayout = { config: { columns: DEFAULT_GRID_COLUMNS, rows: DEFAULT_GRID_ROWS }, slots: [] };

/**
 * Страница админки «Закреплённые новости» (`stream.Front#118`, раскладка —
 * реальный API со `stream.Front#119`) — хостит `PinnedGridEditor`. Раскладки
 * грузит из `PinnedGridService.getLayout()` на каждый из трёх пресетов
 * вьюпорта (`PINNED_GRID_VIEWPORTS`, `GET /news/pinned-layout/:viewport`), а
 * САМ СПИСОК новостей для выбора (`news` input редактора) — из уже
 * реализованного справочника «Новости» (`AdminNewsService.getAll()`,
 * `GET /news`, тот же источник, что `AdminNewsPage`), не из мок-семёрки
 * `NewsService.getNews()` — по прямому запросу пользователя. Адаптация
 * реального `AdminNews` (`images[]`, `viewCount`, `likeCount`, ...) в
 * `NewsItem`, которую понимает `PinnedGridEditor`/`NewsCard` (полная
 * унификация моделей — отдельная будущая задача, см.
 * `AdminNewsService`/`NewsArchiveItem`), вынесена в общий
 * `NewsItemAdapterService.toNewsItem()` (`stream.Front#121`, тот же адаптер
 * использует и `NewsPage`): все картинки по `order`, резолвятся через
 * `ImageUrlService.resolve()` (`/uploads/*` валиден только относительно
 * backend origin, тот же приём, что `NewsArchiveItem`) — `imageUrl` первая
 * из них, `imageUrls` — все.
 *
 * `PinnedNewsSlot.newsId` ссылается на РЕАЛЬНЫЕ id справочника новостей —
 * старые моковые слоты (`'news-1'` и т.п.) больше ни на что не указывают,
 * `PinnedGridEditor` отбрасывает их сам при загрузке.
 *
 * `(save)` вызывает `PinnedGridService.updateLayout()` на каждый из трёх
 * пресетов (редактор эмитит их все разом, `Record<PinnedGridViewport,
 * PinnedGridLayout>`) и показывает toast; на ошибке любого из трёх запросов
 * — error-тост (`extractApiErrorMessage`), редактор НЕ откатывает и не
 * закрывает визуальное состояние (полная замена по кнопке, не toggle) —
 * пользователь может поправить раскладку и нажать «Сохранить» ещё раз. Сама
 * страница не знает деталей drag/resize/добавления/стиля/переключения
 * вьюпорта, только загрузка/сохранение, вся интерактивность — в самом
 * редакторе.
 */
@Component({
  selector: 'app-admin-news-pinned-page',
  imports: [ErrorMessage, PinnedGridEditor],
  templateUrl: './admin-news-pinned-page.html',
  styleUrl: './admin-news-pinned-page.scss',
})
export class AdminNewsPinnedPage {
  private readonly pinnedGridService = inject(PinnedGridService);
  private readonly adminNewsService = inject(AdminNewsService);
  private readonly newsItemAdapter = inject(NewsItemAdapterService);
  private readonly notificationService = inject(NotificationService);

  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly news = signal<NewsItem[]>([]);
  protected readonly layouts = signal<Record<PinnedGridViewport, PinnedGridLayout>>({
    small: DEFAULT_LAYOUT,
    middle: DEFAULT_LAYOUT,
    large: DEFAULT_LAYOUT,
  });

  constructor() {
    this.load();
  }

  protected onSave(layouts: Record<PinnedGridViewport, PinnedGridLayout>): void {
    forkJoin(
      PINNED_GRID_VIEWPORTS.map((viewport) => this.pinnedGridService.updateLayout(viewport, layouts[viewport])),
    ).subscribe({
      next: () => this.notificationService.show('Раскладка сохранена', 'success'),
      error: (error: HttpErrorResponse) =>
        this.notificationService.show(
          extractApiErrorMessage(error) ?? 'Не удалось сохранить раскладку',
          'error',
        ),
    });
  }

  private load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.adminNewsService.getAll(1, NEWS_PAGE_SIZE).subscribe({
      next: (response) => {
        this.news.set(response.items.map((item) => this.newsItemAdapter.toNewsItem(item)));
        forkJoin([
          this.pinnedGridService.getLayout('small'),
          this.pinnedGridService.getLayout('middle'),
          this.pinnedGridService.getLayout('large'),
        ]).subscribe({
          next: ([small, middle, large]) => {
            this.layouts.set({ small, middle, large });
            this.isLoading.set(false);
          },
          error: () => {
            this.hasError.set(true);
            this.isLoading.set(false);
          },
        });
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
