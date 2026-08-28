import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, startWith, throwError } from 'rxjs';

import { CurrentUser } from '@core/models/current-user.model';
import { AuthService } from '@core/services/auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { AdminNews, AdminNewsTag } from '@features/admin/models/news.model';
import { AdminNewsService } from '@features/admin/services/admin-news.service';
import { AdminNewsTagService } from '@features/admin/services/admin-news-tag.service';
import { PaginatedResponse } from '@features/admin/services/admin-users.service';
import { LARGE_QUERY } from '@shared/utils/breakpoints';
import { NewsFilter } from '../../models/news-filter.model';
import { NewsTag } from '../../models/news-tag.model';
import { DEFAULT_CARD_STYLE, PinnedNewsSlot } from '../../models/pinned-news-slot.model';
import {
  NewsDetailModal,
  NewsDetailModalData,
} from '../../components/news-detail-modal/news-detail-modal';
import { LikeResponse, NewsArchiveService } from '../../services/news-archive.service';
import { PinnedGridService } from '../../services/pinned-grid.service';
import { NewsPage } from './news-page';

function adminTag(id: string, name: string): AdminNewsTag {
  return { id, name, color: '#d4b106', textColor: '#ffffff', createdAt: '', updatedAt: '' };
}

const ADMIN_TAGS: AdminNewsTag[] = [adminTag('tournament', 'Турнир'), adminTag('stream', 'Стрим')];
const TAGS: NewsTag[] = ADMIN_TAGS.map(({ id, name, color, textColor }) => ({
  id,
  name,
  color,
  textColor,
}));

