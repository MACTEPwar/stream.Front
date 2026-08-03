import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AdminNews } from '@features/admin/models/news.model';
import { AdminNewsService } from '@features/admin/services/admin-news.service';
import { AdminNewsTagService } from '@features/admin/services/admin-news-tag.service';
import { Button } from '@shared/components/button/button';
import { ButtonGroup } from '@shared/components/button-group/button-group';
import { Checkbox } from '@shared/components/checkbox/checkbox';

import { NewsArchiveItem } from '../../components/news-archive-item/news-archive-item';
import { NewsDetailModal } from '../../components/news-detail-modal/news-detail-modal';
import { NewsFilterSidebar } from '../../components/news-filter-sidebar/news-filter-sidebar';
import { PinnedNewsGrid, PinnedNewsGridEntry } from '../../components/pinned-news-grid/pinned-news-grid';
import { NewsFilter } from '../../models/news-filter.model';
import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS, PinnedGridConfig, PinnedNewsSlot } from '../../models/pinned-news-slot.model';
import { NewsArchiveService } from '../../services/news-archive.service';
import { NewsItemAdapterService } from '../../services/news-item-adapter.service';
import { PinnedGridService } from '../../services/pinned-grid.service';

const ARCHIVE_PAGE_SIZE = 10;
/** Сколько новостей грузить сразу для закреплённой сетки (тот же паттерн/значение, что `AdminNewsPinnedPage`). */
const NEWS_PAGE_SIZE = 100;
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
 * `491:3585`): слева закреплённая сетка карточек (`PinnedNewsGrid`,
 * stream.Front#112), раскладка (`PinnedGridConfig`/`PinnedNewsSlot`) — на
 * реальном API (`stream.Front#119`, поверх `streamer.API#71`,
 * `PinnedGridService.getLayout('large')`), сами новости слотов — тоже
 * реальный API (`stream.Front#121`, поверх `streamer.API#65`/`#67`,
 * `AdminNewsService.getAll()`/`AdminNewsTagService.getAll()`, адаптированные
 * в `NewsItem`/`NewsTag` через общий `NewsItemAdapterService` — тот же
 * адаптер, что `AdminNewsPinnedPage`), справа панель архива
 * (`NewsArchiveItem`) — тоже на реальном API (`stream.Front#118`, поверх
 * `streamer.API#65`/`#67`, `NewsArchiveService`).
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
 * подсвеченной "активной" ячейкой): «сердце» и «глаз» одинаково фильтруют уже
 * загруженные строки по `likedByCurrentUser`/`viewedByCurrentUser`
 * (оба — реальные флаги с бэка, `viewedByCurrentUser` проставляется
 * автоматически при открытии `NewsDetailModal`, см. ниже). `minus` сбрасывает
 * оба тоггла.
 *
 * **Лайк** — `NewsArchiveItem.likeToggle` эмитит желаемое состояние,
 * `onLikeToggle()` здесь: оптимистично патчит локальный сигнал (мгновенный
 * визуальный отклик), шлёт `POST`/`DELETE /news/:id/like`, на успехе —
 * подтверждает актуальными `likeCount`/`likedByCurrentUser` из ответа, на
 * ошибке — откатывает патч и показывает toast (401 без сессии — "войдите,
 * чтобы поставить лайк", остальное — общая ошибка).
 *
 * **Просмотр** — `NewsArchiveItem.openDetail` (клик по строке) открывает
 * `NewsDetailModal` (`onOpenDetail()`), передавая `onViewed` колбэк —
 * модалка сама решает, звать ли `NewsArchiveService.markViewed()` (если
 * ещё не просмотрено), и на успехе зовёт колбэк с патчем
 * (`viewCount`/`viewedByCurrentUser`), который применяется к `archiveItems`
 * через `patchArchiveItem()` — тот же метод, что и у лайка, просто без
 * оптимистичного шага и отката (просмотр необратим и идемпотентен, откатывать
 * нечего).
 *
 * Фильтр по датам/тегам (`NewsFilterSidebar.filterChange`) применяется
 * ТОЛЬКО к архиву справа (клиентская фильтрация уже загруженных строк, тот же
 * приём, что и `showOnlyLiked`) — на закреплённую сетку слева (ручная
 * расстановка админа) не накладывается: слот, отфильтрованный по тегу/дате,
 * не должен пропадать из сетки, это не список кандидатов, а фиксированная
 * витрина. Полноценная интеграция серверного фильтра `GET /news?tagId=`/
 * периода (сейчас фильтрация — над уже загруженной страницей архива, новые
 * страницы по скроллу подгружаются без фильтра на бэке и проходят тот же
 * клиентский фильтр при рендере) — отдельная будущая задача (нет диапазона
 * дат в текущем контракте `GET /news`, `tagId` — только один, не массив).
 */
@Component({
  selector: 'app-news-page',
  imports: [Button, ButtonGroup, Checkbox, NewsArchiveItem, NewsFilterSidebar, PinnedNewsGrid],
  // NewsDetailModal не импортируется сюда напрямую — открывается через
  // ModalService.open(), рендерится ModalHost'ом через ngComponentOutlet.
  templateUrl: './news-page.html',
  styleUrl: './news-page.scss',
})
export class NewsPage implements OnInit {
  private readonly adminNewsService = inject(AdminNewsService);
  private readonly adminNewsTagService = inject(AdminNewsTagService);
  private readonly newsItemAdapter = inject(NewsItemAdapterService);
  private readonly newsArchiveService = inject(NewsArchiveService);
  private readonly pinnedGridService = inject(PinnedGridService);
  private readonly notificationService = inject(NotificationService);
  private readonly modalService = inject(ModalService);

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

    return this.pinnedSlots()
      .filter((slot) => newsById.has(slot.newsId))
      .map((slot) => {
        const item = newsById.get(slot.newsId)!;
        return { item, tags: this.resolveTags(item), slot };
      });
  });

  protected readonly archiveEntries = computed<AdminNews[]>(() => {
    const onlyLiked = this.showOnlyLiked();
    const onlyViewed = this.showOnlyViewed();
    const { dateFrom, dateTo, tags } = this.filter();

    return this.archiveItems().filter((item) => {
      if (onlyLiked && !item.likedByCurrentUser) return false;
      if (onlyViewed && !item.viewedByCurrentUser) return false;

      const publishedAt = new Date(item.publishedAt);
      if (dateFrom && publishedAt < startOfDay(dateFrom)) return false;
      if (dateTo && publishedAt > endOfDay(dateTo)) return false;

      return tags.length === 0 || item.tags.some((tag) => tags.includes(tag.id));
    });
  });

  ngOnInit(): void {
    this.adminNewsTagService
      .getAll()
      .subscribe((tags) => this.tags.set(tags.map((tag) => this.newsItemAdapter.toNewsTag(tag))));
    this.adminNewsService
      .getAll(1, NEWS_PAGE_SIZE)
      .subscribe((response) => this.news.set(response.items.map((item) => this.newsItemAdapter.toNewsItem(item))));
    this.pinnedGridService.getLayout('large').subscribe((layout) => {
      this.pinnedSlots.set(layout.slots);
      this.gridConfig.set(layout.config);
    });
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

  protected onOpenDetail(item: AdminNews): void {
    this.modalService.open(NewsDetailModal, {
      item,
      onViewed: (patch: Partial<AdminNews>) => this.patchArchiveItem(item.id, patch),
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

  private resolveTags(item: NewsItem): NewsTag[] {
    const byId = this.tagsById();
    return item.tagIds.map((tagId) => byId.get(tagId)).filter((tag): tag is NewsTag => !!tag);
  }
}
