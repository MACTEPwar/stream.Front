import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Badge } from '@shared/components/badge/badge';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import {
  DEFAULT_CARD_STYLE,
  FocalPoint,
  PinnedNewsCardStyle,
} from '../../models/pinned-news-slot.model';
import { NewsCard } from './news-card';

const ITEM: NewsItem = {
  id: 'news-1',
  title: 'Lorem ipsum dolor sit amet consectetur.',
  excerpt: 'Lorem ipsum dolor sit amet consectetur. Enim ultricies varius iaculis.',
  cover: {
    type: 'image',
    url: '/images/main-carousel/slide-0-test.png',
    focalPoint: null,
    variants: [],
  },
  imageUrl: '/images/main-carousel/slide-0-test.png',
  imageUrls: ['/images/main-carousel/slide-0-test.png'],
  images: [],
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
  template: `<app-news-card
    [item]="item()"
    [tags]="tags()"
    [cardStyle]="cardStyle()"
    [focalPoint]="focalPoint()"
  />`,
})
class NewsCardHost {
  readonly item = signal<NewsItem>(ITEM);
  readonly tags = signal<NewsTag[]>(TAGS);
  readonly cardStyle = signal<PinnedNewsCardStyle>(DEFAULT_CARD_STYLE);
  readonly focalPoint = signal<FocalPoint | null>(null);
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
    const icon = () =>
      fixture.nativeElement.querySelectorAll('.news-card__counter i')[1] as HTMLElement;

    expect(icon().className).toBe('pi pi-heart');

    fixture.componentInstance.item.set({ ...ITEM, likedByCurrentUser: true });
    fixture.detectChanges();

