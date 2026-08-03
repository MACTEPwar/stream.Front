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
  images: [{ id: 'img-1', url: '/uploads/first.jpg', order: 1 }],
  tags: [{ id: 'tournament', name: 'Турнир', color: '#FF5733', textColor: '#FFFFFF', createdAt: '', updatedAt: '' }],
  hasNoImage: false,
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
    markViewed.mockReturnValue(of({ viewCount: 5301, viewedByCurrentUser: true } satisfies ViewResponse));
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
    expect((fixture.nativeElement as HTMLElement).querySelector('.news-detail-modal__title')).not.toBeNull();
    consoleError.mockRestore();
  });
});
