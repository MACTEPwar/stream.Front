import { BreakpointObserver } from '@angular/cdk/layout';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AdminNews } from '@features/admin/models/news.model';
import { Button } from '@shared/components/button/button';
import { ButtonGroup } from '@shared/components/button-group/button-group';
import { Checkbox } from '@shared/components/checkbox/checkbox';
import { LARGE_QUERY } from '@shared/utils/breakpoints';
import { isNewsArchiveBeside, newsPageContentWidth } from '@shared/utils/news-layout';

import { NewsArchiveItem } from '../../components/news-archive-item/news-archive-item';
import { NewsDetailModal } from '../../components/news-detail-modal/news-detail-modal';
import { NewsFilterSidebar } from '../../components/news-filter-sidebar/news-filter-sidebar';
import {
  PinnedNewsGrid,
  PinnedNewsGridEntry,
} from '../../components/pinned-news-grid/pinned-news-grid';
import { NewsFilter } from '../../models/news-filter.model';
import {
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROWS,
  PinnedGridConfig,
  PinnedGridViewport,
  PinnedNewsSlot,
} from '../../models/pinned-news-slot.model';
import { NewsArchiveQuery, NewsArchiveService } from '../../services/news-archive.service';
import { NewsItemAdapterService } from '../../services/news-item-adapter.service';
import { PinnedGridService } from '../../services/pinned-grid.service';

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
 * `491:3585`): слева закреплённая сетка карточек (`PinnedNewsGrid`,
 * stream.Front#112), раскладка (`PinnedGridConfig`/`PinnedNewsSlot`) — на
 * реальном API (`stream.Front#119`, поверх `streamer.API#71`,
 * `PinnedGridService.getLayout()`), сами новости слотов — тоже
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
 * **Адаптивный пресет закреплённой сетки (`stream.Front#122`, доработка
 * `pinned-grid-rework` — правило учитывает ОРИЕНТАЦИЮ, не только ширину)** —
 * `viewport` (`toSignal(BreakpointObserver.observe([LARGE_QUERY]))`,
 * `@shared/utils/breakpoints`) резолвит текущее окно в `PinnedGridViewport`
 * (`small`/`large`, зеркало SCSS-порогов `src/styles/_breakpoints.scss`).
 * Каждый пресет — ОТДЕЛЬНАЯ раскладка с бэка (свои `slots`/`columns`/`rows`,
 * не одна сетка, визуально сжимающаяся CSS-ом — см. `PinnedGridEditor`),
 * поэтому смена пресета на лету заново зовёт `PinnedGridService.getLayout(viewport)`:
 * реализовано `effect()`-ом, который читает `viewport()` — срабатывает один
 * раз при инициализации (реальным резолвнутым значением, `BreakpointObserver`
 * эмитит текущее состояние синхронно при подписке, `toSignal` успевает
 * получить его до первого рендера) и затем повторно только когда резолвнутый
 * пресет ДЕЙСТВИТЕЛЬНО меняется (Angular signals не перезапускают `effect()`
 * на повторную эмиссию с тем же значением) — лишних запросов на каждый пиксель
 * ресайза нет.
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
  host: {
    '[class.news-page--archive-below]': '!isArchiveBeside()',
    '(window:resize)': 'syncViewportWidth()',
    '(window:orientationchange)': 'syncViewportWidth()',
  },
})
export class NewsPage {
  private readonly newsItemAdapter = inject(NewsItemAdapterService);
  private readonly newsArchiveService = inject(NewsArchiveService);
  private readonly pinnedGridService = inject(PinnedGridService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly viewport = toSignal(
    this.breakpointObserver
      .observe([LARGE_QUERY])
      .pipe(map((state): PinnedGridViewport => (state.matches ? 'large' : 'small'))),
    { initialValue: 'large' as PinnedGridViewport },
  );

  /**
   * Ширина окна числом, а не медиа-запросом: порог, с которого лента встаёт
   * сбоку, — не самостоятельная величина, а сумма минимумов ленты, зазора и
   * витрины (`РАЗ-Ф-03`), и зависит ещё от паддинга страницы, разного на
   * пресетах. Выразить это медиа-запросами можно только двумя копиями
   * порога, которые разойдутся с минимумами при первой их правке; здесь
   * правило одно и живёт в `news-layout.ts` — оттуда же его берёт холст
   * `PinnedGridEditor`.
   */
  private readonly viewportWidth = signal(window.innerWidth);

  /**
   * Потолок ширины окна, выше которого лента вообще имеет право стоять
   * сбоку — по прямому запросу пользователя после визуальной проверки: на
   * 1200px и уже витрине, зажатой между лентой на её минимуме (440) и
   * зазором, оставалось ~530px, и это нечитаемо мало для главного
   * содержимого страницы (`РАЗ-О-01`). Формально это отдельный порог
   * поверх содержимого блоков, а не выведенный из их минимумов
   * (`РАЗ-Ф-03` в спеке запрещает именно это) — сознательное исключение
   * ради конкретного диапазона 1080..1200, где формула из минимумов ещё
   * держит ленту сбоку, а результат уже недостаточно широкий.
   */
  private static readonly ARCHIVE_BESIDE_MAX_VIEWPORT_WIDTH_PX = 1200;

  /**
   * Хватает ли витрине места, чтобы лента стояла сбоку (`АДП-О-12`,
   * `РАЗ-О-02`). Пресет для паддинга берётся у `viewport()` — того же
   * источника, что раскладку сетки, чтобы не заводить третью копию правила
   * `large`/`small`.
   *
   * От этого зависит не только положение ленты: страница с лентой снизу
   * переходит на document-level скролл, а сетка и список архива — на
   * content-based высоту (см. `news-page.scss`).
   */
  protected readonly isArchiveBeside = computed(
    () =>
      this.viewportWidth() > NewsPage.ARCHIVE_BESIDE_MAX_VIEWPORT_WIDTH_PX &&
      isNewsArchiveBeside(newsPageContentWidth(this.viewportWidth(), this.viewport())),
  );

  private readonly pinnedSlots = signal<PinnedNewsSlot[]>([]);
  protected readonly gridConfig = signal<PinnedGridConfig>({
    columns: DEFAULT_GRID_COLUMNS,
    rows: DEFAULT_GRID_ROWS,
  });

  private readonly archiveItems = signal<AdminNews[]>([]);
  private readonly archivePage = signal(0);
  private readonly archiveTotalPages = signal(1);
  protected readonly isLoadingArchive = signal(false);

  protected readonly filter = signal<NewsFilter>({ dateFrom: null, dateTo: null, tags: [] });
  protected readonly showOnlyViewed = signal(false);
  protected readonly showOnlyLiked = signal(false);

  /**
   * Витрина строится ЦЕЛИКОМ из ответа раскладки (`stream.Front#133`, поверх
   * `streamer.API#76`): содержимое карточки приходит вместе со слотом.
   *
   * Раньше здесь была подгрузка сотни свежих новостей и пересечение с ней по
   * `newsId` — закреплённая новость старше сотни в это пересечение не
   * попадала и молча исчезала из витрины у посетителя, хотя администратор
   * видел её в редакторе. Заодно витрина ждала загрузки ленты, чтобы
   * отрисоваться, — теперь два блока страницы не связаны по данным вовсе.
   */
  protected readonly gridEntries = computed<PinnedNewsGridEntry[]>(() =>
    this.pinnedSlots().map((slot) => ({
      item: this.newsItemAdapter.toPinnedNewsItem(slot),
      tags: slot.news.tags.map((tag) => this.newsItemAdapter.toNewsTag(tag)),
      slot,
    })),
  );

  /**
   * Клиентской фильтрации здесь больше нет (`stream.Front#129`): отбор
   * целиком на сервере, и показывается ровно то, что он вернул. Прежний
   * `filter()` поверх загруженной порции и был багом — старая новость не
   * находилась, а следующие порции приходили без условий и наполняли ленту
   * рвано.
   */
  protected readonly archiveEntries = computed<AdminNews[]>(() => this.archiveItems());

  /**
   * Единственное место, где условия панели и тумблеров превращаются в
   * параметры запроса. Границы периода уходят целыми днями **в часовом поясе
   * читателя**: бэкенд обе границы включает, поэтому выбранный день попадает
   * в результат целиком.
   *
   * Выключенный признак взаимодействия поле НЕ отправляет: `false` на бэке
   * означает «только НЕ просмотренные», а не «фильтр не применён».
   */
  private readonly archiveQuery = computed<NewsArchiveQuery>(() => {
    const { dateFrom, dateTo, tags } = this.filter();

    return {
      ...(dateFrom && { publishedFrom: startOfDay(dateFrom).toISOString() }),
      ...(dateTo && { publishedTo: endOfDay(dateTo).toISOString() }),
      ...(tags.length > 0 && { tagIds: tags }),
      ...(this.showOnlyLiked() && { likedByCurrentUser: true }),
      ...(this.showOnlyViewed() && { viewedByCurrentUser: true }),
    };
  });

  private readonly filterSidebar = viewChild.required(NewsFilterSidebar);

  constructor() {
    effect(() => {
      const viewport = this.viewport();
      this.pinnedGridService.getLayout(viewport).subscribe((layout) => {
        this.pinnedSlots.set(layout.slots);
        this.gridConfig.set(layout.config);
      });
    });

    // Смена условий начинает выборку заново, а не дополняет показанное
    // (`ФИЛ-Ф-01`). `untracked` — чтобы сбросы и запрос внутри не считались
    // зависимостями эффекта: следить нужно только за самими условиями.
    effect(() => {
      const query = this.archiveQuery();
      untracked(() => {
        this.archiveItems.set([]);
        this.archivePage.set(0);
        this.archiveTotalPages.set(1);
        this.loadArchivePage(1, query);
      });
    });
  }

  /**
   * Ресайз окна и поворот устройства — оба без перезагрузки страницы
   * (`АДП-Ф-06`). Сигнал меняется на каждый пиксель, но `isArchiveBeside()`
   * — булев `computed`, и вёрстка пересчитывается только когда ответ
   * действительно меняется.
   */
  protected syncViewportWidth(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  /**
   * Сброс **всех** условий одним действием (`ФИЛ-Ф-03`): вместе с тумблерами
   * очищается и панель — даты и темы живут в ней, и без этого кнопка
   * сбрасывала бы лишь половину отбора.
   */
  protected resetArchiveFilters(): void {
    this.showOnlyViewed.set(false);
    this.showOnlyLiked.set(false);
    this.filterSidebar().reset();
  }

  /**
   * Отбор по своим просмотрам и лайкам требует сессии — без неё бэкенд
   * отвечает `401` (`ФИЛ-О-04`). Гостю показываем подсказку и не включаем
   * тумблер: тот же приём, что при попытке лайка без входа (`РЕА-Ф-03`).
   * Проверка идёт до запроса, поэтому лишнего рейса за `401` нет.
   */
  protected onOwnReactionFilterChange(kind: 'viewed' | 'liked', checked: boolean): void {
    if (checked && !this.authService.currentUser()) {
      this.notificationService.show(
        'Войдите, чтобы отбирать новости по своим просмотрам и лайкам',
        'error',
      );
      return;
    }

    const toggle = kind === 'viewed' ? this.showOnlyViewed : this.showOnlyLiked;
    toggle.set(checked);
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

    const request = checked
      ? this.newsArchiveService.like(item.id)
      : this.newsArchiveService.unlike(item.id);
    request.subscribe({
      next: (response) =>
        this.patchArchiveItem(item.id, {
          likeCount: response.likeCount,
          likedByCurrentUser: response.likedByCurrentUser,
        }),
      error: (error: HttpErrorResponse) => {
        this.patchArchiveItem(item.id, {
          likeCount: previousLikeCount,
          likedByCurrentUser: previousLiked,
        });
        this.notificationService.show(
          error.status === 401 ? 'Войдите, чтобы поставить лайк' : 'Не удалось поставить лайк',
          'error',
        );
      },
    });
  }

  protected onOpenDetail(item: AdminNews): void {
    this.modalService.open(
      NewsDetailModal,
      {
        item,
        onViewed: (patch: Partial<AdminNews>) => this.patchArchiveItem(item.id, patch),
      },
      // На `small` `ModalHost` показывает эту модалку нижней шторкой вместо
      // центральной панели (`stream.Front#122`) — на `middle`/`large` без
      // изменений.
      'sheet-on-mobile',
    );
  }

  /**
   * Условия уходят вместе с запросом порции, поэтому подгрузка по скроллу
   * догружает только совпадения (`ФИЛ-Ф-02`). Аргумент нужен эффекту смены
   * условий: тот уже прочитал `archiveQuery()` и передаёт его явно, чтобы не
   * читать сигнал повторно внутри `untracked`.
   */
  private loadArchivePage(page: number, query: NewsArchiveQuery = this.archiveQuery()): void {
    this.isLoadingArchive.set(true);
    this.newsArchiveService.getPage(page, ARCHIVE_PAGE_SIZE, query).subscribe({
      next: (response) => {
        this.archiveItems.update((items) =>
          page === 1 ? response.items : [...items, ...response.items],
        );
        this.archivePage.set(response.meta.page);
        this.archiveTotalPages.set(response.meta.totalPages);
        this.isLoadingArchive.set(false);
      },
      error: () => this.isLoadingArchive.set(false),
    });
  }

  private patchArchiveItem(id: string, patch: Partial<AdminNews>): void {
    this.archiveItems.update((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
}
