import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { AdminNews } from '../../models/news.model';
import { AdminNewsService } from '../../services/admin-news.service';
import { DEFAULT_CARD_STYLE, PinnedGridLayout, PinnedGridViewport } from '../../../news/models/pinned-news-slot.model';
import { NewsService } from '../../../news/services/news.service';
import { AdminNewsPinnedPage } from './admin-news-pinned-page';

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

describe('AdminNewsPinnedPage', () => {
  let getAllSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAllSpy = vi.fn().mockReturnValue(
      of({
        items: [
          adminNews('news-a'),
          adminNews('news-b', {
            images: [
              { id: 'img-2', url: '/uploads/2.png', order: 2 },
              { id: 'img-1', url: '/uploads/1.png', order: 1 },
            ],
          }),
        ],
        meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
      }),
    );

    TestBed.configureTestingModule({
      imports: [AdminNewsPinnedPage],
      providers: [{ provide: AdminNewsService, useValue: { getAll: getAllSpy } }],
    });
  });

  it('грузит справочник новостей через AdminNewsService и раскладки всех трёх вьюпортов через NewsService', () => {
    const fixture = TestBed.createComponent(AdminNewsPinnedPage);
    fixture.detectChanges();

    expect(fixture.componentInstance['hasError']()).toBe(false);
    expect(getAllSpy).toHaveBeenCalledWith(1, 100);

    const layouts = fixture.componentInstance['layouts']();
    expect(layouts.small.slots.length).toBeGreaterThan(0);
    expect(layouts.middle.config).toEqual({ columns: 3, rows: 12 });
    expect(layouts.large.slots.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('app-pinned-grid-editor')).not.toBeNull();
  });

  it('адаптирует AdminNews в NewsItem: imageUrl — первая по order картинка, imageUrls — все по порядку, резолвятся через ImageUrlService', () => {
    const fixture = TestBed.createComponent(AdminNewsPinnedPage);
    fixture.detectChanges();

    const news = fixture.componentInstance['news']();
    const withoutImages = news.find((item) => item.id === 'news-a');
    expect(withoutImages?.imageUrl).toBeNull();
    expect(withoutImages?.imageUrls).toEqual([]);

    const withImages = news.find((item) => item.id === 'news-b');
    expect(withImages?.imageUrl).toContain('/uploads/1.png');
    expect(withImages?.imageUrls.map((url) => url.split('/uploads/')[1])).toEqual(['1.png', '2.png']);
  });

  it('«save» из редактора вызывает NewsService.updateLayout на каждый из трёх вьюпортов и показывает toast', () => {
    const fixture = TestBed.createComponent(AdminNewsPinnedPage);
    fixture.detectChanges();

    const newsService = TestBed.inject(NewsService);
    const notificationService = TestBed.inject(NotificationService);
    const updateLayoutSpy = vi.spyOn(newsService, 'updateLayout');
    const showSpy = vi.spyOn(notificationService, 'show');

    const layout: PinnedGridLayout = {
      config: { columns: 4, rows: 16 },
      slots: [{ newsId: 'news-a', colStart: 1, rowStart: 1, colSpan: 3, rowSpan: 12, style: DEFAULT_CARD_STYLE, coverImageUrl: null }],
    };
    const payload: Record<PinnedGridViewport, PinnedGridLayout> = { small: layout, middle: layout, large: layout };
    fixture.componentInstance['onSave'](payload);

    expect(updateLayoutSpy).toHaveBeenCalledWith('small', layout);
    expect(updateLayoutSpy).toHaveBeenCalledWith('middle', layout);
    expect(updateLayoutSpy).toHaveBeenCalledWith('large', layout);
    expect(showSpy).toHaveBeenCalledWith('Раскладка сохранена', 'success');
  });
});
