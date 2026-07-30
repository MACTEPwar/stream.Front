import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { NewsCard, NewsCardVariant } from './news-card';

const ITEM: NewsItem = {
  id: 'news-1',
  title: 'Lorem ipsum dolor sit amet consectetur.',
  excerpt: 'Lorem ipsum dolor sit amet consectetur. Enim ultricies varius iaculis.',
  imageUrl: '/images/main-carousel/slide-0-test.png',
  tagIds: ['tournament', 'mlbb'],
  views: 980,
  likes: 1400,
  publishedAt: new Date(2023, 11, 6),
};

const TAGS: NewsTag[] = [
  { id: 'tournament', name: 'Турнир', severity: 'danger' },
  { id: 'mlbb', name: 'MLBB', color: '#e6772e' },
];

@Component({
  selector: 'app-news-card-host',
  imports: [NewsCard],
  template: `<app-news-card [item]="item()" [tags]="tags()" [variant]="variant()" />`,
})
class NewsCardHost {
  readonly item = signal<NewsItem>(ITEM);
  readonly tags = signal<NewsTag[]>(TAGS);
  readonly variant = signal<NewsCardVariant>('featured');
}

describe('NewsCard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NewsCardHost] });
  });

  function createCard() {
    const fixture = TestBed.createComponent(NewsCardHost);
    fixture.detectChanges();
    return fixture;
  }

  it('рендерит заголовок, текст, дату и счётчики в формате макета', () => {
    const card = createCard().nativeElement as HTMLElement;

    expect(card.querySelector('.news-card__heading')?.textContent).toContain(ITEM.title);
    expect(card.querySelector('.news-card__excerpt')?.textContent).toContain(ITEM.excerpt);
    expect(card.querySelector('.news-card__date')?.textContent?.trim()).toBe('06.12.2023');

    const counters = card.querySelectorAll('.news-card__counter');
    expect(counters[0].textContent?.trim()).toBe('980');
    expect(counters[1].textContent?.trim()).toBe('1.4k');
  });

  it('рендерит по бейджу на каждый тег', () => {
    const card = createCard().nativeElement as HTMLElement;
    expect(card.querySelectorAll('app-badge').length).toBe(TAGS.length);
  });

  it('вариант отражается модификатором класса карточки', () => {
    const fixture = createCard();
    expect(fixture.nativeElement.querySelector('.news-card--featured')).not.toBeNull();

    fixture.componentInstance.variant.set('wide');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.news-card--featured')).toBeNull();
    expect(fixture.nativeElement.querySelector('.news-card--wide')).not.toBeNull();
  });

  it('без imageUrl картинка не рендерится — остаётся плейсхолдер-прямоугольник', () => {
    const fixture = createCard();
    fixture.componentInstance.item.set({ ...ITEM, imageUrl: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.news-card__picture')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.news-card__picture img')).toBeNull();
  });
});
