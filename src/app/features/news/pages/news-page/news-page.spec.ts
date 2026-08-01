import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AdminNews } from '@features/admin/models/news.model';
import { PaginatedResponse } from '@features/admin/services/admin-users.service';
import { NewsFilter } from '../../models/news-filter.model';
import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { PinnedNewsSlot } from '../../models/pinned-news-slot.model';
import { LikeResponse, NewsArchiveService } from '../../services/news-archive.service';
import { NewsService } from '../../services/news.service';
import { NewsTagService } from '../../services/news-tag.service';
import { NewsPage } from './news-page';

const TAGS: NewsTag[] = [
  { id: 'tournament', name: 'Турнир', severity: 'danger' },
  { id: 'stream', name: 'Стрим', severity: 'success' },
];

function newsItem(id: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    title: 'Заголовок',
    excerpt: 'Lorem ipsum dolor sit amet consectetur.',
    imageUrl: null,
    tagIds: ['tournament'],
    views: 100,
    likes: 100,
    publishedAt: new Date(2023, 11, 6),
    viewedByCurrentUser: false,
    likedByCurrentUser: false,
    ...overrides,
  };
}

const NEWS: NewsItem[] = Array.from({ length: 7 }, (_, index) => newsItem(`news-${index + 1}`));

const PINNED_SLOTS: PinnedNewsSlot[] = NEWS.map((item, index) => ({
  newsId: item.id,
  colStart: ((index % 3) + 1) as 1 | 2 | 3,
  rowStart: index + 1,
  colSpan: index === 3 ? 2 : 1,
  rowSpan: 1,
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
    images: [],
    tags: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function archivePage(items: AdminNews[], page: number, totalPages: number): PaginatedResponse<AdminNews> {
  return { items, meta: { page, limit: 10, total: items.length, totalPages } };
}

describe('NewsPage', () => {
  let archiveGetPage: ReturnType<typeof vi.fn<NewsArchiveService['getPage']>>;
  let archiveLike: ReturnType<typeof vi.fn<NewsArchiveService['like']>>;
  let archiveUnlike: ReturnType<typeof vi.fn<NewsArchiveService['unlike']>>;
  const ARCHIVE_PAGE_1 = [adminNews('archive-1', { likedByCurrentUser: false }), adminNews('archive-2', { likedByCurrentUser: true })];

  beforeEach(() => {
    archiveGetPage = vi.fn<NewsArchiveService['getPage']>().mockReturnValue(of(archivePage(ARCHIVE_PAGE_1, 1, 1)));
    archiveLike = vi.fn<NewsArchiveService['like']>();
    archiveUnlike = vi.fn<NewsArchiveService['unlike']>();

    TestBed.configureTestingModule({
      imports: [NewsPage],
      providers: [
        { provide: NewsTagService, useValue: { getTags: () => of(TAGS) } },
        {
          provide: NewsService,
          useValue: { getNews: () => of(NEWS), getPinnedSlots: () => of(PINNED_SLOTS) },
        },
        {
          provide: NewsArchiveService,
          useValue: { getPage: archiveGetPage, like: archiveLike, unlike: archiveUnlike },
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

  it('рендерит карточку на каждую новость сетки и строку архива на каждую загруженную запись', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('app-news-card').length).toBe(NEWS.length);
    expect(host.querySelectorAll('app-news-archive-item').length).toBe(ARCHIVE_PAGE_1.length);
  });

  it('загружает первую страницу архива при инициализации', () => {
    createPage();

    expect(archiveGetPage).toHaveBeenCalledWith(1, 10);
  });

  it('карточка со слотом colSpan: 2 занимает две колонки сетки', () => {
    const fixture = createPage();
    const wide = (fixture.nativeElement as HTMLElement).querySelectorAll('app-news-card');
    const wideCard = Array.from(wide).find((card) => (card as HTMLElement).style.gridColumn.includes('span 2'));

    expect(wideCard).not.toBeUndefined();
  });

  it('теги новости сетки резолвятся в бейджи по id', () => {
    const fixture = createPage();
    const entry = fixture.componentInstance['gridEntries']()[0];

    expect(entry.tags).toEqual([TAGS[0]]);
  });

  it('тоггл «сердце» показывает только лайкнутые текущим пользователем строки архива', () => {
    const page = createPage().componentInstance;

    page['showOnlyLiked'].set(true);

    expect(archiveIds(page)).toEqual(['archive-2']);
  });

  it('тоггл «глаз» ничего не фильтрует (реальный API не отдаёт флаг просмотра)', () => {
    const page = createPage().componentInstance;

    page['showOnlyViewed'].set(true);

    expect(archiveIds(page)).toEqual(['archive-1', 'archive-2']);
  });

  it('сброс тоггла «сердце» возвращает полный список архива', () => {
    const page = createPage().componentInstance;

    page['showOnlyLiked'].set(true);
    page['resetArchiveFilters']();

    expect(archiveIds(page)).toEqual(['archive-1', 'archive-2']);
  });

  it('фильтр по тегам сайдбара применяется только к сетке, не к архиву', () => {
    const page = createPage().componentInstance;

    page['filter'].set({ dateFrom: null, dateTo: null, tags: ['stream'] } satisfies NewsFilter);

    expect(page['gridEntries']().length).toBe(0);
    expect(archiveIds(page)).toEqual(['archive-1', 'archive-2']);
  });

  it('прокрутка архива почти до конца грузит следующую страницу и добавляет её к списку', () => {
    archiveGetPage
      .mockReturnValueOnce(of(archivePage(ARCHIVE_PAGE_1, 1, 2)))
      .mockReturnValueOnce(of(archivePage([adminNews('archive-3')], 2, 2)));
    const page = createPage().componentInstance;

    page['onArchiveScroll']({
      target: { scrollHeight: 1000, scrollTop: 950, clientHeight: 100 },
    } as unknown as Event);

    expect(archiveGetPage).toHaveBeenCalledWith(2, 10);
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
    archiveLike.mockReturnValue(of({ likeCount: 11, likedByCurrentUser: true } satisfies LikeResponse));
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
    archiveUnlike.mockReturnValue(of({ likeCount: 9, likedByCurrentUser: false } satisfies LikeResponse));
    const page = createPage().componentInstance;
    const item = page['archiveEntries']().find((entry) => entry.id === 'archive-2')!;

    page['onLikeToggle'](item, false);

    expect(archiveUnlike).toHaveBeenCalledWith('archive-2');
  });
});
