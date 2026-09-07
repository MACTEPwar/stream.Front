import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { SMALL_QUERY } from '@shared/utils/breakpoints';

const SLIDE_COUNT = 2;
const SLIDE_DURATION_MS = 10000;
const TICK_MS = 50;

/**
 * Зазор между баром «Соц. сети» (`--compact-bottom`) и таймлайном/нижним
 * краем экрана + зазор между ним и баром «Расписание»/«Топ донатеров»
 * (`--compact-top`) над ним — те же `$timeline-height`/`$compact-bar-gap`
 * (main-carousel.scss), продублированы здесь тем же приёмом, что и
 * `$compact-header-height` там же (вручную синхронизируемое магическое
 * число), т.к. reserve считается в TS, а не в SCSS.
 */
const COMPACT_BOTTOM_OWN_RESERVE_PX = 10 + 16 + 16; // timeline-height + gap*2 (над и под баром)

/**
 * Минимальное смещение указателя (в любую сторону), после которого жест
 * классифицируется как горизонтальный свайп или вертикальный скролл —
 * отличает намеренный жест от дрожания пальца/случайного касания
 * (`СЛД-Ф-07`). Пока смещение меньше порога по обеим осям, направление не
 * определено и `pointermove` ничего не делает.
 */
const SWIPE_DIRECTION_THRESHOLD_PX = 10;

/** Минимальное горизонтальное смещение, переключающее слайд по `pointerup`. */
const SWIPE_TRIGGER_PX = 50;

export type MainCarouselImagePosition = 'left' | 'center' | 'right';

type SwipeDirection = 'horizontal' | 'vertical';

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
 *
 * **Компактная раскладка (`stream.Front#150`, `СЛД` в `specs/03-main/spec.md`)**
 * — стрелки скрыты чисто CSS-ом (`main-carousel.scss`, `bp.small`), ручное
 * переключение вместо них — горизонтальный свайп по всей области карусели.
 * `isCompact` (`BreakpointObserver`/`SMALL_QUERY`, тот же приём, что
 * `Shell`/`NewsPage`) гейтит обработчики свайпа: жест имеет смысл только на
 * компактной раскладке (на широкой уже есть стрелки, `СЛД-Ф-05`/`СЛД-Ф-06`).
 * Логика жеста — тот же паттерн, что `PinnedGridEditor.onPointerDown`:
 * `pointerdown` на компоненте стартует отслеживание, `pointermove`/
 * `pointerup`/`pointercancel` вешаются на `window` через `AbortController` (не
 * теряют жест, если палец уходит за пределы карусели) и снимаются по
 * завершении жеста или при уничтожении компонента. Направление определяется
 * один раз за жест, как только смещение по одной из осей превышает
 * `SWIPE_DIRECTION_THRESHOLD_PX` — только «horizontal» подавляет
 * `preventDefault()`-ом дальнейшую нативную обработку, «vertical» жест
 * оставляется браузеру нетронутым (`АДП-Ф-18`, вертикальный скролл, если он
 * появится, не перехватывается).
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

  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isCompact = toSignal(
    this.breakpointObserver.observe(SMALL_QUERY).pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  // Реально измеренная высота бара «Соц. сети» (`ResizeObserver`, тот же
  // приём, что `ListItem.rowWidthPx`/`SectionTitle`) — бар «Расписание»/«Топ
  // донатеров» над ним (`--compact-top`) резервирует под него РОВНО столько
  // места, сколько тот реально занимает (не константу), иначе при длинном
  // контенте они физически накладывались друг на друга (найдено на
  // компактной раскладке при контенте расписания на 7 строк). Оставшееся
  // место `--compact-top` не помещает — скроллится ВНУТРИ себя
  // (`overflow-y: auto`, main-carousel.scss), а не выталкивает страницу в
  // скролл (по прямому запросу пользователя — на главной должна скроллиться
  // именно карусель, не сама страница).
  private readonly compactBottomEl = viewChild<ElementRef<HTMLDivElement>>('compactBottomEl');
  private readonly compactBottomHeightPx = signal(0);
  protected readonly compactBottomReservePx = computed(
    () => this.compactBottomHeightPx() + COMPACT_BOTTOM_OWN_RESERVE_PX,
  );

  private elapsedMs = 0;
  private timerId: ReturnType<typeof setInterval> | undefined;

  private activePointerId: number | null = null;
  private swipeStartX = 0;
  private swipeDirection: SwipeDirection | null = null;

  constructor() {
    effect((onCleanup) => {
      const el = this.compactBottomEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      // `getBoundingClientRect()` в колбэке, не `entry.contentRect` — тому
      // нужна ПОЛНАЯ (border-box, с паддингом бара 12px сверху/снизу)
      // высота, т.к. резерв ниже освобождает место под весь визуальный
      // футпринт бара, а `contentRect` паддинг не учитывает (без этого
      // резерва не хватало ровно на паддинг — бар «Расписание»/«Топ
      // донатеров» над ним всё равно на пару px наезжал на «Соц. сети»).
      const observer = new ResizeObserver(() =>
        this.compactBottomHeightPx.set(el.getBoundingClientRect().height),
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

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

  protected onSwipeStart(event: PointerEvent): void {
    if (!this.isCompact() || this.activePointerId !== null) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.swipeStartX = event.clientX;
    this.swipeDirection = null;

    const startY = event.clientY;
    const controller = new AbortController();
    window.addEventListener('pointermove', (moveEvent) => this.onSwipeMove(moveEvent, startY), {
      signal: controller.signal,
    });
    window.addEventListener('pointerup', (upEvent) => this.onSwipeEnd(upEvent, controller), {
      signal: controller.signal,
    });
    window.addEventListener('pointercancel', () => this.endSwipe(controller), {
      signal: controller.signal,
    });
    this.destroyRef.onDestroy(() => controller.abort());
  }

  private onSwipeMove(event: PointerEvent, startY: number): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    const deltaX = event.clientX - this.swipeStartX;
    const deltaY = event.clientY - startY;

    if (this.swipeDirection === null) {
      if (
        Math.abs(deltaX) < SWIPE_DIRECTION_THRESHOLD_PX &&
        Math.abs(deltaY) < SWIPE_DIRECTION_THRESHOLD_PX
      ) {
        return;
      }
      this.swipeDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    if (this.swipeDirection === 'horizontal') {
      event.preventDefault();
    }
  }

  private onSwipeEnd(event: PointerEvent, controller: AbortController): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    if (this.swipeDirection === 'horizontal') {
      const deltaX = event.clientX - this.swipeStartX;
      if (deltaX <= -SWIPE_TRIGGER_PX) {
        this.next();
      } else if (deltaX >= SWIPE_TRIGGER_PX) {
        this.prev();
      }
    }

    this.endSwipe(controller);
  }

  private endSwipe(controller: AbortController): void {
    controller.abort();
    this.activePointerId = null;
    this.swipeDirection = null;
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
