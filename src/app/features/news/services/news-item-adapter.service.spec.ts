import { TestBed } from '@angular/core/testing';

import { ImageUrlService } from '@core/services/image-url.service';
import { AdminNews, AdminNewsTag } from '@features/admin/models/news.model';

import { NewsItemAdapterService } from './news-item-adapter.service';

function adminNews(overrides: Partial<AdminNews> = {}): AdminNews {
  return {
    id: 'n1',
    title: 'Заголовок',
    description: 'Описание',
    publishedAt: '2023-12-06T00:00:00.000Z',
    viewCount: 100,
    likeCount: 10,
    likedByCurrentUser: null,
    viewedByCurrentUser: null,
    images: [],
    tags: [],
    cover: { type: 'none', url: null, focalPoint: null, variants: [] },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function adminTag(overrides: Partial<AdminNewsTag> = {}): AdminNewsTag {
  return {
    id: 't1',
    name: 'Турнир',
    color: '#ff0000',
    textColor: '#ffffff',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('NewsItemAdapterService', () => {
  let service: NewsItemAdapterService;
  let resolve: ReturnType<typeof vi.fn<ImageUrlService['resolve']>>;

  beforeEach(() => {
    resolve = vi.fn<ImageUrlService['resolve']>((path) => `resolved:${path}`);
    TestBed.configureTestingModule({
      providers: [{ provide: ImageUrlService, useValue: { resolve } }],
    });
    service = TestBed.inject(NewsItemAdapterService);
  });

  describe('toNewsItem', () => {
    it('маппит поля AdminNews в NewsItem', () => {
      const admin = adminNews({
        title: 'Заголовок',
        description: 'Описание',
        tags: [adminTag({ id: 't1' }), adminTag({ id: 't2' })],
        viewCount: 42,
        likeCount: 7,
        likedByCurrentUser: true,
      });

      const item = service.toNewsItem(admin);

      expect(item.id).toBe(admin.id);
      expect(item.title).toBe('Заголовок');
      expect(item.excerpt).toBe('Описание');
      expect(item.tagIds).toEqual(['t1', 't2']);
      expect(item.views).toBe(42);
      expect(item.likes).toBe(7);
      expect(item.publishedAt).toEqual(new Date(admin.publishedAt));
      expect(item.viewedByCurrentUser).toBe(false);
      expect(item.likedByCurrentUser).toBe(true);
    });

    it('likedByCurrentUser: null трактуется как false', () => {
      const item = service.toNewsItem(adminNews({ likedByCurrentUser: null }));
      expect(item.likedByCurrentUser).toBe(false);
    });

    it('viewedByCurrentUser маппится из AdminNews, null трактуется как false', () => {
      expect(service.toNewsItem(adminNews({ viewedByCurrentUser: true })).viewedByCurrentUser).toBe(
        true,
      );
      expect(service.toNewsItem(adminNews({ viewedByCurrentUser: null })).viewedByCurrentUser).toBe(
        false,
      );
    });

    it('без картинок imageUrl — null, imageUrls — пустой массив', () => {
      const item = service.toNewsItem(adminNews({ images: [] }));

      expect(item.imageUrl).toBeNull();
      expect(item.imageUrls).toEqual([]);
    });

    it('сортирует картинки по order и резолвит их через ImageUrlService', () => {
      const admin = adminNews({
        images: [
          {
            id: 'img-2',
            url: '/uploads/2.png',
            order: 2,
            focalX: null,
            focalY: null,
            variants: [],
          },
          { id: 'img-1', url: '/uploads/1.png', order: 1, focalX: 30, focalY: 40, variants: [] },
        ],
      });

      const item = service.toNewsItem(admin);

      expect(resolve).toHaveBeenCalledWith('/uploads/1.png');
      expect(resolve).toHaveBeenCalledWith('/uploads/2.png');
      expect(item.imageUrls).toEqual(['resolved:/uploads/1.png', 'resolved:/uploads/2.png']);
      expect(item.images).toEqual([
        { id: 'img-1', url: 'resolved:/uploads/1.png', focalX: 30, focalY: 40, variants: [] },
        { id: 'img-2', url: 'resolved:/uploads/2.png', focalX: null, focalY: null, variants: [] },
      ]);
    });

    it('резолвит url каждого размерного варианта картинки/обложки (stream.Front#130)', () => {
      const admin = adminNews({
        images: [
          {
            id: 'img-1',
            url: '/uploads/1.png',
            order: 1,
            focalX: null,
            focalY: null,
            variants: [
              { width: 175, url: '/uploads/1-175w.png' },
              { width: 330, url: '/uploads/1-330w.png' },
            ],
          },
        ],
        cover: {
          type: 'image',
          url: '/uploads/1.png',
          focalPoint: null,
          variants: [{ width: 175, url: '/uploads/1-175w.png' }],
        },
      });

      const item = service.toNewsItem(admin);

      expect(item.images[0].variants).toEqual([
        { width: 175, url: 'resolved:/uploads/1-175w.png' },
        { width: 330, url: 'resolved:/uploads/1-330w.png' },
      ]);
      expect(item.cover.variants).toEqual([{ width: 175, url: 'resolved:/uploads/1-175w.png' }]);
    });

    it('imageUrl — ОБЛОЖКА новости, а не первая картинка набора (stream.Front#137)', () => {
      const admin = adminNews({
        images: [
          {
            id: 'img-1',
            url: '/uploads/1.png',
            order: 1,
            focalX: null,
            focalY: null,
            variants: [],
          },
          {
            id: 'img-2',
            url: '/uploads/2.png',
            order: 2,
            focalX: null,
            focalY: null,
            variants: [],
          },
        ],
        cover: { type: 'image', url: '/uploads/2.png', focalPoint: { x: 70, y: 30 }, variants: [] },
      });

      const item = service.toNewsItem(admin);

      expect(item.imageUrl).toBe('resolved:/uploads/2.png');
      expect(item.cover).toEqual({
        type: 'image',
        url: 'resolved:/uploads/2.png',
        focalPoint: { x: 70, y: 30 },
        variants: [],
      });
    });

    it('без обложки картинки нет вовсе — первая её не подменяет (ОБЛ-О-05)', () => {
      const admin = adminNews({
        images: [
          {
            id: 'img-1',
            url: '/uploads/1.png',
            order: 1,
            focalX: null,
            focalY: null,
            variants: [],
          },
        ],
        cover: { type: 'none', url: null, focalPoint: null, variants: [] },
      });

      const item = service.toNewsItem(admin);

      expect(item.imageUrl).toBeNull();
      expect(item.imageUrls).toEqual(['resolved:/uploads/1.png']);
    });
  });

  describe('toNewsTag', () => {
    it('маппит id/name/color/textColor и не переносит серверные поля', () => {
      const tag = adminTag({ id: 't1', name: 'Турнир', color: '#ff0000', textColor: '#ffffff' });

      expect(service.toNewsTag(tag)).toEqual({
        id: 't1',
        name: 'Турнир',
        color: '#ff0000',
        textColor: '#ffffff',
      });
    });
  });
});
