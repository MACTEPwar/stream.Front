import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

const TICK_MS = 50; // тот же шаг, что у List (её loader-бегун) — общий устоявшийся тик анимации в проекте.
const SPEED_PX_PER_SEC = 40; // подобрано на глаз — комфортная скорость чтения бегущей строки.
const EDGE_PAUSE_MS = 1000; // пауза на каждом краю (прочитал начало / доехал до конца) перед разворотом.
const OVERFLOW_THRESHOLD_PX = 2; // не запускать анимацию на почти точном совпадении ширины (пограничный дребезг).

/**
 * Автопрокрутка ("бегущая строка") однострочного текста, не помещающегося в
 * свой контейнер (`stream.Front#150` — сегменты `ListItem`/`day-row__segment`
 * на компактном баре `MainCarousel`, но директива не завязана на разметку
 * `ListItem` — применима к любому элементу с `overflow: hidden; white-space:
 * nowrap`).
 *
 * Скроллит ТОЛЬКО когда текст реально не помещается (`scrollWidth`
 * внутреннего враппера больше `clientWidth` хоста больше чем на
 * `OVERFLOW_THRESHOLD_PX` — не дёргаться на границе). Цикл — туда-обратно с
 * паузой на обоих концах (`EDGE_PAUSE_MS`), НЕ бесконечная лента по кругу.
 * Скорость постоянная (`SPEED_PX_PER_SEC`), не фиксированная длительность —
 * иначе короткий overflow полз бы мучительно медленно, а длинный проскакивал
 * бы слишком быстро. Позиция (`progress()`) — чистая функция `elapsedMs()`/
 * `overflowPx()` (тот же принцип, что `List.runnerProgress` — не
 * накопительный сдвиг за тик, дрейф float-сложения шагов не накапливается).
 *
 * `prefers-reduced-motion: reduce` (`ДСТ-Ф-05`, `specs/01-common/spec.md`)
 * сознательно ИГНОРИРУЕТСЯ здесь — по прямому запросу пользователя строка
 * должна ехать в любом случае, а не оставаться статичной с многоточием.
 * Это осознанное отступление от ДСТ-Ф-05 именно для этой строки, а не
 * дефолтное поведение проекта — см. обсуждение в PR.
 *
 * Реализация — обёртка исходного текста в СОЗДАННЫЙ директивой внутренний
 * `<span>` (`Renderer2` — у директивы нет своего шаблона): хост остаётся
 * неподвижным окном обрезки (`overflow: hidden`, позиция/размер элемента-
 * хозяина не трогаются), едет только внутренний враппер (`transform:
 * translateX`). Враппер во время анимации переключается на `display:
 * inline-block` (`transform` не действует на обычные `inline`-элементы ни в
 * одном браузере), а не остаётся в нём ПОСТОЯННО: нативный `text-overflow:
 * ellipsis` хоста корректно "…"-обрезает текст внутри `inline`-обёртки (та
 * же строка, что и у хоста), но не умеет частично обрезать АТОМАРНЫЙ
 * `inline-block` (может только целиком его убрать, без "…") — поэтому в
 * состоянии "не анимируется" враппер возвращается в `inline`, отдавая
 * обрезку целиком CSS.
 */
@Directive({ selector: '[appMarqueeText]' })
export class MarqueeText implements OnInit, OnDestroy {
  readonly text = input.required<string>({ alias: 'appMarqueeText' });

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly innerEl = this.renderer.createElement('span') as HTMLSpanElement;

  private readonly hostWidthPx = signal(0);
  private readonly innerScrollWidthPx = signal(0);

  private readonly overflowPx = computed(() => this.innerScrollWidthPx() - this.hostWidthPx());
  private readonly shouldAnimate = computed(() => this.overflowPx() > OVERFLOW_THRESHOLD_PX);

  private readonly travelMs = computed(
    () => (Math.max(0, this.overflowPx()) / SPEED_PX_PER_SEC) * 1000,
  );
  private readonly cycleMs = computed(() => 2 * EDGE_PAUSE_MS + 2 * this.travelMs());

  /** Публичный (не `private`) — тот же приём, что `List.elapsedMs`, юнит-тесты дёргают напрямую. */
  readonly elapsedMs = signal(0);

  /** 0 (у левого края) .. 1 (у правого), с плато-паузой на обоих концах — чистая функция `elapsedMs()`/`overflowPx()`. */
  readonly progress = computed(() => {
    const travel = this.travelMs();
    if (travel <= 0) return 0;
    const t = this.elapsedMs() % this.cycleMs();
    if (t < EDGE_PAUSE_MS) return 0;
    if (t < EDGE_PAUSE_MS + travel) return (t - EDGE_PAUSE_MS) / travel;
    if (t < 2 * EDGE_PAUSE_MS + travel) return 1;
    return 1 - (t - 2 * EDGE_PAUSE_MS - travel) / travel;
  });

  private timerId: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.renderer.setStyle(this.innerEl, 'display', 'inline');
    this.renderer.appendChild(this.host, this.innerEl);

    effect(() => {
      this.renderer.setProperty(this.innerEl, 'textContent', this.text());
      this.innerScrollWidthPx.set(this.innerEl.scrollWidth);
    });

    effect((onCleanup) => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => {
        this.hostWidthPx.set(entry.contentRect.width);
        this.innerScrollWidthPx.set(this.innerEl.scrollWidth);
      });
      observer.observe(this.host);
      onCleanup(() => observer.disconnect());
    });

    effect(() => {
      const animate = this.shouldAnimate();
      this.renderer.setStyle(this.host, 'text-overflow', animate ? 'clip' : '');
      this.renderer.setStyle(this.innerEl, 'display', animate ? 'inline-block' : 'inline');
      if (!animate) {
        this.renderer.setStyle(this.innerEl, 'transform', 'none');
        return;
      }
      const offsetPx = this.progress() * this.overflowPx();
      this.renderer.setStyle(this.innerEl, 'transform', `translateX(${-offsetPx}px)`);
    });
  }

  ngOnInit(): void {
    this.timerId = setInterval(() => this.tick(), TICK_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }

  private tick(): void {
    if (!this.shouldAnimate()) {
      this.elapsedMs.set(0);
      return;
    }
    this.elapsedMs.update((ms) => ms + TICK_MS);
  }
}