    expect(icon().className).toBe('pi pi-heart-fill');
  });

  it('без imageUrl картинка не рендерится, а место под неё не резервируется — текст занимает всю площадь (ЗАК-Ф-05)', () => {
    const fixture = createCard();
    fixture.componentInstance.item.set({ ...ITEM, imageUrl: null });
    fixture.detectChanges();

    const picture = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.news-card__picture',
    );
    expect(picture).not.toBeNull();
    expect(picture?.querySelector('img')).toBeNull();
    expect(picture?.style.flex).toBe('0 0 0%');
  });

  it('с imageUrl место под картинку резервируется по imageSizePercent из стиля', () => {
    const fixture = createCard();
    fixture.detectChanges();

    const picture = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.news-card__picture',
    );
    expect(picture?.style.flex).toBe(`0 0 ${DEFAULT_CARD_STYLE.imageSizePercent}%`);
  });

  it('применяет style: фон/цвет текста/направление по imagePosition', () => {
    const fixture = createCard();
    fixture.componentInstance.cardStyle.set({
      imagePosition: 'left',
      imageSizePercent: 30,
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
  });

  it('без focalPoint картинка держит центр 50/50', () => {
    const fixture = createCard();

    const img = fixture.nativeElement.querySelector('.news-card__picture img') as HTMLElement;
    expect(img.style.objectPosition).toBe('50% 50%');
  });

  it('focalPoint переопределяет object-position картинки', () => {
    const fixture = createCard();
    fixture.componentInstance.focalPoint.set({ x: 20, y: 80 });
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.news-card__picture img') as HTMLElement;
    expect(img.style.objectPosition).toBe('20% 80%');
  });

  it('изображение, не загрузившееся с ошибкой, ведёт себя как отсутствующее (ЗАК-Ф-18)', () => {
    const fixture = createCard();
    const img = fixture.nativeElement.querySelector('.news-card__picture img') as HTMLElement;

    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const picture = fixture.nativeElement.querySelector('.news-card__picture') as HTMLElement;
    expect(picture.querySelector('img')).toBeNull();
    expect(picture.style.flex).toBe('0 0 0%');
  });

  describe('режим подложки (ЗАК-Ф-12—ЗАК-Ф-15)', () => {
    // jsdom не реализует ResizeObserver — news-card.ts это учитывает (`typeof
    // ResizeObserver === 'undefined'` guard, режим подложки остаётся выключен
    // по умолчанию, см. тест "без ResizeObserver" ниже). Подмена глобального
    // ResizeObserver фейком и ручной триггер коллбэка — тот же общий приём,
    // что в `section-title.spec.ts`, но с шириной И высотой сразу (порог
    // считается по оси, зависящей от imagePosition).
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

      trigger(width: number, height: number): void {
        this.callback(
          [{ contentRect: { width, height } } as ResizeObserverEntry],
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

    it('без ResizeObserver в окружении — обычный вид по умолчанию', () => {
      globalThis.ResizeObserver = undefined as unknown as typeof ResizeObserver;
      const fixture = createCard();

      const article = fixture.nativeElement.querySelector('.news-card') as HTMLElement;
      expect(article.classList).not.toContain('news-card--quilt');
    });

    it('пока обеим долям хватает минимума — обычный вид, доля картинки по imageSizePercent', () => {
      const fixture = createCard();
      // imagePosition: 'top' (DEFAULT_CARD_STYLE) → ось высоты. 50% — доля
      // картинки. 400×400: картинка 200px (≥96), текст 200px (≥64).
      FakeResizeObserver.instances[0]?.trigger(400, 400);
      fixture.detectChanges();

      const article = fixture.nativeElement.querySelector('.news-card') as HTMLElement;
      expect(article.classList).not.toContain('news-card--quilt');
    });

    it('доле картинки не хватает 96px — переход в режим подложки', () => {
      const fixture = createCard();
      // 50% от 180 = 90 < 96.
      FakeResizeObserver.instances[0]?.trigger(400, 180);
      fixture.detectChanges();

      const article = fixture.nativeElement.querySelector('.news-card') as HTMLElement;
      expect(article.classList).toContain('news-card--quilt');
    });

    it('доле текста не хватает 64px — переход в режим подложки, даже если картинке хватает', () => {
      const fixture = createCard();
      fixture.componentInstance.cardStyle.set({ ...DEFAULT_CARD_STYLE, imageSizePercent: 90 });
      // 90% от 400 = 360 (картинке хватает), 10% от 400 = 40 < 64 (тексту нет).
      fixture.detectChanges();
      FakeResizeObserver.instances[0]?.trigger(400, 400);
      fixture.detectChanges();

      const article = fixture.nativeElement.querySelector('.news-card') as HTMLElement;
      expect(article.classList).toContain('news-card--quilt');
    });

    it('порог считается по оси, которую делит imagePosition: left/right — ширина, а не высота', () => {
      const fixture = createCard();
      fixture.componentInstance.cardStyle.set({ ...DEFAULT_CARD_STYLE, imagePosition: 'left' });
      fixture.detectChanges();
      // Высота маленькая (не должна влиять), ширина большая (должна) — не подложка.
      FakeResizeObserver.instances[0]?.trigger(400, 50);
      fixture.detectChanges();

      const article = fixture.nativeElement.querySelector('.news-card') as HTMLElement;
      expect(article.classList).not.toContain('news-card--quilt');
    });

    it('без изображения режим подложки не включается — уже покрыто отдельным сценарием "без обложки"', () => {
      const fixture = createCard();
      fixture.componentInstance.item.set({ ...ITEM, imageUrl: null });
      fixture.detectChanges();
      FakeResizeObserver.instances[0]?.trigger(50, 50);
      fixture.detectChanges();

      const article = fixture.nativeElement.querySelector('.news-card') as HTMLElement;
      expect(article.classList).not.toContain('news-card--quilt');
    });

    it('в режиме подложки картинка растянута на всю карточку, а описание скрыто (заголовок — нет)', () => {
      const fixture = createCard();
      FakeResizeObserver.instances[0]?.trigger(400, 180);
      fixture.detectChanges();

      const picture = fixture.nativeElement.querySelector('.news-card__picture') as HTMLElement;
      // `flex: none` — валидный shorthand для `0 0 auto`; jsdom сериализует
      // `CSSStyleDeclaration` в развёрнутом виде, тот же эффект.
      expect(picture.style.flex).toBe('0 0 auto');
      expect(fixture.nativeElement.querySelector('.news-card__heading')?.textContent).toContain(
        ITEM.title,
      );
      expect(fixture.nativeElement.querySelector('.news-card__excerpt')).toBeNull();
    });

    it('заголовок прижат к низу текстового блока — в плотной зоне градиента подложки, не у прозрачного края (a11y-review)', () => {
      const fixture = createCard();
      FakeResizeObserver.instances[0]?.trigger(400, 180);
      fixture.detectChanges();

      const text = fixture.nativeElement.querySelector('.news-card__text') as HTMLElement;
      expect(getComputedStyle(text).justifyContent).toBe('flex-end');
    });

    it('подложка под текст строится под цвет текста: тёмный текст → светлая подложка, светлый текст → тёмная', () => {
      const fixture = createCard();
      fixture.componentInstance.cardStyle.set({ ...DEFAULT_CARD_STYLE, textColor: '#1e1e1e' });
      fixture.detectChanges();
      FakeResizeObserver.instances[0]?.trigger(400, 180);
      fixture.detectChanges();

      let body = fixture.nativeElement.querySelector('.news-card__body') as HTMLElement;
      expect(body.style.background).toContain('255, 255, 255');

      fixture.componentInstance.cardStyle.set({ ...DEFAULT_CARD_STYLE, textColor: '#ffffff' });
      fixture.detectChanges();

      body = fixture.nativeElement.querySelector('.news-card__body') as HTMLElement;
      expect(body.style.background).toContain('0, 0, 0');
    });
  });

  describe('выбор размерного варианта по месту показа (stream.Front#130)', () => {
    // Тот же `FakeResizeObserver`, что и у режима подложки выше (тесты в
    // разных `describe` не делят состояние jsdom/TestBed) — здесь измерение
    // используется для другой цели: не порог перехода в подложку, а реальная
    // ширина блока картинки, от которой зависит выбор варианта.
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

      trigger(width: number, height: number): void {
        this.callback(
          [{ contentRect: { width, height } } as ResizeObserverEntry],
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

    const VARIANTS = [
      { width: 330, url: 'resolved:/uploads/cover-330w.jpg' },
      { width: 480, url: 'resolved:/uploads/cover-480w.jpg' },
      { width: 1030, url: 'resolved:/uploads/cover-1030w.jpg' },
    ];

    it('выбирает вариант по реально измеренной ширине блока картинки, не оригинал', () => {
      const fixture = createCard();
      fixture.componentInstance.item.set({ ...ITEM, cover: { ...ITEM.cover, variants: VARIANTS } });
      // top/imageSizePercent 50% — ширина картинки = вся ширина host (делится
      // только высота); 400px нужно ближайшему варианту не меньше этого — 480
      // (330 тесен), а не 1030 и тем более не оригинал.
      FakeResizeObserver.instances[0]?.trigger(400, 1000);
      fixture.detectChanges();

      const img = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('.news-card__picture img');
      expect(img?.src).toContain('/uploads/cover-480w.jpg');
    });

    it('без подходящего варианта — используется оригинал', () => {
      const fixture = createCard();
      fixture.componentInstance.item.set({ ...ITEM, cover: { ...ITEM.cover, variants: VARIANTS } });
      FakeResizeObserver.instances[0]?.trigger(2000, 1000);
      fixture.detectChanges();

      const img = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('.news-card__picture img');
      expect(img?.src).toContain(ITEM.imageUrl as string);
    });

    it('пока размер не измерен — используется оригинал (безопасный дефолт)', () => {
      const fixture = createCard();
      fixture.componentInstance.item.set({ ...ITEM, cover: { ...ITEM.cover, variants: VARIANTS } });
      fixture.detectChanges();

      const img = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('.news-card__picture img');
      expect(img?.src).toContain(ITEM.imageUrl as string);
    });
  });
});
