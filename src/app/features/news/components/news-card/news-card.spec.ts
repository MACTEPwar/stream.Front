import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Badge } from '@shared/components/badge/badge';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { DEFAULT_CARD_STYLE, PinnedNewsCardStyle } from '../../models/pinned-news-slot.model';
import { NewsCard } from './news-card';

const ITEM: NewsItem = {
  id: 'news-1',
  title: 'Lorem ipsum dolor sit amet consectetur.',
  excerpt: 'Lorem ipsum dolor sit amet consectetur. Enim ultricies varius iaculis.',
  imageUrl: '/images/main-carousel/slide-0-test.png',
  imageUrls: ['/images/main-carousel/slide-0-test.png'],
  tagIds: ['tournament', 'mlbb'],
  views: 980,
  likes: 1400,
  publishedAt: new Date(2023, 11, 6),
  viewedByCurrentUser: false,
  likedByCurrentUser: false,
};

const TAGS: NewsTag[] = [
  { id: 'tournament', name: 'Турнир', severity: 'danger' },
  { id: 'mlbb', name: 'MLBB', color: '#e6772e', textColor: '#ffffff' },
];

@Component({
  selector: 'app-news-card-host',
  imports: [NewsCard],
  template: `<app-news-card [item]="item()" [tags]="tags()" [cardStyle]="cardStyle()" />`,
})
class NewsCardHost {
  readonly item = signal<NewsItem>(ITEM);
  readonly tags = signal<NewsTag[]>(TAGS);
  readonly cardStyle = signal<PinnedNewsCardStyle>(DEFAULT_CARD_STYLE);
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

  it('прокидывает textColor тега в Badge', () => {
    const fixture = createCard();
    const badges = fixture.debugElement.queryAll(By.directive(Badge));

    expect(badges[1].componentInstance.textColor()).toBe('#ffffff');
  });

  it('карточка растягивается на 100% размера своей ячейки (нет фиксированного variant-модификатора)', () => {
    const fixture = createCard();
    const article = fixture.nativeElement.querySelector('.news-card') as HTMLElement;

    expect(article).not.toBeNull();
    expect(article.className.split(' ')).toEqual(['news-card']);
  });

  it('иконка лайка — pi-heart-fill при likedByCurrentUser: true, иначе pi-heart', () => {
    const fixture = createCard();
    const icon = () => fixture.nativeElement.querySelectorAll('.news-card__counter i')[1] as HTMLElement;

    expect(icon().className).toBe('pi pi-heart');

    fixture.componentInstance.item.set({ ...ITEM, likedByCurrentUser: true });
    fixture.detectChanges();

    expect(icon().className).toBe('pi pi-heart-fill');
  });

  it('без imageUrl картинка не рендерится — остаётся плейсхолдер-прямоугольник', () => {
    const fixture = createCard();
    fixture.componentInstance.item.set({ ...ITEM, imageUrl: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.news-card__picture')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.news-card__picture img')).toBeNull();
  });

  it('применяет style: фон/цвет текста/направление по imagePosition', () => {
    const fixture = createCard();
    fixture.componentInstance.cardStyle.set({
      imagePosition: 'left',
      imageSizePercent: 30,
      imageScale: 1.5,
      imageOffsetX: 20,
      imageOffsetY: 80,
      backgroundColor: '#123456',
      textColor: '#abcdef',
    });
    fixture.detectChanges();

    const article = fixture.nativeElement.querySelector('.news-card') as HTMLElement;
    expect(article.style.flexDirection).toBe('row');
    expect(article.style.background).toContain('rgb(18, 52, 86)');
    expect(article.style.color).toContain('rgb(171, 205, 239)');

    const picture = fixture.nativeElement.querySelector('.news-card__picture') as HTMLElement;
    expect(picture.style.flex).toBe('0 0 30%');

    const img = fixture.nativeElement.querySelector('.news-card__picture img') as HTMLElement;
    expect(img.style.transform).toBe('scale(1.5)');
    expect(img.style.objectPosition).toBe('20% 80%');
  });
});
