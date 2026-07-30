import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { NewsArchiveItem } from './news-archive-item';

const ITEM: NewsItem = {
  id: 'archive-1',
  title: 'Lorem ipsum dolor sit amet consectetur.',
  excerpt: 'Lorem ipsum dolor sit amet consectetur. Enim ultricies varius iaculis.',
  imageUrl: null,
  tagIds: ['tournament'],
  views: 5300,
  likes: 44,
  publishedAt: new Date(2023, 11, 6),
  viewedByCurrentUser: false,
  likedByCurrentUser: false,
};

const TAGS: NewsTag[] = [{ id: 'tournament', name: 'Турнир', severity: 'danger' }];

@Component({
  selector: 'app-news-archive-item-host',
  imports: [NewsArchiveItem],
  template: `<app-news-archive-item [item]="item()" [tags]="tags()" />`,
})
class NewsArchiveItemHost {
  readonly item = signal<NewsItem>(ITEM);
  readonly tags = signal<NewsTag[]>(TAGS);
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
    expect(host.querySelector('.news-archive-item__excerpt')?.textContent).toContain(ITEM.excerpt);
    expect(host.querySelector('.news-archive-item__date')?.textContent?.trim()).toBe('06.12.2023');

    const counters = host.querySelectorAll('.news-archive-item__counter');
    expect(counters[0].textContent?.trim()).toBe('5.3k');
    expect(counters[1].textContent?.trim()).toBe('44');
  });

  it('бейджи тегов рендерятся поверх превью', () => {
    const host = createItem().nativeElement as HTMLElement;
    const tags = host.querySelector('.news-archive-item__picture .news-archive-item__tags');

    expect(tags).not.toBeNull();
    expect(tags?.querySelectorAll('app-badge').length).toBe(TAGS.length);
  });
});
