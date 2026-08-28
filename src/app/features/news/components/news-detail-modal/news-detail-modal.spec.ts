import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AdminNews } from '@features/admin/models/news.model';

import { NewsArchiveService, ViewResponse } from '../../services/news-archive.service';
import { NewsDetailModal, NewsDetailModalData } from './news-detail-modal';

const ITEM: AdminNews = {
  id: 'archive-1',
  title: 'Заголовок новости',
  description: 'Полный текст новости.',
  publishedAt: '2023-12-06T00:00:00.000Z',
  viewCount: 5300,
  likeCount: 44,
  likedByCurrentUser: false,
  viewedByCurrentUser: false,
  images: [
    { id: 'img-1', url: '/uploads/first.jpg', order: 1, focalX: null, focalY: null, variants: [] },
  ],
  tags: [
    {
      id: 'tournament',
      name: 'Турнир',
      color: '#FF5733',
      textColor: '#FFFFFF',
      createdAt: '',
      updatedAt: '',
    },
  ],
  cover: { type: 'none', url: null, focalPoint: null, variants: [] },
  createdAt: '',
  updatedAt: '',
};

@Component({
  selector: 'app-news-detail-modal-host',
  imports: [NewsDetailModal],
  template: `<app-news-detail-modal [data]="data()" />`,
})
class NewsDetailModalHost {
  readonly data = signal<NewsDetailModalData>({ item: ITEM });
}

describe('NewsDetailModal', () => {
  let markViewed: ReturnType<typeof vi.fn<NewsArchiveService['markViewed']>>;

  beforeEach(() => {
    markViewed = vi.fn<NewsArchiveService['markViewed']>();
    TestBed.configureTestingModule({
      imports: [NewsDetailModalHost],
      providers: [{ provide: NewsArchiveService, useValue: { markViewed } }],
    });
  });

  function createModal(data: NewsDetailModalData) {
    markViewed.mockReturnValue(
      of({ viewCount: 5301, viewedByCurrentUser: true } satisfies ViewResponse),
    );
    const fixture = TestBed.createComponent(NewsDetailModalHost);
    fixture.componentInstance.data.set(data);
    fixture.detectChanges();
    return fixture;
  }

  it('рендерит заголовок, текст, теги и дату', () => {
    const fixture = createModal({ item: ITEM });
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.news-detail-modal__title')?.textContent).toContain(ITEM.title);
    expect(host.querySelector('.news-detail-modal__text')?.textContent).toContain(ITEM.description);
    expect(host.querySelector('.news-detail-modal__date')?.textContent?.trim()).toBe('06.12.2023');
    expect(host.querySelectorAll('app-badge').length).toBe(ITEM.tags.length);
  });

  it('вызывает markViewed при открытии, если ещё не просмотрено, и пробрасывает патч в onViewed', () => {
    const onViewed = vi.fn();
    createModal({ item: ITEM, onViewed });

    expect(markViewed).toHaveBeenCalledWith('archive-1');
    expect(onViewed).toHaveBeenCalledWith({ viewCount: 5301, viewedByCurrentUser: true });
  });

  it('не вызывает markViewed повторно, если уже viewedByCurrentUser: true', () => {
    createModal({ item: { ...ITEM, viewedByCurrentUser: true } });

    expect(markViewed).not.toHaveBeenCalled();
  });

  it('ошибку markViewed логирует в консоль и не роняет модалку', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    markViewed.mockReturnValue(throwError(() => new Error('network')));

    const fixture = TestBed.createComponent(NewsDetailModalHost);
    fixture.componentInstance.data.set({ item: ITEM });
    fixture.detectChanges();

    expect(consoleError).toHaveBeenCalled();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.news-detail-modal__title'),
    ).not.toBeNull();
    consoleError.mockRestore();
  });

  it('изображение не обрезается — object-fit: contain, не cover (КАР-Ф-04)', () => {
    const fixture = createModal({ item: ITEM });
    const img = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      '.news-detail-modal__picture img',
    );

    expect(img).not.toBeNull();
    expect(getComputedStyle(img as HTMLImageElement).objectFit).toBe('contain');
  });

  it('изображение, не загрузившееся с ошибкой, ведёт себя как отсутствующее (АДП-Ф-32)', () => {
    const fixture = createModal({ item: ITEM });
    const host = fixture.nativeElement as HTMLElement;
    const img = host.querySelector<HTMLImageElement>('.news-detail-modal__picture img');

    img?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(host.querySelector('.news-detail-modal__picture img')).toBeNull();
  });

  describe('выбор размерного варианта по месту показа (stream.Front#130)', () => {
    // `.news-detail-modal__picture` сама по себе гибкая (`min(1200px, 86vw)`
    // на десктопе / фикс. `200px` на `bp.small`) — реальная ширина измеряется
    // `ResizeObserver`'ом, не пересчитывается из CSS-формул. Тот же приём
    // фейка, что у `NewsCard`/`SectionTitle`.
    class FakeResizeObserver {
      static instances: FakeResizeObserver[] = [];
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        FakeResizeObserver.instances.push(this);
      }

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      observe(): void {}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      disconnect(): void {}

      trigger(width: number): void {
        this.callback(
          [{ contentRect: { width } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
    }

    let originalResizeObserver: typeof ResizeObserver | undefined;

    beforeEach(() => {
      originalResizeObserver = globalThis.ResizeObserver;
      FakeResizeObserver.instances = [];
      globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      globalThis.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
    });

    const ITEM_WITH_VARIANTS: AdminNews = {
      ...ITEM,
      images: [
        {
          id: 'img-1',
          url: '/uploads/first.jpg',
          order: 1,
          focalX: null,
          focalY: null,
          variants: [
            { width: 480, url: '/uploads/first-480w.jpg' },
            { width: 720, url: '/uploads/first-720w.jpg' },
          ],
        },
      ],
    };

    it('выбирает вариант по реально измеренной ширине блока картинки', () => {
      const fixture = createModal({ item: ITEM_WITH_VARIANTS });
      FakeResizeObserver.instances[0]?.trigger(500);
      fixture.detectChanges();

      const img = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
        '.news-detail-modal__picture img',
      );
      expect(img?.src).toContain('/uploads/first-720w.jpg');
    });

    it('пока ширина не измерена — используется оригинал', () => {
      const fixture = createModal({ item: ITEM_WITH_VARIANTS });

      const img = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
        '.news-detail-modal__picture img',
      );
      expect(img?.src).toContain('/uploads/first.jpg');
      expect(img?.src).not.toContain('480w');
      expect(img?.src).not.toContain('720w');
    });
  });
});
