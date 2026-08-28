import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { AdminNews } from '../../models/news.model';
import { AdminNewsService } from '../../services/admin-news.service';
import {
  DEFAULT_CARD_STYLE,
  PinnedGridLayout,
  PinnedGridViewport,
} from '../../../news/models/pinned-news-slot.model';
import { PinnedGridService } from '../../../news/services/pinned-grid.service';
import { AdminNewsPinnedPage } from './admin-news-pinned-page';

const PINNED_CONTENT = {
  title: 'Заголовок закреплённой',
  description: 'Описание закреплённой',
  publishedAt: '2023-12-06T00:00:00.000Z',
  viewCount: 100,
  likeCount: 10,
  likedByCurrentUser: false,
  viewedByCurrentUser: false,
  tags: [],
};

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
    cover: { type: 'none', url: null, focalPoint: null, variants: [] },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const emptyLayout: PinnedGridLayout = { config: { columns: 3, rows: 12 }, slots: [] };

function pinnedLayout(newsId: string): PinnedGridLayout {
  return {
    config: { columns: 3, rows: 12 },
    slots: [
      {
        newsId,
        colStart: 1,
        rowStart: 1,
        colSpan: 1,
        rowSpan: 7,
        style: DEFAULT_CARD_STYLE,
        cover: { type: 'none', url: null, focalPoint: null, variants: [] },
        news: PINNED_CONTENT,
      },
    ],
  };
}

describe('AdminNewsPinnedPage', () => {
  let getAllSpy: ReturnType<typeof vi.fn>;
  let getLayoutSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAllSpy = vi.fn().mockReturnValue(
      of({
        items: [
          adminNews('news-a'),
          adminNews('news-b', {
            images: [
              {
                id: 'img-2',
                url: '/uploads/2.png',
                order: 2,
                focalX: null,
                focalY: null,
                variants: [],
              },
              {
                id: 'img-1',
                url: '/uploads/1.png',
                order: 1,
                focalX: null,
                focalY: null,
                variants: [],
              },
            ],
          }),
        ],
        meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
      }),
    );
    getLayoutSpy = vi.fn((viewport: PinnedGridViewport) => of(pinnedLayout(`news-a-${viewport}`)));

    TestBed.configureTestingModule({
      imports: [AdminNewsPinnedPage],
      providers: [
        { provide: AdminNewsService, useValue: { getAll: getAllSpy } },
        {
          provide: PinnedGridService,
          useValue: { getLayout: getLayoutSpy, updateLayout: vi.fn() },
        },
      ],
    });
  });

  it('грузит справочник новостей через AdminNewsService и раскладки обоих вьюпортов через PinnedGridService', () => {
    const fixture = TestBed.createComponent(AdminNewsPinnedPage);
    fixture.detectChanges();

    expect(fixture.componentInstance['hasError']()).toBe(false);
    expect(getAllSpy).toHaveBeenCalledWith(1, 100);
    expect(getLayoutSpy).toHaveBeenCalledWith('small');
    expect(getLayoutSpy).toHaveBeenCalledWith('large');

    const layouts = fixture.componentInstance['layouts']();
    expect(layouts.small.slots[0].newsId).toBe('news-a-small');
    expect(layouts.large.slots[0].newsId).toBe('news-a-large');
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
    // imageUrl — обложка новости, а не первая картинка набора
    // (stream.Front#137); у этой фикстуры обложки нет
    expect(withImages?.imageUrl).toBeNull();
    expect(withImages?.imageUrls.map((url) => url.split('/uploads/')[1])).toEqual([
      '1.png',
      '2.png',
    ]);
  });

  it('«save» из редактора вызывает PinnedGridService.updateLayout на каждый из двух вьюпортов и показывает toast', () => {
    const fixture = TestBed.createComponent(AdminNewsPinnedPage);
    fixture.detectChanges();

    const pinnedGridService = TestBed.inject(PinnedGridService);
    const notificationService = TestBed.inject(NotificationService);
    vi.spyOn(pinnedGridService, 'updateLayout').mockReturnValue(of(emptyLayout));
    const showSpy = vi.spyOn(notificationService, 'show');

    const layout: PinnedGridLayout = {
      config: { columns: 4, rows: 16 },
      slots: [
        {
          newsId: 'news-a',
          colStart: 1,
          rowStart: 1,
          colSpan: 3,
          rowSpan: 12,
          style: DEFAULT_CARD_STYLE,
          cover: { type: 'none', url: null, focalPoint: null, variants: [] },
          news: PINNED_CONTENT,
        },
      ],
    };
    const payload: Record<PinnedGridViewport, PinnedGridLayout> = { small: layout, large: layout };
    fixture.componentInstance['onSave'](payload);

    expect(pinnedGridService.updateLayout).toHaveBeenCalledWith('small', layout);
    expect(pinnedGridService.updateLayout).toHaveBeenCalledWith('large', layout);
    expect(showSpy).toHaveBeenCalledWith('Раскладка сохранена', 'success');
  });

  it('«save» показывает error-тост и не сбрасывает редактор, если updateLayout падает', () => {
    const fixture = TestBed.createComponent(AdminNewsPinnedPage);
    fixture.detectChanges();

    const pinnedGridService = TestBed.inject(PinnedGridService);
    const notificationService = TestBed.inject(NotificationService);
    vi.spyOn(pinnedGridService, 'updateLayout').mockReturnValue(
      throwError(() => ({ error: { message: 'Некорректная раскладка' } })),
    );
    const showSpy = vi.spyOn(notificationService, 'show');

    const layout: PinnedGridLayout = {
      config: { columns: 4, rows: 16 },
      slots: [
        {
          newsId: 'news-a',
          colStart: 1,
          rowStart: 1,
          colSpan: 3,
          rowSpan: 12,
          style: DEFAULT_CARD_STYLE,
          cover: { type: 'none', url: null, focalPoint: null, variants: [] },
          news: PINNED_CONTENT,
        },
      ],
    };
    const payload: Record<PinnedGridViewport, PinnedGridLayout> = { small: layout, large: layout };
    fixture.componentInstance['onSave'](payload);

    expect(showSpy).toHaveBeenCalledWith('Некорректная раскладка', 'error');
    expect(fixture.nativeElement.querySelector('app-pinned-grid-editor')).not.toBeNull();
  });
});
