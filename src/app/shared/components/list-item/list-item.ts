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

// Геометрия content-слоя (.day-row__content в list-item.scss) — нужна, чтобы
// считать пиксельные границы МЕЖДУ сегментами (boundaryPositions() ниже) в
// тех же координатах, что и SVG-декор (оба слоя — абсолютные поверх одного
// 644px .day-row, так что CSS-px в content и SVG userSpace — одно и то же
// число). Должны оставаться синхронными с .day-row__content в list-item.scss.
const CONTENT_LEFT_INSET = 30;
const CONTENT_RIGHT_INSET = 24;
const CONTENT_GAP = 16;
const CONTENT_AVAILABLE_WIDTH = 644 - CONTENT_LEFT_INSET - CONTENT_RIGHT_INSET;

// Собственный центр каждого варианта орнамента-разделителя в его исходных
// координатах из Schedule.svg (mask-rect'ы filter2_d/filter1_d) — тот же
// принцип анкора, что у anchoredScale(), но без масштаба: разделитель не
// растягивается, только переносится в вычисленную точку между сегментами
// (targetX - ORNAMENT_CENTER_X).
const LEFT_ORNAMENT_CENTER_X = 115.75 + 38 / 2;
const RIGHT_ORNAMENT_CENTER_X = 543.75 - 38 / 2;

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

/**
 * `'left'`/`'right'` — какой из двух вариантов орнамента-разделителя из
 * Schedule.svg использовать (`filter2_d`/`paint2_linear` и `filter1_d`/
 * `paint1_linear` — зеркальные друг другу узоры, не абсолютная сторона
 * строки: любой можно поставить в любую позицию, что визуально красивее в
 * конкретном месте); `'none'` — разделитель в этой позиции скрыт.
 */
export type ListItemDividerType = 'left' | 'right' | 'none';

/**
 * Разделитель — после КАЖДОГО сегмента, кроме последнего (по прямому
 * запросу пользователя: "после каждого элемента идёт разделитель... нет
 * только если 1 элемент"), т.е. `dividers()[i]` — тип разделителя между
 * `segments()[i]` и `segments()[i + 1]`, длина массива до `segments().length
 * - 1`. Без значения на конкретном индексе — `'left'`. Позиция каждого
 * разделителя считается арифметически от фактической ширины сегментов
 * (boundaryPositions() ниже) — НЕ от DOM-измерения (ResizeObserver), так
 * что при нескольких "резиновых" (`width: number`) сегментах их доля
 * расчитывается той же пропорцией, что и настоящий CSS `flex-grow`.
 */
export type ListItemDividers = ListItemDividerType[];

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
  readonly dividers = input<ListItemDividers>([]);
  readonly direction = input<ListItemDirection>('left');

  // Пиксельная ширина каждого сегмента — для фиксированной px-строки
  // (`'48px'`) берётся напрямую; для "резиновых" (`number`/без width) делит
  // оставшееся после вычета всех фиксированных ширин и зазоров место
  // пропорционально своим числам (та же арифметика, что настоящий CSS
  // `flex-grow` — по прямому уточнению пользователя обычно "резиновый"
  // сегмент только один, но формула корректна и для нескольких).
  protected readonly segmentWidthsPx = computed(() => {
    const segments = this.segments();
    const gapTotal = Math.max(segments.length - 1, 0) * CONTENT_GAP;
    const available = CONTENT_AVAILABLE_WIDTH - gapTotal;

    let fixedTotal = 0;
    let flexTotal = 0;
    const parsed = segments.map((segment) => {
      const width = segment.width;
      if (typeof width === 'string') {
        const match = /^(-?\d*\.?\d+)px$/.exec(width.trim());
        if (match) {
          const px = Number(match[1]);
          fixedTotal += px;
          return { fixedPx: px };
        }
      }
      const flex = typeof width === 'number' ? width : 1;
      flexTotal += flex;
      return { flex };
    });

    const flexUnitPx = flexTotal > 0 ? (available - fixedTotal) / flexTotal : 0;
    return parsed.map((entry) => ('fixedPx' in entry ? entry.fixedPx : entry.flex * flexUnitPx));
  });

  // x-координата (в тех же единицах, что и SVG userSpace — оба слоя абсолютные
  // поверх одного 644px .day-row) середины зазора после сегмента i, для
  // i = 0..segments().length-2 — ровно там, где рисуется разделитель dividers()[i].
  // Длина массива = segments().length - 1: 0 сегментов зазоров у строки из 1
  // элемента (по прямому запросу пользователя — "разделителя нет только если 1 элемент").
  protected readonly boundaryPositions = computed(() => {
    const widths = this.segmentWidthsPx();
    const positions: number[] = [];
    let x = CONTENT_LEFT_INSET;
    for (let i = 0; i < widths.length - 1; i++) {
      x += widths[i] ?? 0;
      positions.push(x + CONTENT_GAP / 2);
      x += CONTENT_GAP;
    }
    return positions;
  });

  // x каждого разделителя — НЕ напрямую boundaryPositions() (та арифметика
  // живёт в системе координат CSS-content-слоя, 30px/16px и т.п., которая
  // на баллвом значении НЕ совпадает с тем, где реально нарисован узор в
  // Schedule.svg — при подстановке давала неправильный, слишком маленький
  // зазор от подложки). Первый и последний разделитель обязаны сохранять
  // тот же зазор от левой/правой подложки, что и раньше (задача, которую
  // уже решают firstSegmentShiftPx()/lastSegmentShiftPx() для самой
  // подложки) — переиспользуем ИХ, а не общую арифметику по границам:
  // 0-й разделитель = собственный центр узора + firstSegmentShiftPx() (тот
  // же сдвиг, что у подложки), последний (индекс segments().length-2) =
  // собственный центр + (−lastSegmentShiftPx()). Только СТРОГО внутренние
  // границы (существуют начиная с 4 сегментов, между 2-м и 3-м) — не имеют
  // такого эталона в исходнике, для них используется общая арифметика
  // boundaryPositions(). При 2 сегментах единственная граница — она же и
  // первая, и последняя одновременно: приоритет отдаётся «первой» ветке
  // (реже расходится с ожиданием — тот же принцип, что уже был откалиброван
  // для одного сегмента в firstSegmentShiftPx()/lastSegmentShiftPx()).
  protected readonly dividerInstances = computed(() => {
    const count = this.segments().length;
    if (count < 2) return [];
    const generic = this.boundaryPositions();
    const dividers = this.dividers();
    const lastIndex = count - 2;
    return Array.from({ length: count - 1 }, (_, i) => {
      const x =
        i === 0
          ? LEFT_ORNAMENT_CENTER_X + this.firstSegmentShiftPx()
          : i === lastIndex
            ? RIGHT_ORNAMENT_CENTER_X - this.lastSegmentShiftPx()
            : (generic[i] ?? 0);
      return { x, type: dividers[i] ?? 'left' };
    });
  });

  protected leftOrnamentTransform(x: number): string {
    return `translate(${x - LEFT_ORNAMENT_CENTER_X} 0)`;
  }

  protected rightOrnamentTransform(x: number): string {
    return `translate(${x - RIGHT_ORNAMENT_CENTER_X} 0)`;
  }

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
