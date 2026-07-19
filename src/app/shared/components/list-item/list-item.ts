import { Component, computed, input } from '@angular/core';

let nextListItemUid = 0;

// Ширина первого сегмента, при которой декор (подложка-«стрелка», её граница,
// левый орнамент-разделитель) стоит на своих исходных местах из Schedule.svg
// — ровно то значение, что задано у первого демо-item'а на /kit (48px).
// firstSegmentShiftPx() ниже сдвигает декор на разницу между этим базовым
// значением и реально заданной шириной первого сегмента.
const FIRST_SEGMENT_BASELINE_WIDTH_PX = 48;

// Зеркально — последний сегмент и декор в ПРАВОЙ части строки (подложка
// paint5_radial, её граница filter4_d/paint7_linear, разделитель filter1_d).
// Базовое значение — ширина последнего сегмента в демо-данных `/kit` (56px).
const LAST_SEGMENT_BASELINE_WIDTH_PX = 56;

// Геометрия подложки/границы — см. firstSegmentShiftPx()/subplateBodyTransform()/
// borderStraightTransform() ниже. Якоря/ширины — вершины исходного контура
// в Schedule.svg (там же, где стыкуются прямая и «крючок»/остриё частей).
const SUBPLATE_ANCHOR_X = 15;
const SUBPLATE_BODY_WIDTH = 104.75 - SUBPLATE_ANCHOR_X;
const BORDER_ANCHOR_X = 14.75;
const BORDER_STRAIGHT_WIDTH = 105.75 - BORDER_ANCHOR_X;

// Правая подложка/граница — зеркало левых: анкор у ПРАВОГО (фиксированного,
// это же край самой пилюли) края, растягиваются влево. Подложка справа —
// простой прямоугольник (нет остриёй-«стрелки», как у левой) — ей не нужен
// clip-path на fixed/stretch части, весь path растягивается целиком.
const RIGHT_SUBPLATE_ANCHOR_X = 643.75;
const RIGHT_SUBPLATE_WIDTH = RIGHT_SUBPLATE_ANCHOR_X - 542.75;
const RIGHT_BORDER_ANCHOR_X = 643.75;
const RIGHT_BORDER_STRAIGHT_WIDTH = RIGHT_BORDER_ANCHOR_X - 552.75;

// Тёмная подложка (paint6_radial) под «резиновым» (width: 1 и т.п.) средним
// сегментом — в исходнике статична (x=169.75, width=320), т.е. её левый/
// правый край НЕ следует за левым/правым разделителем при изменении ширины
// первого/последнего сегмента. Из-за этого отступ резинового сегмента от
// разделителя менялся вместе с чужой шириной, а при уменьшении первого/
// последнего сегмента ниже базового подложка перекрывала сдвинувшийся
// разделитель. Оба края подложки должны двигаться вместе со «своим»
// разделителем 1:1 (centerBackgroundX()/centerBackgroundWidth() ниже).
const CENTER_BACKGROUND_X = 169.75;
const CENTER_BACKGROUND_WIDTH = 320;

/** `scale`-затем-`shift`, анкорится в `anchor` (та же формула, что у `Button`). */
function anchoredScale(anchor: number, scale: number): string {
  return `translate(${anchor} 0) scale(${scale} 1) translate(${-anchor} 0)`;
}

export type ListItemSegmentAlign = 'left' | 'center' | 'right';

/** `'ornament'` — декоративный завиток из Schedule.svg (как сейчас, дефолт); `'none'` — разделитель скрыт. */
export type ListItemDividerType = 'ornament' | 'none';

/**
 * Тип разделителей у левого/правого декоративного узла строки (`filter2_d`/
 * `filter1_d` в шаблоне) — по прямому запросу пользователя настройка НЕ на
 * сегменте (позиция обоих узлов и так жёстко привязана к ширине первого и
 * последнего сегмента через firstSegmentShiftPx()/lastSegmentShiftPx(), от
 * количества сегментов не зависит), а отдельным объектом, чтобы работало
 * одинаково что при 2 сегментах, что при 3+. Без значения — оба `'ornament'`
 * (текущее поведение, обратная совместимость).
 */
export interface ListItemDividers {
  left?: ListItemDividerType;
  right?: ListItemDividerType;
}

/**
 * `'left'` (дефолт) — остриё-«стрелка» подложки смотрит влево, как в
 * исходном Schedule.svg. `'right'` — весь декор зеркалится по горизонтали
 * (`scaleX(-1)` на `.day-row`, см. list-item.scss) — остриё оказывается
 * справа. Раскладка сегментов (`segments()`, `dividers()`) не меняется —
 * зеркалится только декоративная отрисовка, а не модель контента.
 */
