import { Component, OnDestroy, OnInit, computed, input, signal } from '@angular/core';

import { ListItem, ListItemDirection, ListItemDividers, ListItemSegment } from '../list-item/list-item';

/** Направление раскладки — вертикальный стек строк или горизонтальный ряд. */
export type ListDirection = 'row' | 'column';

/**
 * `'stretch'` — элементы делят доступное место поровну (для `column` это
 * просто полная ширина, для `row` — `1fr`-колонки, их количество и,
 * соответственно, ширина каждой определяются числом элементов `items()`).
 * `'auto'` — каждый элемент занимает столько места, сколько нужно контенту.
 */
export type ListItemWidth = 'stretch' | 'auto';

/** Данные одного элемента списка — id для трекинга + его сегменты (см. `ListItem`). */
export interface ListItemData {
  id: string | number;
  segments: ListItemSegment[];
  /** Тип разделителя после каждого сегмента этого item'а (кроме последнего) — см. `ListItemDividers`, без значения на индексе — `'left'`. */
  dividers?: ListItemDividers;
  /** Направление декора этого item'а — см. `ListItemDirection`, без значения — `'left'`. */
  direction?: ListItemDirection;
}

/**
 * Настройки списка целиком. Модель заведомо неполная и будет расти —
 * пользователь пока сам не знает, что ещё сюда понадобится (например
 * дефолтные цвета сегментов, если их не задавать на каждый item отдельно).
 */
export interface ListSettings {
  direction?: ListDirection;
  itemWidth?: ListItemWidth;
  gap?: number;
}

/** Дефолты — по прямому запросу пользователя вынесены в настройку, но не обязательны. */
const DEFAULT_STEP_DURATION_MS = 3000;
const DEFAULT_STAGGER_MS = 500;
const TICK_MS = 50;
/** Отступ бегуна от краёв строки в процентах её ширины — не должен перебегать границу пилюли. */
const RUNNER_INSET_PERCENT = 8;

/**
 * Настройки скелетон-прелоадера (`stream.Front#52`) — отдельно от `items()`,
 * т.к. во время загрузки реальных данных ещё нет (пустой/неизвестный
 * массив), но раскладку скелетона показать нужно уже сейчас.
 */
export interface ListLoaderSettings {
  /** Сколько скелетон-плейсхолдеров показать — items() пока недоступен/пуст. */
  itemsCount: number;
  /** Время пробега бегуна от начала до конца строки (в одну сторону). Дефолт — `3000ms`. */
  stepDurationMs?: number;
  /** Задержка старта каждой следующей строки относительно предыдущей. Дефолт — `500ms`. */
  staggerMs?: number;
}

/**
 * Компонент-оркестратор списка: данные (`items()`, массив `ListItemData`) +
 * настройки (`settings()`, `ListSettings`) — снаружи (`ScheduleWidget`,
 * `DonatorsWidget`, что угодно ещё) просто отдаёт массив item'ов, `List`
 * сам раскладывает их (направление/ширина элементов — через `settings()`)
 * и рендерит каждый через `ListItem`. Раньше раскладка была вынесена в
 * отдельный `ListContainer` — по прямому запросу пользователя убран
 * (отдельный контейнер поверх `List` избыточен), логика раскладки перенесена
 * сюда же, на `:host`.
 *
 * Раскладка — CSS Grid на `:host`, не Flexbox: `List` не должен трогать
 * разметку/стили самого `ListItem` (`grid-auto-columns`/`grid-auto-rows` +
 * дефолтный `justify-items: stretch` управляют размером треков и элементов
 * структурно, по DOM-иерархии, без обращения к детям через селекторы —
 * Flexbox потребовал бы `flex`/ширину на каждом ребёнке напрямую).
 * `direction: 'column'` (дефолт) → `grid-auto-flow: row`, единственная
 * grid-колонка по умолчанию и так на всю ширину — `itemWidth` управляет
 * `justify-items` (`stretch` — на всю ширину, `auto` → `start` — по
 * контенту). `direction: 'row'` → `grid-auto-flow: column`,
 * `itemWidth: 'stretch'` → `grid-auto-columns: 1fr` (N колонок делят
 * ширину поровну по фактическому числу `items()`), `itemWidth: 'auto'` →
 * `grid-auto-columns: max-content`.
 *
 * Модель данных сознательно неполная — заложены только объекты и раскладка,
 * без доменной логики загрузки (она остаётся за отдельными сервисами вроде
 * будущего `ScheduleService`).
 *
 * `loading()` (`stream.Front#52`) — скелетон-прелоадер вместо `items()`:
 * `loaderSettings().itemsCount` строк, каждая — тот же `ListItem` (без
 * текста, не отдельный skeleton-div), у КАЖДОЙ строки — своя гифка-бегун
 * (`public/images/list-loader-runner.gif`, прислана пользователем), бегущая
 * горизонтально в пределах этой строки: от начала (с отступом
 * `RUNNER_INSET_PERCENT`, чтобы не перебегать границу пилюли) до конца,
 * разворот (зеркалируется), обратно, бесконечно. Строки стартуют не
 * одновременно — каждая следующая на `loaderSettings().staggerMs` позже
 * предыдущей (по прямому запросу пользователя).
 *
 * Позиция каждой строки — ЧИСТАЯ ФУНКЦИЯ общего сигнала `elapsedMs`
 * (единственное, что реально обновляется на `setInterval`-тике, тот же
 * приём, что у `MainCarousel.progress`) и её индекса (`runnerLeftPercent(i)`/
 * `runnerFlip(i)`), а не накопительный сдвиг позиции на каждый тик — так
 * дрейф float-сложения шагов не накапливается (что были явные регрессии
 * при предыдущей аккумулятивной реализации), и сдвиг по фазе между строками
 * получается тривиально (просто вычесть `i * staggerMs` из `elapsedMs`
 * перед тем же расчётом фазы внутри цикла "туда-обратно" длиной
 * `2 * stepDurationMs`). Строка, чья очередь ещё не наступила
 * (`elapsedMs() < i * staggerMs`), просто стоит в начале (`0%`). `loading:
 * false` (дефолт) не меняет существующее поведение `List` никак.
 */
