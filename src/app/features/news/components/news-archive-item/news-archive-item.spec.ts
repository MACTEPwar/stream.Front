import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AdminNews } from '@features/admin/models/news.model';

import { NewsArchiveItem } from './news-archive-item';

const ITEM: AdminNews = {
  id: 'archive-1',
  title: 'Lorem ipsum dolor sit amet consectetur.',
  description: 'Lorem ipsum dolor sit amet consectetur. Enim ultricies varius iaculis.',
  publishedAt: '2023-12-06T00:00:00.000Z',
  viewCount: 5300,
  likeCount: 44,
  likedByCurrentUser: false,
  viewedByCurrentUser: false,
  images: [
    { id: 'img-2', url: '/uploads/second.jpg', order: 2, focalX: null, focalY: null },
    { id: 'img-1', url: '/uploads/first.jpg', order: 1, focalX: null, focalY: null },
  ],
  tags: [{ id: 'tournament', name: 'Турнир', color: '#FF5733', textColor: '#FFFFFF', createdAt: '', updatedAt: '' }],
  cover: { type: 'none', url: null, focalPoint: null },
  createdAt: '',
  updatedAt: '',
};

@Component({
  selector: 'app-news-archive-item-host',
  imports: [NewsArchiveItem],
  template: `<app-news-archive-item
    [item]="item()"
    (likeToggle)="lastLikeToggle.set($event)"
    (openDetail)="openDetailCount.set(openDetailCount() + 1)"
  />`,
})
class NewsArchiveItemHost {
  readonly item = signal<AdminNews>(ITEM);
  readonly lastLikeToggle = signal<boolean | null>(null);
  readonly openDetailCount = signal(0);
}

describe('NewsArchiveItem', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NewsArchiveItemHost] });
  });

  function createItem() {
    const fixture = TestBed.createComponent(NewsArchiveItemHost);
    fixture.detectChanges();
    return fixture;
  }

  it('рендерит заголовок, текст, дату и счётчики в формате макета', () => {
    const host = createItem().nativeElement as HTMLElement;

    expect(host.querySelector('.news-archive-item__heading')?.textContent).toContain(ITEM.title);
    expect(host.querySelector('.news-archive-item__excerpt')?.textContent).toContain(ITEM.description);
    expect(host.querySelector('.news-archive-item__date')?.textContent?.trim()).toBe('06.12.2023');

    const views = host.querySelector('.news-archive-item__counter-checkbox--readonly');
    expect(views?.textContent?.trim()).toBe('5.3k');

    const likes = host.querySelector(
      '.news-archive-item__counter-checkbox:not(.news-archive-item__counter-checkbox--readonly)',
    );
    expect(likes?.textContent?.trim()).toBe('44');
  });

  it('рисует картинку первой по order, а не первой в массиве', () => {
    const host = createItem().nativeElement as HTMLElement;
    const img = host.querySelector<HTMLImageElement>('.news-archive-item__picture img');

    expect(img?.src).toContain('/uploads/first.jpg');
  });

  it('бейджи тегов рендерятся поверх превью', () => {
    const host = createItem().nativeElement as HTMLElement;
    const tags = host.querySelector('.news-archive-item__picture .news-archive-item__tags');

    expect(tags).not.toBeNull();
    expect(tags?.querySelectorAll('app-badge').length).toBe(ITEM.tags.length);
  });

  it('эмитит likeToggle с противоположным текущему likedByCurrentUser состоянием при клике', async () => {
    const fixture = createItem();
    const host = fixture.nativeElement as HTMLElement;
    const checkboxInput = host.querySelector<HTMLInputElement>(
      '.news-archive-item__counter-checkbox:not(.news-archive-item__counter-checkbox--readonly) .p-checkbox-input',
    );

    checkboxInput?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastLikeToggle()).toBe(true);
  });

  it('чекбокс просмотров отражает viewedByCurrentUser', () => {
    const fixture = createItem();
    const checkedLabel = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.news-archive-item__counter-checkbox--readonly .checkbox--checked');

    expect(checkedLabel()).toBeNull();

    fixture.componentInstance.item.set({ ...ITEM, viewedByCurrentUser: true });
    fixture.detectChanges();

    expect(checkedLabel()).not.toBeNull();
  });

  it('иконка лайка — pi-heart-fill при likedByCurrentUser: true, иначе pi-heart', () => {
    const fixture = createItem();
    const icon = () =>
      (fixture.nativeElement as HTMLElement).querySelector(
        '.news-archive-item__counter-checkbox:not(.news-archive-item__counter-checkbox--readonly) i',
      ) as HTMLElement;

    expect(icon().className).toBe('pi pi-heart');

    fixture.componentInstance.item.set({ ...ITEM, likedByCurrentUser: true });
    fixture.detectChanges();

    expect(icon().className).toBe('pi pi-heart-fill');
  });

  it('клик по картинке/тексту эмитит openDetail, клик по чекбоксам — нет', () => {
    const fixture = createItem();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector<HTMLElement>('.news-archive-item__picture')?.click();
    expect(fixture.componentInstance.openDetailCount()).toBe(1);

    host.querySelector<HTMLElement>('.news-archive-item__text')?.click();
    expect(fixture.componentInstance.openDetailCount()).toBe(2);

    host.querySelector<HTMLElement>('.news-archive-item__data')?.click();
    expect(fixture.componentInstance.openDetailCount()).toBe(2);
  });
});
