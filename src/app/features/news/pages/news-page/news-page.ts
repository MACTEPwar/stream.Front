import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { NotificationService } from '@core/services/notification.service';
import { AdminNews } from '@features/admin/models/news.model';
import { Button } from '@shared/components/button/button';
import { ButtonGroup } from '@shared/components/button-group/button-group';
import { Checkbox } from '@shared/components/checkbox/checkbox';

import { NewsArchiveItem } from '../../components/news-archive-item/news-archive-item';
import { NewsFilterSidebar } from '../../components/news-filter-sidebar/news-filter-sidebar';
import { PinnedNewsGrid, PinnedNewsGridEntry } from '../../components/pinned-news-grid/pinned-news-grid';
import { NewsFilter } from '../../models/news-filter.model';
import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS, PinnedGridConfig, PinnedNewsSlot } from '../../models/pinned-news-slot.model';
import { NewsArchiveService } from '../../services/news-archive.service';
import { NewsService } from '../../services/news.service';
import { NewsTagService } from '../../services/news-tag.service';

const ARCHIVE_PAGE_SIZE = 10;
/** Запускает подгрузку следующей страницы архива, когда до низа списка остаётся меньше этого расстояния (px). */
const ARCHIVE_SCROLL_THRESHOLD_PX = 80;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Страница «Новости» — вариант 1 макета (`docs/figma/news1.json`, node-id
 * `491:3585`): слева закреплённая сетка карточек 3×12 (`PinnedNewsGrid`,
 * stream.Front#112, **на моках `NewsService`, эта задача её не трогает**),
 * справа панель архива (`NewsArchiveItem`) — теперь на реальном API
 * (`stream.Front#118`, поверх `streamer.API#65`/`#67`, `NewsArchiveService`).
 *
 * Шапка сайта здесь не рендерится — она уже есть глобально (`Shell` в
 * `app.html`, stream.Front#48/#49), включая лого, меню с `NavActiveIndicator`
 * и кнопку «Поддержать».
 *
 * **Архив (реальные данные)** — `GET /news`, подгрузка по скроллу
 * (`onArchiveScroll()`, `.news-page__archive-list` уже имеет `overflow-y:
 * auto`/`max-height`, см. `news-page.scss`): при приближении к низу списка
 * (`ARCHIVE_SCROLL_THRESHOLD_PX`) грузится следующая страница и
 * ДОБАВЛЯЕТСЯ к уже загруженным (не заменяет). Сортировка — по умолчанию на
 * бэке (`publishedAt desc`, "новые сначала"), клиентской сортировки не нужно.
 * Картинка строки — первая по `order` из `images[]` (см. `NewsArchiveItem`).
 *
 * Иконки тулбара архива (`minus`/`eyes`/`like` в макете — группа 120×40 с
 * подсвеченной "активной" ячейкой): «сердце» фильтрует уже загруженные строки
 * по `likedByCurrentUser` (реальный флаг с бэка). **«Глаз» — намеренно
 * ничего не фильтрует** (по прямому запросу пользователя): реальный API пока
 * не отдаёт флаг "просмотрено мной" (view-tracking — отдельная будущая
 * задача), кнопка оставлена в интерфейсе, но её сигнал `showOnlyViewed`
 * никуда не подставляется. `minus` сбрасывает оба тоггла.
 *
 * **Лайк** — `NewsArchiveItem.likeToggle` эмитит желаемое состояние,
 * `onLikeToggle()` здесь: оптимистично патчит локальный сигнал (мгновенный
 * визуальный отклик), шлёт `POST`/`DELETE /news/:id/like`, на успехе —
 * подтверждает актуальными `likeCount`/`likedByCurrentUser` из ответа, на
 * ошибке — откатывает патч и показывает toast (401 без сессии — "войдите,
 * чтобы поставить лайк", остальное — общая ошибка).
 *
 * Фильтр по датам/тегам (`NewsFilterSidebar.filterChange`) применяется
 * ТОЛЬКО к закреплённой сетке слева (мок, свой `tagId`-namespace) — на архив
 * (реальный API, другой `tagId`-namespace) больше не накладывается: полноценная
 * интеграция серверного фильтра `GET /news?tagId=`/периода — отдельная
 * будущая задача (нет диапазона дат в текущем контракте `GET /news`).
 */
@Component({
  selector: 'app-news-page',
  imports: [Button, ButtonGroup, Checkbox, NewsArchiveItem, NewsFilterSidebar, PinnedNewsGrid],
  templateUrl: './news-page.html',
  styleUrl: './news-page.scss',
})
export class NewsPage implements OnInit {
  private readonly newsService = inject(NewsService);
  private readonly newsTagService = inject(NewsTagService);
  private readonly newsArchiveService = inject(NewsArchiveService);
  private readonly notificationService = inject(NotificationService);

  private readonly news = signal<NewsItem[]>([]);
  private readonly tags = signal<NewsTag[]>([]);
  private readonly pinnedSlots = signal<PinnedNewsSlot[]>([]);
  protected readonly gridConfig = signal<PinnedGridConfig>({ columns: DEFAULT_GRID_COLUMNS, rows: DEFAULT_GRID_ROWS });

  private readonly archiveItems = signal<AdminNews[]>([]);
  private readonly archivePage = signal(0);
  private readonly archiveTotalPages = signal(1);
  protected readonly isLoadingArchive = signal(false);

  protected readonly filter = signal<NewsFilter>({ dateFrom: null, dateTo: null, tags: [] });
  protected readonly showOnlyViewed = signal(false);
  protected readonly showOnlyLiked = signal(false);

  private readonly tagsById = computed(() => new Map(this.tags().map((tag) => [tag.id, tag])));

  protected readonly gridEntries = computed<PinnedNewsGridEntry[]>(() => {
    const newsById = new Map(this.news().map((item) => [item.id, item]));
    const visibleIds = new Set(this.matching(this.news()).map((item) => item.id));

    return this.pinnedSlots()
      .filter((slot) => visibleIds.has(slot.newsId))
      .map((slot) => {
        const item = newsById.get(slot.newsId)!;
        return { item, tags: this.resolveTags(item), slot };
      });
  });

  protected readonly archiveEntries = computed<AdminNews[]>(() => {
    const onlyLiked = this.showOnlyLiked();
    return this.archiveItems().filter((item) => !onlyLiked || item.likedByCurrentUser);
  });

  ngOnInit(): void {
    this.newsTagService.getTags().subscribe((tags) => this.tags.set(tags));
    this.newsService.getNews().subscribe((news) => this.news.set(news));
    this.newsService.getPinnedSlots().subscribe((slots) => this.pinnedSlots.set(slots));
    this.newsService.getGridConfig().subscribe((config) => this.gridConfig.set(config));
    this.loadArchivePage(1);
  }

  protected resetArchiveFilters(): void {
    this.showOnlyViewed.set(false);
    this.showOnlyLiked.set(false);
  }

  protected onArchiveScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom > ARCHIVE_SCROLL_THRESHOLD_PX) {
      return;
    }
    if (this.isLoadingArchive() || this.archivePage() >= this.archiveTotalPages()) {
      return;
    }
    this.loadArchivePage(this.archivePage() + 1);
  }

  protected onLikeToggle(item: AdminNews, checked: boolean): void {
    const previousLikeCount = item.likeCount;
    const previousLiked = item.likedByCurrentUser;
    this.patchArchiveItem(item.id, {
      likedByCurrentUser: checked,
      likeCount: previousLikeCount + (checked ? 1 : -1),
    });

    const request = checked ? this.newsArchiveService.like(item.id) : this.newsArchiveService.unlike(item.id);
    request.subscribe({
      next: (response) =>
        this.patchArchiveItem(item.id, {
          likeCount: response.likeCount,
          likedByCurrentUser: response.likedByCurrentUser,
        }),
      error: (error: HttpErrorResponse) => {
        this.patchArchiveItem(item.id, { likeCount: previousLikeCount, likedByCurrentUser: previousLiked });
        this.notificationService.show(
          error.status === 401 ? 'Войдите, чтобы поставить лайк' : 'Не удалось поставить лайк',
          'error',
        );
      },
    });
  }

  private loadArchivePage(page: number): void {
    this.isLoadingArchive.set(true);
    this.newsArchiveService.getPage(page, ARCHIVE_PAGE_SIZE).subscribe({
      next: (response) => {
        this.archiveItems.update((items) => (page === 1 ? response.items : [...items, ...response.items]));
        this.archivePage.set(response.meta.page);
        this.archiveTotalPages.set(response.meta.totalPages);
        this.isLoadingArchive.set(false);
      },
      error: () => this.isLoadingArchive.set(false),
    });
  }

  private patchArchiveItem(id: string, patch: Partial<AdminNews>): void {
    this.archiveItems.update((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  private matching(items: NewsItem[]): NewsItem[] {
    const { dateFrom, dateTo, tags } = this.filter();
    if (!dateFrom && !dateTo && tags.length === 0) {
      return items;
    }

    return items.filter((item) => {
      if (dateFrom && item.publishedAt < startOfDay(dateFrom)) return false;
      if (dateTo && item.publishedAt > endOfDay(dateTo)) return false;
      return tags.length === 0 || item.tagIds.some((tagId) => tags.includes(tagId));
    });
  }

  private resolveTags(item: NewsItem): NewsTag[] {
    const byId = this.tagsById();
    return item.tagIds.map((tagId) => byId.get(tagId)).filter((tag): tag is NewsTag => !!tag);
  }
}