@Component({
  selector: 'app-list',
  imports: [ListItem],
  templateUrl: './list.html',
  styleUrl: './list.scss',
  host: {
    '[style.display]': "'grid'",
    '[style.gridAutoFlow]': 'gridAutoFlow()',
    '[style.gridAutoColumns]': 'gridAutoColumns()',
    '[style.gridAutoRows]': 'gridAutoRows()',
    '[style.justifyItems]': 'justifyItems()',
    '[style.gap.px]': 'gap()',
  },
})
export class List implements OnInit, OnDestroy {
  readonly items = input.required<ListItemData[]>();
  readonly settings = input<ListSettings>({});
  readonly loading = input<boolean>(false);
  readonly loaderSettings = input<ListLoaderSettings>();

  protected readonly direction = computed(() => this.settings().direction ?? 'column');
  protected readonly itemWidth = computed(() => this.settings().itemWidth ?? 'stretch');
  protected readonly gap = computed(() => this.settings().gap ?? 0);

  protected readonly gridAutoFlow = computed(() => (this.direction() === 'row' ? 'column' : 'row'));
  protected readonly gridAutoColumns = computed(() => {
    if (this.direction() !== 'row') return null;
    return this.itemWidth() === 'stretch' ? '1fr' : 'max-content';
  });
  protected readonly gridAutoRows = computed(() => (this.direction() === 'column' ? 'auto' : null));
  protected readonly justifyItems = computed(() => (this.itemWidth() === 'stretch' ? 'stretch' : 'start'));

  protected readonly loaderItemsCount = computed(() => this.loaderSettings()?.itemsCount ?? 0);
  protected readonly loaderPlaceholders = computed(() =>
    Array.from({ length: this.loaderItemsCount() }, (_, i) => i),
  );
  // Плейсхолдер — тот же ListItem (декор), что и в обычном списке, просто
  // без текста — по прямому запросу пользователя пропадать должен ТОЛЬКО
  // текст, а не сама форма строки (не выдуманный отдельный skeleton-div).
  protected readonly loaderSegments: ListItemSegment[] = [{ text: '' }];
  private readonly stepDurationMs = computed(() => this.loaderSettings()?.stepDurationMs ?? DEFAULT_STEP_DURATION_MS);
  private readonly staggerMs = computed(() => this.loaderSettings()?.staggerMs ?? DEFAULT_STAGGER_MS);

  /**
   * Мс с момента включения `loading()` — единственное состояние, которое
   * реально накапливается на `setInterval`-тике (тот же приём, что у
   * `MainCarousel.progress`). Публичный (не `protected`) — юнит-тесты
   * дёргают его напрямую через `componentInstance`. Позиция/направление
   * каждой строки — чистая функция ЭТОГО сигнала + её индекса, см.
   * `runnerLeftPercent`/`runnerFlip` — не отдельное накопительное состояние
   * на строку (иначе N строк — N независимых источников float-дрейфа).
   */
  readonly elapsedMs = signal(0);

  /** Строка с индексом `i` начинает движение спустя `i * staggerMs` — до этого момента стоит в начале (0). */
  private rowPhaseMs(i: number): number {
    return Math.max(0, this.elapsedMs() - i * this.staggerMs());
  }

  /**
   * 0..1 внутри цикла "туда-обратно" длиной `2 * stepDurationMs`: первая
   * половина — вперёд (0→1), вторая — назад (1→0). Публичные (не
   * `protected`) — так же, как `MainCarousel.progress` — юнит-тесты
   * дёргают их напрямую через `componentInstance`.
   */
  runnerProgress(i: number): number {
    const step = this.stepDurationMs();
    const cycle = this.rowPhaseMs(i) % (2 * step);
    return cycle < step ? cycle / step : 2 - cycle / step;
  }

  /** `true`, пока строка едет вперёд (первая половина цикла) — гифка развёрнута (`scaleX(-1)`) на этом отрезке. */
  runnerGoingForward(i: number): boolean {
    const step = this.stepDurationMs();
    return this.rowPhaseMs(i) % (2 * step) < step;
  }

  /** `left` в процентах — считается от containing block (обёртки `.list__loader-row` конкретной строки), не от собственного бокса бегуна. Отступ `RUNNER_INSET_PERCENT` с каждого края — не перебегать границу пилюли. */
  protected runnerLeftPercent(i: number): number {
    return RUNNER_INSET_PERCENT + this.runnerProgress(i) * (100 - 2 * RUNNER_INSET_PERCENT);
  }

  /** Центрирование по вертикали (self-relative % — здесь корректно) + разворот (зеркало), пока едет вперёд. */
  protected runnerTransform(i: number): string {
    return `translate(-50%, -50%) ${this.runnerGoingForward(i) ? 'scaleX(-1)' : ''}`.trim();
  }

  private timerId: ReturnType<typeof setInterval> | undefined;

  ngOnInit(): void {
    this.timerId = setInterval(() => this.tick(), TICK_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }

  private tick(): void {
    if (!this.loading() || this.loaderItemsCount() <= 0) {
      this.elapsedMs.set(0);
      return;
    }
    this.elapsedMs.update((ms) => ms + TICK_MS);
  }
}