function adminNews(id: string, overrides: Partial<AdminNews> = {}): AdminNews {
  return {
    id,
    title: `Новость ${id}`,
    description: 'Lorem ipsum dolor sit amet consectetur.',
    publishedAt: '2023-12-06T00:00:00.000Z',
    viewCount: 100,
    likeCount: 10,
    likedByCurrentUser: false,
    viewedByCurrentUser: false,
    images: [],
    tags: [],
    hasNoImage: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

/** Реальный `AdminNews` для карточки закреплённой сетки — тегом всегда `tournament` (`ADMIN_TAGS[0]`). */
function gridNews(id: string): AdminNews {
  return adminNews(id, { viewCount: 100, likeCount: 100, tags: [ADMIN_TAGS[0]] });
}

const GRID_NEWS: AdminNews[] = Array.from({ length: 7 }, (_, index) =>
  gridNews(`news-${index + 1}`),
);

const PINNED_SLOTS: PinnedNewsSlot[] = GRID_NEWS.map((item, index) => ({
  newsId: item.id,
  colStart: (index % 3) + 1,
  rowStart: index + 1,
  colSpan: index === 3 ? 2 : 1,
  rowSpan: 1,
  style: DEFAULT_CARD_STYLE,
  coverImageUrl: null,
  focalPoint: null,
}));

function archivePage(
  items: AdminNews[],
  page: number,
  totalPages: number,
): PaginatedResponse<AdminNews> {
  return { items, meta: { page, limit: 10, total: items.length, totalPages } };
}

function breakpointState(matches: boolean): BreakpointState {
  return { matches, breakpoints: { [LARGE_QUERY]: matches } };
}

describe('NewsPage', () => {
  let archiveGetPage: ReturnType<typeof vi.fn<NewsArchiveService['getPage']>>;
  let archiveLike: ReturnType<typeof vi.fn<NewsArchiveService['like']>>;
  let archiveUnlike: ReturnType<typeof vi.fn<NewsArchiveService['unlike']>>;
  let pinnedGridGetLayout: ReturnType<typeof vi.fn<PinnedGridService['getLayout']>>;
  let breakpointState$: Subject<BreakpointState>;
  let notificationShow: ReturnType<typeof vi.fn>;
  /**
   * Сигнал, а не обычное поле: приложение работает без zone.js, и подмена
   * значения в тесте должна сама поднимать перерасчёт (см. `CLAUDE.md`
   * репозитория и зависимые `computed` страницы).
   */
  let currentUser: WritableSignal<CurrentUser | null>;
  const ARCHIVE_PAGE_1 = [
    adminNews('archive-1', { likedByCurrentUser: false, viewedByCurrentUser: false }),
    adminNews('archive-2', { likedByCurrentUser: true, viewedByCurrentUser: true }),
  ];

  beforeEach(() => {
    archiveGetPage = vi
      .fn<NewsArchiveService['getPage']>()
      .mockReturnValue(of(archivePage(ARCHIVE_PAGE_1, 1, 1)));
    archiveLike = vi.fn<NewsArchiveService['like']>();
    archiveUnlike = vi.fn<NewsArchiveService['unlike']>();
    pinnedGridGetLayout = vi
      .fn<PinnedGridService['getLayout']>()
      .mockReturnValue(of({ config: { columns: 3, rows: 12 }, slots: PINNED_SLOTS }));
    breakpointState$ = new Subject<BreakpointState>();
    notificationShow = vi.fn();
    currentUser = signal<CurrentUser | null>({
      id: 'u1',
      role: 'USER',
      name: 'Читатель',
      avatarUrl: null,
      authMethods: [],
    });

    TestBed.configureTestingModule({
      imports: [NewsPage],
      providers: [
        { provide: AuthService, useValue: { currentUser } },
        { provide: NotificationService, useValue: { show: notificationShow } },
        { provide: AdminNewsTagService, useValue: { getAll: () => of(ADMIN_TAGS) } },
        {
          provide: AdminNewsService,
          useValue: {
            getAll: () =>
              of({
                items: GRID_NEWS,
                meta: { page: 1, limit: 100, total: GRID_NEWS.length, totalPages: 1 },
              }),
          },
        },
        { provide: PinnedGridService, useValue: { getLayout: pinnedGridGetLayout } },
        {
          provide: NewsArchiveService,
          useValue: { getPage: archiveGetPage, like: archiveLike, unlike: archiveUnlike },
        },
        // jsdom не реализует `matchMedia`, от которого зависит реальный
        // `BreakpointObserver` (тот же гочтч, что у `p-select`'s `Overlay`,
        // см. `select.spec.ts`) — начальное синхронное «large»-состояние
        // (совпадает с реальным поведением `BreakpointObserver.observe()`,
        // эмитящим текущее совпадение сразу при подписке), дальнейшие смены
        // вьюпорта — через `breakpointState$` в отдельных тестах ниже.
        {
          provide: BreakpointObserver,
          useValue: { observe: () => breakpointState$.pipe(startWith(breakpointState(true))) },
        },
      ],
    });
  });

  function createPage() {
    const fixture = TestBed.createComponent(NewsPage);
    fixture.detectChanges();
    return fixture;
  }

  function archiveIds(page: NewsPage): string[] {
    return page['archiveEntries']().map((item) => item.id);
  }

  /**
   * Положение ленты (`stream.Front#126`) — по доступной ширине, а не по
   * пресету компоновки (`АДП-О-12`). Пресет здесь всегда `large`
   * (`BreakpointObserver` замокан выше), поэтому тесты ниже проверяют
   * именно то, что раньше было сломано: на `large` лента вставала сбоку
   * независимо от того, оставалось ли витрине место.
   */
  function setWindowWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', {
      value: width,
      configurable: true,
      writable: true,
    });
  }

  describe('положение ленты', () => {
    const initialWidth = window.innerWidth;

    afterEach(() => setWindowWidth(initialWidth));

    it('на эталонном экране лента стоит сбоку', () => {
      setWindowWidth(1920);

      const fixture = createPage();

      expect(fixture.componentInstance['isArchiveBeside']()).toBe(true);
      expect((fixture.nativeElement as HTMLElement).classList).not.toContain(
        'news-page--archive-below',
      );
    });

    it('на планшете альбомом (1024) лента уходит вниз, хотя пресет остаётся large', () => {
      setWindowWidth(1024);

      const fixture = createPage();

      // 1024 − 2×60 = 904 доступной ширины: витрине не остаётся достаточных 500
      expect(fixture.componentInstance['isArchiveBeside']()).toBe(false);
      expect((fixture.nativeElement as HTMLElement).classList).toContain(
        'news-page--archive-below',
      );
    });

    it('ровно на пороге лента ещё сбоку', () => {
      setWindowWidth(1080);

      const fixture = createPage();

      expect(fixture.componentInstance['isArchiveBeside']()).toBe(true);
    });

    it('пересчитывается на ресайз окна без перезагрузки страницы', () => {
      setWindowWidth(1920);
      const fixture = createPage();
      expect(fixture.componentInstance['isArchiveBeside']()).toBe(true);

      setWindowWidth(1024);
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      expect(fixture.componentInstance['isArchiveBeside']()).toBe(false);
      expect((fixture.nativeElement as HTMLElement).classList).toContain(
        'news-page--archive-below',
      );
    });

    it('сетка витрины переходит на content-based высоту вместе с переносом ленты', () => {
      setWindowWidth(1024);

      const fixture = createPage();
      const grid = (fixture.nativeElement as HTMLElement).querySelector('app-pinned-news-grid');

      expect(grid?.classList).toContain('pinned-news-grid--auto-height');
    });
  });

  it('рендерит карточку на каждую новость сетки и строку архива на каждую загруженную запись', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('app-news-card').length).toBe(GRID_NEWS.length);
    expect(host.querySelectorAll('app-news-archive-item').length).toBe(ARCHIVE_PAGE_1.length);
  });

  it('загружает первую страницу архива при инициализации', () => {
    createPage();

    expect(archiveGetPage).toHaveBeenCalledWith(1, 10, {});
  });

  it('карточка со слотом colSpan: 2 занимает две колонки сетки', () => {
    const fixture = createPage();
    const wide = (fixture.nativeElement as HTMLElement).querySelectorAll('app-news-card');
    const wideCard = Array.from(wide).find((card) =>
      (card as HTMLElement).style.gridColumn.includes('span 2'),
    );

    expect(wideCard).not.toBeUndefined();
  });

  it('теги новости сетки резолвятся в бейджи по id', () => {
    const fixture = createPage();
    const entry = fixture.componentInstance['gridEntries']()[0];

    expect(entry.tags).toEqual([TAGS[0]]);
  });

  /**
   * Отбор ушёл на сервер (`stream.Front#129`, поверх `streamer.API#77`).
   * Прежние тесты проверяли клиентскую фильтрацию загруженной порции — то
   * самое поведение, из-за которого старая новость не находилась, а лента
   * наполнялась рвано. Теперь проверяется, что условия доходят до запроса, а
   * пришедшее показывается как есть.
   */
  describe('серверный отбор (stream.Front#129)', () => {
    /**
     * Условия отбора теперь запускают ЗАПРОС, а не пересчёт `computed`,
     * поэтому после их смены нужен прогон change detection — эффект
     * срабатывает в нём (приложение без zone.js, само по себе ничего не
     * «дозреет»).
     */
    function changeFilters(fixture: ComponentFixture<NewsPage>, change: () => void) {
      change();
      fixture.detectChanges();
    }

    it('шлёт признак «с моим лайком» в запрос, а не фильтрует загруженное', () => {
      const fixture = createPage();
      const page = fixture.componentInstance;

      changeFilters(fixture, () => page['showOnlyLiked'].set(true));

      expect(archiveGetPage).toHaveBeenLastCalledWith(1, 10, { likedByCurrentUser: true });
      expect(archiveIds(page)).toEqual(['archive-1', 'archive-2']);
    });

    it('шлёт признак «просмотренные» в запрос', () => {
      const fixture = createPage();

      changeFilters(fixture, () => fixture.componentInstance['showOnlyViewed'].set(true));

      expect(archiveGetPage).toHaveBeenLastCalledWith(1, 10, { viewedByCurrentUser: true });
    });

    it('шлёт темы и период, границы — целыми днями читателя', () => {
      const fixture = createPage();

      changeFilters(fixture, () =>
        fixture.componentInstance['filter'].set({
          dateFrom: new Date(2026, 7, 1),
          dateTo: new Date(2026, 7, 27),
          tags: ['stream', 'tournament'],
        } satisfies NewsFilter),
      );

      expect(archiveGetPage).toHaveBeenLastCalledWith(1, 10, {
        publishedFrom: new Date(2026, 7, 1, 0, 0, 0, 0).toISOString(),
        publishedTo: new Date(2026, 7, 27, 23, 59, 59, 999).toISOString(),
        tagIds: ['stream', 'tournament'],
      });
    });

    it('смена условий начинает выборку заново, а не дополняет показанное (ФИЛ-Ф-01)', () => {
      archiveGetPage
        .mockReturnValueOnce(of(archivePage(ARCHIVE_PAGE_1, 1, 2)))
        .mockReturnValueOnce(of(archivePage([adminNews('archive-3')], 2, 2)))
        .mockReturnValueOnce(of(archivePage([adminNews('archive-9')], 1, 1)));
      const fixture = createPage();
      const page = fixture.componentInstance;

      page['onArchiveScroll']({
        target: { scrollHeight: 1000, scrollTop: 950, clientHeight: 100 },
      } as unknown as Event);
      expect(archiveIds(page)).toHaveLength(3);

      changeFilters(fixture, () => page['showOnlyLiked'].set(true));

      // Список заменён результатом нового отбора, а не дополнен им
      expect(archiveIds(page)).toEqual(['archive-9']);
      expect(archiveGetPage).toHaveBeenLastCalledWith(1, 10, { likedByCurrentUser: true });
    });

    it('подгрузка следующей порции сохраняет активные условия (ФИЛ-Ф-02)', () => {
      archiveGetPage.mockReturnValue(of(archivePage(ARCHIVE_PAGE_1, 1, 2)));
      const fixture = createPage();
      const page = fixture.componentInstance;

      changeFilters(fixture, () => page['showOnlyLiked'].set(true));
      page['onArchiveScroll']({
        target: { scrollHeight: 1000, scrollTop: 950, clientHeight: 100 },
      } as unknown as Event);

      expect(archiveGetPage).toHaveBeenLastCalledWith(2, 10, { likedByCurrentUser: true });
    });

    it('сбрасывает все условия одним действием — и тумблеры, и панель (ФИЛ-Ф-03)', () => {
      const fixture = createPage();
      const page = fixture.componentInstance;

      changeFilters(fixture, () => {
        page['showOnlyLiked'].set(true);
        page['filter'].set({ dateFrom: null, dateTo: null, tags: ['stream'] } satisfies NewsFilter);
      });

      changeFilters(fixture, () => page['resetArchiveFilters']());

      expect(page['showOnlyLiked']()).toBe(false);
      expect(page['filter']()).toEqual({ dateFrom: null, dateTo: null, tags: [] });
      expect(archiveGetPage).toHaveBeenLastCalledWith(1, 10, {});
    });

    it('показывает всё, что вернул сервер, без повторной фильтрации на клиенте', () => {
      archiveGetPage.mockReturnValue(
        of(
          archivePage(
            [
              adminNews('archive-1', { tags: [ADMIN_TAGS[1]] }),
              adminNews('archive-2', { tags: [] }),
            ],
            1,
            1,
          ),
        ),
      );
      const fixture = createPage();
      const page = fixture.componentInstance;

      changeFilters(fixture, () =>
        page['filter'].set({ dateFrom: null, dateTo: null, tags: ['stream'] } satisfies NewsFilter),
      );

      // Вторая строка без совпадающего тега — раньше клиент бы её отбросил;
      // теперь отбор целиком на сервере, и клиент показывает ответ как есть
      expect(archiveIds(page)).toEqual(['archive-1', 'archive-2']);
    });

    it('витрина на фильтры не реагирует (ЗАК-О-07)', () => {
      const fixture = createPage();
      const page = fixture.componentInstance;

      changeFilters(fixture, () => {
        page['filter'].set({ dateFrom: null, dateTo: null, tags: ['stream'] } satisfies NewsFilter);
        page['showOnlyLiked'].set(true);
      });

      expect(page['gridEntries']().length).toBe(GRID_NEWS.length);
    });

    it('гостю подсказывает войти и не включает тумблер вместо запроса с 401', () => {
      currentUser.set(null);
      const fixture = createPage();
      const page = fixture.componentInstance;
      archiveGetPage.mockClear();

      changeFilters(fixture, () => page['onOwnReactionFilterChange']('liked', true));

      expect(page['showOnlyLiked']()).toBe(false);
      expect(archiveGetPage).not.toHaveBeenCalled();
      expect(notificationShow).toHaveBeenCalledWith(expect.stringContaining('ойдите'), 'error');
    });

    it('авторизованному тумблер включается обычным образом', () => {
      const fixture = createPage();
      const page = fixture.componentInstance;

      changeFilters(fixture, () => page['onOwnReactionFilterChange']('liked', true));

      expect(page['showOnlyLiked']()).toBe(true);
      expect(archiveGetPage).toHaveBeenLastCalledWith(1, 10, { likedByCurrentUser: true });
    });
  });

  it('прокрутка архива почти до конца грузит следующую страницу и добавляет её к списку', () => {
    archiveGetPage
      .mockReturnValueOnce(of(archivePage(ARCHIVE_PAGE_1, 1, 2)))
      .mockReturnValueOnce(of(archivePage([adminNews('archive-3')], 2, 2)));
    const page = createPage().componentInstance;

    page['onArchiveScroll']({
      target: { scrollHeight: 1000, scrollTop: 950, clientHeight: 100 },
    } as unknown as Event);

    expect(archiveGetPage).toHaveBeenCalledWith(2, 10, {});
    expect(archiveIds(page)).toEqual(['archive-1', 'archive-2', 'archive-3']);
  });

  it('прокрутка вдали от конца списка не грузит следующую страницу', () => {
    const page = createPage().componentInstance;
    archiveGetPage.mockClear();

    page['onArchiveScroll']({
      target: { scrollHeight: 1000, scrollTop: 200, clientHeight: 100 },
    } as unknown as Event);

    expect(archiveGetPage).not.toHaveBeenCalled();
  });

  it('лайк — оптимистично обновляет счётчик/флаг и подтверждает их ответом сервера', () => {
    archiveLike.mockReturnValue(
      of({ likeCount: 11, likedByCurrentUser: true } satisfies LikeResponse),
    );
    const page = createPage().componentInstance;
    const item = page['archiveEntries']()[0];
    expect(item.likedByCurrentUser).toBe(false);

    page['onLikeToggle'](item, true);

    expect(archiveLike).toHaveBeenCalledWith('archive-1');
    const updated = page['archiveEntries']().find((entry) => entry.id === 'archive-1')!;
    expect(updated.likedByCurrentUser).toBe(true);
    expect(updated.likeCount).toBe(11);
  });

  it('лайк без авторизации — откатывает оптимистичное обновление при ошибке', () => {
    archiveLike.mockReturnValue(throwError(() => ({ status: 401 })));
    const page = createPage().componentInstance;
    const item = page['archiveEntries']()[0];
    const originalLikeCount = item.likeCount;

    page['onLikeToggle'](item, true);

    const reverted = page['archiveEntries']().find((entry) => entry.id === 'archive-1')!;
    expect(reverted.likedByCurrentUser).toBe(false);
    expect(reverted.likeCount).toBe(originalLikeCount);
  });

  it('снятие лайка вызывает unlike', () => {
    archiveUnlike.mockReturnValue(
      of({ likeCount: 9, likedByCurrentUser: false } satisfies LikeResponse),
    );
    const page = createPage().componentInstance;
    const item = page['archiveEntries']().find((entry) => entry.id === 'archive-2')!;

    page['onLikeToggle'](item, false);

    expect(archiveUnlike).toHaveBeenCalledWith('archive-2');
  });

  it('открытие детали новости открывает NewsDetailModal с onViewed, патчащим archiveEntries', () => {
    const page = createPage().componentInstance;
    const modalService = TestBed.inject(ModalService);
    const item = page['archiveEntries']()[0];

    page['onOpenDetail'](item);

    expect(modalService.activeComponent()).toBe(NewsDetailModal);
    const data = modalService.activeData() as NewsDetailModalData;
    expect(data.item).toBe(item);

    data.onViewed?.({ viewCount: 999, viewedByCurrentUser: true });

    const updated = page['archiveEntries']().find((entry) => entry.id === item.id)!;
    expect(updated.viewCount).toBe(999);
    expect(updated.viewedByCurrentUser).toBe(true);
  });

  it('запрашивает раскладку сетки текущего вьюпорта ровно один раз при инициализации', () => {
    createPage();

    expect(pinnedGridGetLayout).toHaveBeenCalledTimes(1);
    expect(pinnedGridGetLayout).toHaveBeenCalledWith('large');
  });

  it('смена резолвнутого вьюпорта на лету заново запрашивает раскладку под новый пресет', () => {
    const fixture = createPage();
    pinnedGridGetLayout.mockClear();

    breakpointState$.next(breakpointState(false));
    fixture.detectChanges();

    expect(pinnedGridGetLayout).toHaveBeenCalledTimes(1);
    expect(pinnedGridGetLayout).toHaveBeenCalledWith('small');
  });

  it('повторная эмиссия того же вьюпорта не запрашивает раскладку ещё раз', () => {
    const fixture = createPage();
    pinnedGridGetLayout.mockClear();

    breakpointState$.next(breakpointState(true));
    fixture.detectChanges();

    expect(pinnedGridGetLayout).not.toHaveBeenCalled();
  });
});
