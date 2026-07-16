import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MainCarousel } from './main-carousel';

@Component({
  selector: 'app-main-carousel-host',
  imports: [MainCarousel],
  template: `
    <app-main-carousel imageUrl0="/bg-0.png" imageUrl1="/bg-1.png">
      <p mainCarouselSlide0BottomRight id="schedule">Расписание (заглушка)</p>
      <p mainCarouselSlide0BottomLeft id="social">Соц. сети (заглушка)</p>
      <p mainCarouselSlide1BottomLeft id="donators">Топ донатеров (заглушка)</p>
    </app-main-carousel>
  `,
})
class MainCarouselHost {}

describe('MainCarousel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MainCarouselHost] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('изначально активен слайд 0, прогресс 0', () => {
    const fixture = TestBed.createComponent(MainCarouselHost);
    fixture.detectChanges();

    const carousel = fixture.debugElement.children[0].componentInstance as MainCarousel;
    expect(carousel.activeIndex()).toBe(0);
    expect(carousel.progress()).toBe(0);
  });

  it('next()/prev() переключают слайды с зацикливанием и сбрасывают прогресс', () => {
    const fixture = TestBed.createComponent(MainCarouselHost);
    fixture.detectChanges();
    const carousel = fixture.debugElement.children[0].componentInstance as MainCarousel;

    carousel.next();
    expect(carousel.activeIndex()).toBe(1);
    expect(carousel.progress()).toBe(0);

    carousel.next();
    expect(carousel.activeIndex()).toBe(0);

    carousel.prev();
    expect(carousel.activeIndex()).toBe(1);
  });

  it('стрелки в шаблоне вызывают next()/prev()', () => {
    const fixture = TestBed.createComponent(MainCarouselHost);
    fixture.detectChanges();
    const carousel = fixture.debugElement.children[0].componentInstance as MainCarousel;

    const el: HTMLElement = fixture.nativeElement;
    const nextButton = el.querySelector<HTMLButtonElement>('.main-carousel__arrow--next')!;
    const prevButton = el.querySelector<HTMLButtonElement>('.main-carousel__arrow--prev')!;

    nextButton.click();
    expect(carousel.activeIndex()).toBe(1);

    prevButton.click();
    expect(carousel.activeIndex()).toBe(0);
  });

  it('активный слайд получает модификатор main-carousel__slide--active', () => {
    const fixture = TestBed.createComponent(MainCarouselHost);
    fixture.detectChanges();
    const carousel = fixture.debugElement.children[0].componentInstance as MainCarousel;

    const el: HTMLElement = fixture.nativeElement;
    const slides = el.querySelectorAll('.main-carousel__slide');
    expect(slides[0].classList.contains('main-carousel__slide--active')).toBe(true);
    expect(slides[1].classList.contains('main-carousel__slide--active')).toBe(false);

    carousel.goTo(1);
    fixture.detectChanges();
    expect(slides[0].classList.contains('main-carousel__slide--active')).toBe(false);
    expect(slides[1].classList.contains('main-carousel__slide--active')).toBe(true);
  });

  it('рендерит спроецированный контент в трёх именованных слотах (2 на слайде 0, 1 на слайде 1)', () => {
    const fixture = TestBed.createComponent(MainCarouselHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#schedule')?.textContent).toBe('Расписание (заглушка)');
    expect(el.querySelector('#social')?.textContent).toBe('Соц. сети (заглушка)');
    expect(el.querySelector('#donators')?.textContent).toBe('Топ донатеров (заглушка)');
  });

  it('рендерит картинки слайдов с классом позиции (лево/право по умолчанию)', () => {
    const fixture = TestBed.createComponent(MainCarouselHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const slots = el.querySelectorAll('.main-carousel__image-slot');
    expect(slots[0].classList.contains('main-carousel__image-slot--left')).toBe(true);
    expect(slots[1].classList.contains('main-carousel__image-slot--right')).toBe(true);

    const images = el.querySelectorAll<HTMLImageElement>('.main-carousel__image');
    expect(images[0].src).toContain('/bg-0.png');
    expect(images[1].src).toContain('/bg-1.png');
  });

  it('автопрокрутка переключает слайд каждые 10 секунд и обновляет прогресс', () => {
    const fixture = TestBed.createComponent(MainCarouselHost);
    fixture.detectChanges();
    const carousel = fixture.debugElement.children[0].componentInstance as MainCarousel;

    vi.advanceTimersByTime(5000);
    expect(carousel.activeIndex()).toBe(0);
    expect(carousel.progress()).toBeCloseTo(0.5, 5);

    vi.advanceTimersByTime(5000);
    expect(carousel.activeIndex()).toBe(1);
    expect(carousel.progress()).toBe(0);
  });

  it('ручная навигация сбрасывает автопрокрутку (следующее переключение — снова через полные 10с)', () => {
    const fixture = TestBed.createComponent(MainCarouselHost);
    fixture.detectChanges();
    const carousel = fixture.debugElement.children[0].componentInstance as MainCarousel;

    vi.advanceTimersByTime(7500);
    carousel.next();
    expect(carousel.activeIndex()).toBe(1);

    vi.advanceTimersByTime(7500);
    expect(carousel.activeIndex()).toBe(1);

    vi.advanceTimersByTime(2500);
    expect(carousel.activeIndex()).toBe(0);
  });

  it('таймлайн: первый сегмент заполняется на слайде 0, полностью залит после перехода на слайд 1', () => {
    const fixture = TestBed.createComponent(MainCarouselHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const fills = el.querySelectorAll<HTMLElement>('.main-carousel__segment-fill');

    vi.advanceTimersByTime(5000);
    fixture.detectChanges();
    expect(fills[0].style.width).toBe('50%');
    expect(fills[1].style.width).toBe('0%');

    vi.advanceTimersByTime(5000);
    fixture.detectChanges();
    expect(fills[0].style.width).toBe('100%');
    expect(fills[1].style.width).toBe('0%');
  });
});
