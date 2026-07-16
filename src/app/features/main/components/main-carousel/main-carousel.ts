import { Component, OnDestroy, OnInit, input, signal } from '@angular/core';

const SLIDE_COUNT = 2;
const SLIDE_DURATION_MS = 10000;
const TICK_MS = 50;

export type MainCarouselImagePosition = 'left' | 'center' | 'right';

/**
 * Открытые вопросы (stream.Front#28): источник фоновых hero-изображений
 * слайдов не определён этой задачей — задаются извне через
 * `imageUrl0`/`imageUrl1`, на превью-странице — тестовые картинки.
 *
 * Компонент специфичен для главной страницы: ровно 2 слайда, позиции
 * контента в углах жёстко заданы под их фактическую разметку по макету
 * (слайд 0 — «Расписание» bottom-right + «Соц. сети» bottom-left; слайд 1 —
 * «Топ донатеров» bottom-left) — не абстрагируется под произвольное
 * число/расположение слайдов.
 *
 * Автопрокрутка: 10 секунд на слайд (зациклена), таймлайн внизу показывает
 * прогресс текущего слайда в реальном времени; ручная навигация (стрелки/
 * `goTo`) сбрасывает отсчёт.
 */
@Component({
  selector: 'app-main-carousel',
  imports: [],
  templateUrl: './main-carousel.html',
  styleUrl: './main-carousel.scss',
})
export class MainCarousel implements OnInit, OnDestroy {
  readonly imageUrl0 = input('');
  readonly imagePosition0 = input<MainCarouselImagePosition>('left');
  readonly imageUrl1 = input('');
  readonly imagePosition1 = input<MainCarouselImagePosition>('right');

  readonly activeIndex = signal(0);
  /** Доля пройденного времени текущего слайда, 0..1. */
  readonly progress = signal(0);

  private elapsedMs = 0;
  private timerId: ReturnType<typeof setInterval> | undefined;

  ngOnInit(): void {
    this.timerId = setInterval(() => this.tick(), TICK_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }

  next(): void {
    this.activeIndex.update((index) => (index + 1) % SLIDE_COUNT);
    this.resetTimer();
  }

  prev(): void {
    this.activeIndex.update((index) => (index - 1 + SLIDE_COUNT) % SLIDE_COUNT);
    this.resetTimer();
  }

  goTo(index: number): void {
    this.activeIndex.set(index);
    this.resetTimer();
  }

  private tick(): void {
    this.elapsedMs += TICK_MS;
    if (this.elapsedMs >= SLIDE_DURATION_MS) {
      this.elapsedMs = 0;
      this.activeIndex.update((index) => (index + 1) % SLIDE_COUNT);
    }
    this.progress.set(this.elapsedMs / SLIDE_DURATION_MS);
  }

  private resetTimer(): void {
    this.elapsedMs = 0;
    this.progress.set(0);
  }
}