export type ListItemDirection = 'left' | 'right';

/** Один "сегмент" строки — горизонтальное деление со своими текстом/шириной/цветом/выравниванием. */
export interface ListItemSegment {
  text: string;
  /** CSS-цвет текста сегмента; без значения — дефолтный (`#F9F9F9`). */
  color?: string;
  /**
   * Ширина сегмента: число — доля от общего пространства (`flex-grow`,
   * сегменты делят место пропорционально своим числам, как обычный `flex`);
   * строка — фиксированная CSS-длина (`'80px'`, `'20%'`, сегмент не растёт/
   * не сжимается). Без значения — равная доля с остальными "безразмерными"
   * сегментами (`flex: 1 1 0`).
   */
  width?: number | string;
  /** Выравнивание текста внутри сегмента; без значения — `'left'`. */
  align?: ListItemSegmentAlign;
}

/**
 * Обобщённый переиспользуемый элемент списка (изначально — перенос строки
 * расписания из приложенного пользователем Schedule.svg, stream.Front#30;
 * генерализован по прямому запросу пользователя в тот же день — видимость
 * (декор, пилюля, орнаменты, блики) не изменилась, изменилась только модель
 * контента). Принимает произвольный массив `segments()`: каждый сегмент —
 * своя горизонтальная часть строки со своим текстом, шириной, цветом и
 * выравниванием (все — по прямому запросу пользователя, "чтобы для каждой
 * из частей можно было задать длину, текст, цвет текста и выравнивание
 * текста"). Домен (расписание, донатеры, что-то ещё) компонент не знает —
 * вызывающий код сам решает, сколько сегментов и с какими параметрами
 * собрать (например: online-строка расписания — 3 сегмента, weekday узкий
 * слева, event растягивается по центру, time узкий справа; offline — те же
 * 3 позиции, но event/time с текстом «Оффлайн»/`--:--` и красным `color`).
 *
 * Раскладка сегментов — на CSS `flex` напрямую (`width()` каждого сегмента
 * → `flex`-shorthand, см. `segmentFlex()`), без скрытой "умной" логики по
 * позиции сегмента (было — первый/последний не растягивались автоматически;
 * убрано в пользу явного контроля, раз вызывающий код теперь настраивает
 * всё сам).
 *
 * Декор перенесён 1:1 из Schedule.svg (детали — см. историю компонента до
 * переименования в PROJECT_MAP.md), `id`/`url(#...)` — с `uid`-суффиксом.
 * Ширина всей строки сейчас фиксированная (644px) — 9-slice-растягивание
 * отложено.
 */
@Component({
  selector: 'app-list-item',
  imports: [],
  templateUrl: './list-item.html',
  styleUrl: './list-item.scss',
})
export class ListItem {
  protected readonly uid = `listitem${nextListItemUid++}`;

  readonly segments = input.required<ListItemSegment[]>();
  readonly dividers = input<ListItemDividers>({});
  readonly direction = input<ListItemDirection>('left');

  protected readonly leftDividerType = computed(() => this.dividers().left ?? 'ornament');
  protected readonly rightDividerType = computed(() => this.dividers().right ?? 'ornament');

  // Декор в левой части строки (подложка-«стрелка» под первым сегментом,
  // её граница, орнамент-разделитель между 1-м и 2-м сегментом) в исходнике
  // рассчитан на конкретную ширину первого сегмента — по прямому запросу
  // пользователя эти элементы теперь двигаются вместе с шириной первого
  // сегмента (пока — только он, не остальные), чтобы отступ между концом
  // подложки и началом разделителя оставался визуально таким же независимо
  // от заданной ширины. Считается только для фиксированной px-ширины
  // (`width: '48px'`) — сегменты с долевой (`number`) или процентной
  // шириной не имеют статически известного px-размера (реальная ширина
  // известна только браузеру после раскладки), сдвиг для них не применяется.
  protected readonly firstSegmentShiftPx = computed(() => {
    const width = this.segments()[0]?.width;
    if (typeof width !== 'string') return 0;
    const match = /^(-?\d*\.?\d+)px$/.exec(width.trim());
    if (!match) return 0;
    return Number(match[1]) - FIRST_SEGMENT_BASELINE_WIDTH_PX;
  });

