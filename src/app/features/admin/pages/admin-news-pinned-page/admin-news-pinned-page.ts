import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { extractApiErrorMessage } from '@core/models/api-error.model';
import { ImageUrlService } from '@core/services/image-url.service';
import { NotificationService } from '@core/services/notification.service';
import { ErrorMessage } from '@shared/components/error-message/error-message';
import { AdminNews } from '../../models/news.model';
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
 * `NewsService.getNews()` — по прямому запросу пользователя. `toNewsItem()`
 * адаптирует реальный `AdminNews` (`images[]`, `viewCount`, `likeCount`, ...)
 * под мок-модель `NewsItem`, которую понимает `PinnedGridEditor`/`NewsCard`
 * (полная унификация моделей — отдельная будущая задача, см.
 * `AdminNewsService`/`NewsArchiveItem`): все картинки по `order`, резолвятся
 * через `ImageUrlService.resolve()` (`/uploads/*` валиден только
 * относительно backend origin, тот же приём, что `NewsArchiveItem`) —
 * `imageUrl` первая из них, `imageUrls` — все.
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
  private readonly imageUrlService = inject(ImageUrlService);
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
        this.news.set(response.items.map((item) => this.toNewsItem(item)));
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

  private toNewsItem(admin: AdminNews): NewsItem {
    const imageUrls = admin.images
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((image) => this.imageUrlService.resolve(image.url));
    return {
      id: admin.id,
      title: admin.title,
      excerpt: admin.description,
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
      tagIds: admin.tags.map((tag) => tag.id),
      views: admin.viewCount,
      likes: admin.likeCount,
      publishedAt: new Date(admin.publishedAt),
      viewedByCurrentUser: false,
      likedByCurrentUser: admin.likedByCurrentUser ?? false,
    };
  }
}
