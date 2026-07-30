import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NewsFilter } from '../../models/news-filter.model';
import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { PinnedNewsSlot } from '../../models/pinned-news-slot.model';
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

const ARCHIVE: NewsItem[] = [
  newsItem('archive-1', {
    views: 10,
    likes: 300,
    publishedAt: new Date(2023, 11, 6),
    viewedByCurrentUser: true,
    likedByCurrentUser: false,
  }),
  newsItem('archive-2', {
    views: 500,
    likes: 20,
    publishedAt: new Date(2023, 10, 1),
    tagIds: ['stream'],
    viewedByCurrentUser: false,
    likedByCurrentUser: true,
  }),
  newsItem('archive-3', {
    views: 300,
    likes: 100,
    publishedAt: new Date(2023, 9, 1),
    viewedByCurrentUser: true,
    likedByCurrentUser: true,
  }),
];

describe('NewsPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NewsPage],
      providers: [
        { provide: NewsTagService, useValue: { getTags: () => of(TAGS) } },
        {
          provide: NewsService,
          useValue: { getNews: () => of(NEWS), getArchive: () => of(ARCHIVE), getPinnedSlots: () => of(PINNED_SLOTS) },
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
    return page['archiveEntries']().map((entry) => entry.item.id);
  }

  it('рендерит карточку на каждую новость и строку архива на каждую запись архива', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('app-news-card').length).toBe(NEWS.length);
    expect(host.querySelectorAll('app-news-archive-item').length).toBe(ARCHIVE.length);
  });

  it('карточка со слотом colSpan: 2 занимает две колонки сетки', () => {
    const fixture = createPage();
    const wide = (fixture.nativeElement as HTMLElement).querySelectorAll('app-news-card');
    const wideCard = Array.from(wide).find((card) => (card as HTMLElement).style.gridColumn.includes('span 2'));

    expect(wideCard).not.toBeUndefined();
  });

  it('теги новости резолвятся в бейджи по id', () => {
    const fixture = createPage();
    const entry = fixture.componentInstance['gridEntries']()[0];

    expect(entry.tags).toEqual([TAGS[0]]);
  });

  it('тоггл «глаз» показывает только просмотренные текущим пользователем новости архива', () => {
    const page = createPage().componentInstance;

    page['showOnlyViewed'].set(true);

    expect(archiveIds(page)).toEqual(['archive-1', 'archive-3']);
  });

  it('тоггл «сердце» показывает только лайкнутые текущим пользователем новости архива', () => {
    const page = createPage().componentInstance;

    page['showOnlyLiked'].set(true);

    expect(archiveIds(page)).toEqual(['archive-2', 'archive-3']);
  });

  it('оба тоггла комбинируются через AND', () => {
    const page = createPage().componentInstance;

    page['showOnlyViewed'].set(true);
    page['showOnlyLiked'].set(true);

    expect(archiveIds(page)).toEqual(['archive-3']);
  });

  it('сброс возвращает полный список архива', () => {
    const page = createPage().componentInstance;

    page['showOnlyViewed'].set(true);
    page['showOnlyLiked'].set(true);
    page['resetArchiveFilters']();

    expect(archiveIds(page)).toEqual(['archive-1', 'archive-2', 'archive-3']);
  });

  it('фильтр по тегам применяется и к сетке, и к архиву', () => {
    const page = createPage().componentInstance;

    page['filter'].set({ dateFrom: null, dateTo: null, tags: ['stream'] });

    expect(page['gridEntries']().length).toBe(0);
    expect(archiveIds(page)).toEqual(['archive-2']);
  });

  it('фильтр по периоду включает границы дня', () => {
    const page = createPage().componentInstance;
    const filter: NewsFilter = {
      dateFrom: new Date(2023, 10, 1),
      dateTo: new Date(2023, 11, 6),
      tags: [],
    };

    page['filter'].set(filter);

    expect(archiveIds(page)).toEqual(['archive-1', 'archive-2']);
  });
});