  // Подложка и её граница не просто сдвигаются — растягиваются (левый край,
  // включая остриё-«стрелку» подложки и «крючок» границы, остаётся на месте,
  // растягивается только прямая середина), по прямому запросу пользователя.
  // Разделитель (firstSegmentShiftPx() применяется напрямую в шаблоне) и
  // «крючок» границы (borderCurlTransform()) — просто сдвигаются вместе, они
  // не часть растягиваемой прямой, а фиксированный декор на её конце.
  protected readonly subplateBodyTransform = computed(() =>
    anchoredScale(SUBPLATE_ANCHOR_X, (SUBPLATE_BODY_WIDTH + this.firstSegmentShiftPx()) / SUBPLATE_BODY_WIDTH),
  );
  protected readonly borderStraightTransform = computed(() =>
    anchoredScale(BORDER_ANCHOR_X, (BORDER_STRAIGHT_WIDTH + this.firstSegmentShiftPx()) / BORDER_STRAIGHT_WIDTH),
  );
  protected readonly borderCurlTransform = computed(() => `translate(${this.firstSegmentShiftPx()} 0)`);

  // Зеркало firstSegmentShiftPx() — но для последнего сегмента и разница
  // считается так же (ширина − базовое значение), сам сдвиг декора при
  // использовании направлен влево (отрицательный x), см. rightBorderHookTransform()/
  // rightDividerTransform() ниже.
  protected readonly lastSegmentShiftPx = computed(() => {
    const segments = this.segments();
    const width = segments[segments.length - 1]?.width;
    if (typeof width !== 'string') return 0;
    const match = /^(-?\d*\.?\d+)px$/.exec(width.trim());
    if (!match) return 0;
    return Number(match[1]) - LAST_SEGMENT_BASELINE_WIDTH_PX;
  });

  // Правая подложка/граница растягиваются влево (анкор — фиксированный правый
  // край у обеих, тот же принцип, что у левых subplateBodyTransform()/
  // borderStraightTransform()); «крючок» границы и разделитель — просто
  // сдвигаются влево вместе (rightBorderHookTransform()/rightDividerTransform()).
  protected readonly rightSubplateTransform = computed(() =>
    anchoredScale(RIGHT_SUBPLATE_ANCHOR_X, (RIGHT_SUBPLATE_WIDTH + this.lastSegmentShiftPx()) / RIGHT_SUBPLATE_WIDTH),
  );
  protected readonly rightBorderStraightTransform = computed(() =>
    anchoredScale(
      RIGHT_BORDER_ANCHOR_X,
      (RIGHT_BORDER_STRAIGHT_WIDTH + this.lastSegmentShiftPx()) / RIGHT_BORDER_STRAIGHT_WIDTH,
    ),
  );
  protected readonly rightBorderHookTransform = computed(() => `translate(${-this.lastSegmentShiftPx()} 0)`);
  protected readonly rightDividerTransform = computed(() => `translate(${-this.lastSegmentShiftPx()} 0)`);

  // Подложка под резиновым сегментом растягивается за оба края одновременно:
  // левый следует за firstSegmentShiftPx() (тот же сдвиг, что у левого
  // разделителя), правый — за lastSegmentShiftPx() (тот же сдвиг, что у
  // правого), так что отступ от каждого разделителя остаётся исходным вне
  // зависимости от ширины первого/последнего сегмента.
  protected readonly centerBackgroundX = computed(() => CENTER_BACKGROUND_X + this.firstSegmentShiftPx());
  protected readonly centerBackgroundWidth = computed(
    () => CENTER_BACKGROUND_WIDTH - this.firstSegmentShiftPx() - this.lastSegmentShiftPx(),
  );
  // paint6_radial задан в userSpaceOnUse со своим gradientTransform (не
  // objectBoundingBox) — она не следует за x/width рекста автоматически,
  // пересчитываем центр/радиус вручную по той же формуле, что и у исходного
  // (центр = x + width/2, масштаб = width/2).
  protected readonly centerBackgroundGradientTransform = computed(() => {
    const width = this.centerBackgroundWidth();
    const centerX = this.centerBackgroundX() + width / 2;
    return `translate(${centerX} 27) rotate(180) scale(${width / 2} 51)`;
  });

  protected segmentFlex(segment: ListItemSegment): string {
    const { width } = segment;
    if (typeof width === 'number') return `${width} ${width} 0px`;
    if (typeof width === 'string') return `0 0 ${width}`;
    return '1 1 0px';
  }
}
