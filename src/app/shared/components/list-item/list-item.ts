import { Component, ElementRef, computed, effect, input, signal, viewChild } from '@angular/core';

import { MarqueeText } from '@shared/directives/marquee-text.directive';

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
// ЛЕВАЯ сторона строки НИКОГДА не зависит от её ширины (остриё всегда стоит
// у x=0, независимо от того, насколько узкий/широкий контейнер) — в отличие
// от правой стороны и главного тела (см. STATIC_RIGHT_EDGE_X/rowWidthDeltaPx()
// ниже), эти константы трогать не нужно.
const SUBPLATE_ANCHOR_X = 15;
const SUBPLATE_BODY_WIDTH = 104.75 - SUBPLATE_ANCHOR_X;
const BORDER_ANCHOR_X = 14.75;
const BORDER_STRAIGHT_WIDTH = 105.75 - BORDER_ANCHOR_X;

// Правый край строки в ИСХОДНОМ дизайне Schedule.svg (644px, см.
// DEFAULT_ROW_WIDTH_PX ниже) — общий якорь, от которого растягивается/
// сдвигается всё, что физически находится у правого края: главное тело
// пилюли (fillBodyTransform()), её обводка (strokeBodyTransform()) и
// декор-«колпачки» справа (rightSubplateTransform()/rightBorderStraightTransform()/
// rightBorderHookTransform()). paint0_linear (заливка) и правая подложка/
// граница используют ОДИН И ТОТ ЖЕ правый край (643.75) — обводка
// (paint4_linear) на 0.5 у́же (её контур идёт по центру штриха заливки).
const STATIC_RIGHT_EDGE_X = 643.75;
const STATIC_RIGHT_STROKE_EDGE_X = 643.25;

const RIGHT_SUBPLATE_WIDTH = STATIC_RIGHT_EDGE_X - 542.75;
const RIGHT_BORDER_STRAIGHT_WIDTH = STATIC_RIGHT_EDGE_X - 552.75;

// Главное тело пилюли (заливка `paint0_linear`, path `M643.75 3H26.7501...Z`,
// и обводка `paint4_linear`, path `M26.75 3.5C...H26.75Z`) — 9-slice ровно на
// ДВЕ части (не три, как у подложки/границы выше): у ОБОИХ path'ов есть
// кривой/остриё-образный левый торец и совершенно ПРЯМОЙ, без кривизны,
// правый край (простой вертикальный обрез) — в отличие от декоративной
// подложки/границы, у главного тела нет фигурного торца справа. Якоря — x,
// где в САМИХ path'ах кончается кривая и начинается прямая (у заливки —
// 26.7501, у обводки — свои 26.75, те же вершины в чуть более узком контуре
// обводки): фиксированное остриё (x <= якорь) + резиновая прямая часть
// (x >= якорь), тот же anchoredScale()-приём, что уже работает у
// subplateBodyTransform()/borderStraightTransform() ниже.
const FILL_BODY_ANCHOR_X = 26.7501;
const FILL_BODY_STRAIGHT_WIDTH = STATIC_RIGHT_EDGE_X - FILL_BODY_ANCHOR_X;
const STROKE_BODY_ANCHOR_X = 26.75;
const STROKE_BODY_STRAIGHT_WIDTH = STATIC_RIGHT_STROKE_EDGE_X - STROKE_BODY_ANCHOR_X;

// Собственный центр каждого варианта орнамента-разделителя в его исходных
// координатах из Schedule.svg (mask-rect'ы filter2_d/filter1_d) — тот же
// принцип анкора, что у anchoredScale(), но без масштаба: разделитель не
// растягивается, только переносится в вычисленную точку между сегментами
// (targetX - ORNAMENT_CENTER_X).
const LEFT_ORNAMENT_CENTER_X = 115.75 + 38 / 2;
const RIGHT_ORNAMENT_CENTER_X = 543.75 - 38 / 2;

// N=1 — единственный сегмент, границ между сегментами нет (не от чего
// оттолкнуться) — подложка использует ту же исходную геометрию, что и у
// одиночной центральной подложки при нулевых сдвигах (см. soloBox() ниже —
// на узкой строке она клэмпится в доступное пространство, а не остаётся на
// этих "натуральных" координатах безусловно).
const SOLO_CENTER_SUBPLATE_X = 169.75;
const SOLO_CENTER_SUBPLATE_WIDTH = 320;

// Текст сегмента должен занимать РОВНО ту же область, что и его подложка —
// по прямому запросу пользователя ("выровнять области текста и подложку —
// они должны соответствовать"). Раньше текст (CSS `flex`, `inset: 0 24px 0
// 30px`/`gap: 16px`, подобранные на глаз) и декор (координаты, снятые с
// самого Schedule.svg) были ДВУМЯ независимыми, никогда не откалиброванными
// друг под друга системами координат — расходились в размере и позиции.
// Теперь используется ОДНА система: все текстовые/декоративные боксы
// считаются последовательно (segmentBoxes() ниже) от одного и того же
// левого края (startTextLeft(), см. ниже) до одного и того же правого
// (endTextRight(), см. ниже).
//
// На широкой раскладке — 56.75 (формула ниже, выведена под BASELINE-ширину
// первого сегмента 48px, см. FIRST_SEGMENT_BASELINE_WIDTH_PX). На
// компактной этот отступ не масштабируется вместе с шириной строки САМ ПО
// СЕБЕ (в отличие от endTextRight()) — при узком дне/времени (26px,
// ScheduleWidget, `stream.Front#150`) он оставался ровно тем же 56.75px,
// вне зависимости от того, насколько сузили сам сегмент, из-за чего текст
// на компактной ширине начинался с непропорционально большим отступом от
// левого края (по прямому запросу пользователя — "чтобы начинался прям
// сначала, как в HD"). START_TEXT_LEFT_COMPACT — тот же принцип, что
// BOUNDARY_GAP_COMPACT: отдельное меньшее значение, включается тем же
// признаком (isCompact()), а не пересчитывается непрерывно.
const START_TEXT_LEFT_WIDE =
  SUBPLATE_ANCHOR_X + SUBPLATE_BODY_WIDTH - FIRST_SEGMENT_BASELINE_WIDTH_PX;
const START_TEXT_LEFT_COMPACT = 32;

// Зазор между соседними боксами — единый на любую границу (крайнюю или
// внутреннюю), а не унаследованный из Schedule.svg асимметричный (там левый/
// правый/центральный зазоры были все разными, т.к. в исходнике никогда не
// было больше одной внутренней границы). Ширины хватает, чтобы вместить сам
// орнамент-разделитель (38px) плюс отступ по ~8px с каждой стороны. Значение
// для широкой раскладки (644px, ResizeObserver даёт ровно DEFAULT_ROW_WIDTH_PX
// — см. boundaryGap() ниже).
const BOUNDARY_GAP_WIDE = 54;

// На компактной ширине (по прямому запросу пользователя — "мало текста,
// много пустоты") тот же отступ съедал у Schedule (3 сегмента, 2 границы)
// почти всё доступное место — среднему сегменту оставалось ~13px. Сужен до
// минимума, при котором орнамент-разделитель (38px) ещё не обрезается (+1px
// с каждой стороны, а не полноценные ~8px десктопного паддинга).
const BOUNDARY_GAP_COMPACT = 40;

// Ширина строки ДО реального измерения (первый рендер, либо ResizeObserver
// недоступен — напр. jsdom в юнит-тестах) — совпадает с исходным дизайном
// Schedule.svg, тот же приём, что DEFAULT_WIDTH у SectionTitle. После
// измерения (rowWidthPx() в самом компоненте, ResizeObserver на `.day-row`)
// именно от РЕАЛЬНОЙ ширины пересчитываются: правый край главного тела/
// обводки/декора-«колпачков» (rowWidthDeltaPx()), доступное сегментам место
// (endTextRight()) и ось зеркалирования `.day-row--mirrored`
// (dividerInstances()/centerSubplates() ниже) — раньше (stream.Front#150,
// до этого исправления) вся строка была на 644px захардкожена, из-за чего
// на компактном баре `MainCarousel` (реальная ширина ~300–360px) она не
// помещалась.
const DEFAULT_ROW_WIDTH_PX = 644;

/** `scale`-затем-`shift`, анкорится в `anchor` (та же формула, что у `Button`). */
function anchoredScale(anchor: number, scale: number): string {
  return `translate(${anchor} 0) scale(${scale} 1) translate(${-anchor} 0)`;
}

// Декор-«колпачки» у правого края (подложка/её граница, rightSubplateTransform()/
// rightBorderStraightTransform() ниже) сами не деформируются на узкой строке
// — при изменении ширины они просто СДВИГАЮТСЯ целиком: anchoredScale()
// внутри держит их СОБСТВЕННЫЙ, исходный якорь (STATIC_RIGHT_EDGE_X)
// неподвижным (тем самым по-прежнему корректно растягивая/сжимая их под
// lastSegmentShiftPx()), а внешний translate(deltaPx) переносит уже готовый
// результат на фактический новый правый край. При deltaPx===0 (ширина
// совпадает с исходной 644, в т.ч. дефолт до измерения) отдаёт БЕЗ обёртки —
// буквально тот же вид, что и до этого исправления (используется юнит-
// тестами, которые не мокают ResizeObserver).
function shiftedAnchoredScale(deltaPx: number, anchor: number, scale: number): string {
  const base = anchoredScale(anchor, scale);
  return deltaPx === 0 ? base : `translate(${deltaPx} 0) ${base}`;
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
 * (segmentBoxes() ниже) — НЕ от DOM-измерения (ResizeObserver), так
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
 * Раскладка сегментов — абсолютным позиционированием (`segmentBoxes()`),
 * единая последовательная система координат для ВСЕХ сегментов сразу (от
 * `startTextLeft()` до `endTextRight()`) — по прямому запросу пользователя
 * ("текст и подложка должны соответствовать"). Раньше текст и декор жили в
 * двух независимо подобранных системах координат (CSS `flex`/`inset`/`gap`
 * против координат из Schedule.svg) и расходились в размере/позиции —
 * теперь единственный источник истины на оба слоя.
 *
 * Декор перенесён 1:1 из Schedule.svg (детали — см. историю компонента до
 * переименования в PROJECT_MAP.md), `id`/`url(#...)` — с `uid`-суффиксом.
 *
 * Ширина всей строки (`stream.Front#150`) — РЕАЛЬНО измеренная ширина
 * `.day-row` (`rowWidthPx()`, `ResizeObserver`, тот же приём, что
 * `SectionTitle`/`NewsDetailModal`), не фиксированные 644px: главное тело
 * пилюли (заливка/обводка) и декор-«колпачки» у правого края растягиваются/
 * сдвигаются под неё (см. комментарии у `STATIC_RIGHT_EDGE_X`/
 * `rowWidthDeltaPx()`/`fillBodyTransform()`/`strokeBodyTransform()` выше и
 * ниже) — до этого исправления строка не помещалась на компактном баре
 * `MainCarousel` (реальная ширина ~300–360px). Текст сегмента, который не
 * помещается даже в пересчитанном (уменьшенном) боксе — автопрокрутка,
 * см. `MarqueeText` (`@shared/directives/marquee-text.directive.ts`),
 * применена универсально к каждому сегменту через `[appMarqueeText]`
 * в list-item.html, без отдельного кода в вызывающих виджетах.
 */
@Component({
  selector: 'app-list-item',
  imports: [MarqueeText],
  templateUrl: './list-item.html',
  styleUrl: './list-item.scss',
})
export class ListItem {
  protected readonly uid = `listitem${nextListItemUid++}`;

  readonly segments = input.required<ListItemSegment[]>();
  readonly dividers = input<ListItemDividers>([]);
  readonly direction = input<ListItemDirection>('left');

  private readonly rowEl = viewChild<ElementRef<HTMLDivElement>>('rowEl');
  /**
   * Реально измеренная ширина `.day-row` (`stream.Front#150`) —
   * `ResizeObserver` на сам контейнер, не пересчёт из CSS-брейкпоинтов
   * (`_breakpoints.scss`/`BreakpointObserver` тут не подходят: это per-
   * instance размер конкретного бара внутри `MainCarousel`, а не класс
   * страницы целиком). Дефолт — DEFAULT_ROW_WIDTH_PX, тот же приём "пока не
   * измерено — оригинал", что у `SectionTitle`/`NewsDetailModal`.
   */
  protected readonly rowWidthPx = signal(DEFAULT_ROW_WIDTH_PX);

  // Компактной ширину считаем по тому же признаку, что уже отличает "сжатую"
  // строку от широкой (list-item.scss, `@include bp.small { width: 100% }`)
  // — на широкой раскладке CSS всегда даёт ровно 644px, ResizeObserver не
  // сможет измерить меньше; второй источник правды не заводим.
  private readonly isCompact = computed(() => this.rowWidthPx() < DEFAULT_ROW_WIDTH_PX);
  private readonly boundaryGap = computed(() =>
    this.isCompact() ? BOUNDARY_GAP_COMPACT : BOUNDARY_GAP_WIDE,
  );
  private readonly startTextLeft = computed(() =>
    this.isCompact() ? START_TEXT_LEFT_COMPACT : START_TEXT_LEFT_WIDE,
  );

  constructor() {
    effect((onCleanup) => {
      const el = this.rowEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.rowWidthPx.set(entry.contentRect.width),
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

  // `[attr.width]`/`[attr.viewBox]` SVG должны совпадать 1:1 (viewBox по
  // ширине = width) — иначе браузер сам масштабирует всю картинку целиком
  // поверх anchoredScale()-трансформаций ниже (не деформировать декор —
  // прямое требование, см. JSDoc класса/PR).
  protected readonly viewBox = computed(() => `-2 0 ${this.rowWidthPx()} 58`);

  // Разница между реально измеренной шириной и исходной (DEFAULT_ROW_WIDTH_PX,
  // дизайн Schedule.svg) — единственная величина, нужная, чтобы и сдвинуть
  // декор правого края (rightSubplateTransform()/rightBorderStraightTransform()/
  // rightBorderHookTransform()), и растянуть резиновую середину главного тела/
  // обводки (fillBodyTransform()/strokeBodyTransform()) на фактический новый
  // правый край.
  private readonly rowWidthDeltaPx = computed(() => this.rowWidthPx() - DEFAULT_ROW_WIDTH_PX);

  // Правый край доступного сегментам пространства — РЕАКТИВНОЕ зеркало
  // прежней константы END_TEXT_RIGHT (598.75 при ширине 644, совпадает
  // 1:1: 644 − 0.25 − 101 + 56 = 598.75), но растёт/убывает вместе с
  // rowWidthPx(), НЕПРЕРЫВНО. startTextLeft() (см. выше) — левый край строки
  // не пересчитывается непрерывно вместе с шириной, но переключается между
  // двумя значениями по isCompact() (тот же принцип, что boundaryGap()).
  protected readonly endTextRight = computed(() => {
    const rightEdgeX = this.rowWidthPx() - (DEFAULT_ROW_WIDTH_PX - STATIC_RIGHT_EDGE_X);
    return rightEdgeX - RIGHT_SUBPLATE_WIDTH + LAST_SEGMENT_BASELINE_WIDTH_PX;
  });

  // Пиксельная ширина каждого сегмента — для фиксированной px-строки
  // (`'48px'`) берётся напрямую; для "резиновых" (`number`/без width) делит
  // оставшееся после вычета всех фиксированных ширин и зазоров место
  // пропорционально своим числам (та же арифметика, что настоящий CSS
  // `flex-grow` — по прямому уточнению пользователя обычно "резиновый"
  // сегмент только один, но формула корректна и для нескольких). Доступное
  // место считается от startTextLeft() до endTextRight(), той же единой
  // системы координат, что и у самих подложек — не отдельного CSS-инсета.
  protected readonly segmentWidthsPx = computed(() => {
    const segments = this.segments();
    if (segments.length < 2) return segments.map(() => 0);

    const gapTotal = (segments.length - 1) * this.boundaryGap();
    const available = this.endTextRight() - this.startTextLeft() - gapTotal;

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

  // Единственный сегмент (N=1) — та же ЦЕНТРАЛЬНАЯ подложка, что и раньше
  // (SOLO_CENTER_SUBPLATE_X/WIDTH — исходные, "натуральные" координаты из
  // /kit), НО зажатая в доступное строке пространство (startTextLeft()..
  // endTextRight()): на дефолтной (644, ещё не измеренной) ширине доступного
  // места хватает с запасом — клэмп ничего не меняет, отдаёт буквально
  // 169.75/320 (используется юнит-тестами). На реально узком компактном баре
  // (endTextRight() заметно меньше 598.75) без этого зажима эта подложка
  // (используется в т.ч. скелетон-строкой `List.loaderSegments` — она видна
  // на КАЖДОЙ загрузке ScheduleWidget/DonatorsWidget) заезжала бы за
  // фактический правый край строки.
  private readonly soloBox = computed(() => {
    const availableRight = this.endTextRight();
    const naturalRight = SOLO_CENTER_SUBPLATE_X + SOLO_CENTER_SUBPLATE_WIDTH;
    const clampedRight = Math.min(naturalRight, availableRight);
    const x = Math.min(
      SOLO_CENTER_SUBPLATE_X,
      Math.max(this.startTextLeft(), clampedRight - SOLO_CENTER_SUBPLATE_WIDTH),
    );
    return { x, width: Math.max(0, clampedRight - x) };
  });

  // Бокс (x/width) каждого сегмента — единственный источник истины и для
  // текста, и для подложки: последовательно, от startTextLeft(), ширина
  // каждого — ровно его "логическая" ширина (segmentWidthsPx()), без
  // поправок по роли. Крайние боксы автоматически стыкуются своим ПРАВЫМ
  // (первый) / ЛЕВЫМ (последний) краем с реальным краем подложки при любой
  // ширине — это гарантирует сама формула startTextLeft()/endTextRight()
  // (обе выведены так, что box.x±box.width всегда алгебраически совпадает
  // с SUBPLATE_ANCHOR_X+SUBPLATE_BODY_WIDTH+firstSegmentShiftPx() и
  // симметричным выражением справа — см. firstSegmentShiftPx()/
  // lastSegmentShiftPx() ниже, тождество не требует отдельной поправки).
  // При N=1 границ нет — soloBox() выше.
  protected readonly segmentBoxes = computed(() => {
    const segments = this.segments();
    if (segments.length === 1) {
      return [this.soloBox()];
    }
    const widths = this.segmentWidthsPx();
    const boxes: { x: number; width: number }[] = [];
    let cursor = this.startTextLeft();
    for (const width of widths) {
      const boxWidth = width ?? 0;
      boxes.push({ x: cursor, width: boxWidth });
      cursor += boxWidth + this.boundaryGap();
    }
    return boxes;
  });

  // x каждого разделителя — середина зазора между боксом сегмента i и i+1,
  // той же единой геометрии, что и сами боксы (не отдельная система
  // координат) — при N=1 границ нет вовсе (по прямому запросу пользователя
  // — "разделителя нет только если 1 элемент"). Ось зеркалирования —
  // РЕАЛЬНО измеренная ширина строки (rowWidthPx()), не DEFAULT_ROW_WIDTH_PX
  // — `.day-row--mirrored` (`direction: 'right'`) зеркалит CSS-ом фактический
  // (не дизайн-время) бокс `.day-row`.
  protected readonly dividerInstances = computed(() => {
    const count = this.segments().length;
    if (count < 2) return [];
    const boxes = this.segmentBoxes();
    const dividers = this.dividers();
    const mirrored = this.direction() === 'right';
    const rowWidth = this.rowWidthPx();
    return Array.from({ length: count - 1 }, (_, i) => {
      const box = boxes[i];
      const rawX = (box?.x ?? 0) + (box?.width ?? 0) + this.boundaryGap() / 2;
      const x = mirrored ? rowWidth - rawX : rawX;
      return { x, type: dividers[i] ?? 'left' };
    });
  });

  protected leftOrnamentTransform(x: number): string {
    return `translate(${x - LEFT_ORNAMENT_CENTER_X} 0)`;
  }

  protected rightOrnamentTransform(x: number): string {
    return `translate(${x - RIGHT_ORNAMENT_CENTER_X} 0)`;
  }

  // Главное тело пилюли (заливка) — фиксированное остриё слева не трогаем
  // вовсе (tip-путь без transform), прямая часть (x >= FILL_BODY_ANCHOR_X)
  // растягивается анкором в FILL_BODY_ANCHOR_X до фактического нового
  // правого края (STATIC_RIGHT_EDGE_X + rowWidthDeltaPx()) — тот же принцип,
  // что subplateBodyTransform() ниже, но целевая ширина берётся прямо из
  // rowWidthDeltaPx(), а не firstSegmentShiftPx() (это не про ширину
  // сегмента, а про ширину всей строки).
  protected readonly fillBodyTransform = computed(() =>
    anchoredScale(
      FILL_BODY_ANCHOR_X,
      (FILL_BODY_STRAIGHT_WIDTH + this.rowWidthDeltaPx()) / FILL_BODY_STRAIGHT_WIDTH,
    ),
  );
  // Обводка главного тела — тот же приём, свои (чуть более узкие) якорь/ширина.
  protected readonly strokeBodyTransform = computed(() =>
    anchoredScale(
      STROKE_BODY_ANCHOR_X,
      (STROKE_BODY_STRAIGHT_WIDTH + this.rowWidthDeltaPx()) / STROKE_BODY_STRAIGHT_WIDTH,
    ),
  );

  // Подложка-«стрелка» (декор) в исходнике всегда рисуется в ЛОКАЛЬНЫХ
  // координатах у левого края строки (под сегментом с индексом 0) — при
  // direction: 'right' весь декор (в т.ч. эта подложка) физически зеркалится
  // на экран (см. `.day-row--mirrored` в list-item.scss), и после
  // зеркалирования экранно оказывается под сегментом с ПОСЛЕДНИМ индексом
  // (текст, в отличие от декора, зеркалирование не затрагивает —
  // .day-row__content). Поэтому "какой бокс задаёт её растяжение" — это не
  // всегда segmentBoxes()[0], а именно тот бокс, что реально окажется под
  // ней на экране после зеркалирования (startBoxIndex()) — без этой
  // поправки при несимметричных сегментах подложка растягивалась под
  // ширину ЧУЖОГО (левого) сегмента, а не того, что физически под ней (баг,
  // найденный пользователем на DonatorsWidget: ник — резиновый, сумма —
  // 90px).
  protected readonly startBoxIndex = computed(() =>
    this.direction() === 'right' ? this.segmentBoxes().length - 1 : 0,
  );
  protected readonly endBoxIndex = computed(() =>
    this.direction() === 'right' ? 0 : this.segmentBoxes().length - 1,
  );

  protected readonly firstSegmentShiftPx = computed(() => {
    if (this.segments().length < 2) return 0;
    return this.segmentBoxes()[this.startBoxIndex()].width - FIRST_SEGMENT_BASELINE_WIDTH_PX;
  });

  // Подложка и её граница не просто сдвигаются — растягиваются (левый край,
  // включая остриё-«стрелку» подложки и «крючок» границы, остаётся на месте,
  // растягивается только прямая середина), по прямому запросу пользователя.
  // «Крючок» границы (borderCurlTransform()) — просто сдвигается вместе, он
  // не часть растягиваемой прямой, а фиксированный декор на её конце.
  protected readonly subplateBodyTransform = computed(() =>
    anchoredScale(
      SUBPLATE_ANCHOR_X,
      (SUBPLATE_BODY_WIDTH + this.firstSegmentShiftPx()) / SUBPLATE_BODY_WIDTH,
    ),
  );
  protected readonly borderStraightTransform = computed(() =>
    anchoredScale(
      BORDER_ANCHOR_X,
      (BORDER_STRAIGHT_WIDTH + this.firstSegmentShiftPx()) / BORDER_STRAIGHT_WIDTH,
    ),
  );
  protected readonly borderCurlTransform = computed(
    () => `translate(${this.firstSegmentShiftPx()} 0)`,
  );

  // Зеркало firstSegmentShiftPx() — тот же принцип с endBoxIndex() (по
  // умолчанию последний бокс, при direction: 'right' — первый, т.к. ЭТА
  // подложка после зеркалирования экранно уезжает под сегмент с индексом 0).
  // Сам сдвиг декора при использовании направлен влево (отрицательный x),
  // см. rightBorderHookTransform() ниже.
  protected readonly lastSegmentShiftPx = computed(() => {
    const boxes = this.segmentBoxes();
    if (boxes.length < 2) return 0;
    return boxes[this.endBoxIndex()].width - LAST_SEGMENT_BASELINE_WIDTH_PX;
  });

  // Правая подложка/граница растягиваются влево (анкор — фиксированный правый
  // край у обеих в исходном дизайне, STATIC_RIGHT_EDGE_X, тот же принцип, что
  // у левых subplateBodyTransform()/borderStraightTransform()), ЗАТЕМ (см.
  // shiftedAnchoredScale()) весь уже растянутый результат переносится на
  // фактический правый край строки (rowWidthDeltaPx()); «крючок» границы —
  // просто сдвигается влево вместе (rightBorderHookTransform()) плюс тот же
  // перенос.
  protected readonly rightSubplateTransform = computed(() =>
    shiftedAnchoredScale(
      this.rowWidthDeltaPx(),
      STATIC_RIGHT_EDGE_X,
      (RIGHT_SUBPLATE_WIDTH + this.lastSegmentShiftPx()) / RIGHT_SUBPLATE_WIDTH,
    ),
  );
  protected readonly rightBorderStraightTransform = computed(() =>
    shiftedAnchoredScale(
      this.rowWidthDeltaPx(),
      STATIC_RIGHT_EDGE_X,
      (RIGHT_BORDER_STRAIGHT_WIDTH + this.lastSegmentShiftPx()) / RIGHT_BORDER_STRAIGHT_WIDTH,
    ),
  );
  protected readonly rightBorderHookTransform = computed(
    () => `translate(${this.rowWidthDeltaPx() - this.lastSegmentShiftPx()} 0)`,
  );

  // Роль сегмента определяет, какая у него подложка: 1-й (при >=2 сегментах)
  // — «начальная» (стрелка, subplateBodyTransform() и т.п. выше), последний
  // (при >=2) — «конечная» (rightSubplateTransform() и т.п.), сегменты МЕЖДУ
  // ними (индексы 1..N-2) — «центральная», по одной на каждый, N-2 штук.
  // Бокс каждой центральной подложки — ровно бокс её сегмента (segmentBoxes()),
  // тот же самый, что и у текста — единая геометрия, никакого отдельного
  // зазора от разделителя не считается (уже заложен в boundaryGap() при
  // построении самих боксов). При N=1 — soloBox() (см. segmentBoxes()),
  // при N<=2 центральных нет вовсе (0..N-2 сегментов между начальным/
  // конечным, пусто, когда их не больше 2).
  protected readonly hasStartAndEnd = computed(() => this.segments().length >= 2);
  protected readonly centerSubplates = computed(() => {
    const count = this.segments().length;
    if (count === 1) return this.segmentBoxes();
    if (count < 3) return [];
    const boxes = this.segmentBoxes().slice(1, -1);
    if (this.direction() !== 'right') return boxes;
    // Как и у dividerInstances() выше — эти подложки декоративные (зеркалятся
    // вместе с остальным декором), а не текстовые, поэтому при direction:
    // 'right' их бокс переносится в зеркальную позицию (rowWidthPx() -
    // правый край = новый левый край, РЕАЛЬНО измеренной шириной, не
    // DEFAULT_ROW_WIDTH_PX), иначе они физически рисуются не под своим
    // сегментом текста, а под соседним.
    const rowWidth = this.rowWidthPx();
    return boxes.map((box) => ({ x: rowWidth - box.x - box.width, width: box.width }));
  });
  // paint6_radial задан в userSpaceOnUse со своим gradientTransform (не
  // objectBoundingBox) — она не следует за x/width рекста автоматически,
  // пересчитываем центр/радиус вручную по той же формуле, что и у исходного
  // (центр = x + width/2, масштаб = width/2); каждая подложка — свой
  // инстанс градиента (id — uid + индекс), общий на все не подходит, т.к.
  // у каждой свои x/width.
  protected centerSubplateGradientTransform(subplate: { x: number; width: number }): string {
    const centerX = subplate.x + subplate.width / 2;
    return `translate(${centerX} 27) rotate(180) scale(${subplate.width / 2} 51)`;
  }

  // .day-row__segment — flex-контейнер (align-items: center для вертикального
  // центрирования однострочного текста), а flex-контейнеры игнорируют
  // text-align при позиционировании своего содержимого — за горизонтальное
  // положение внутри flex-контейнера отвечает justify-content, не text-align
  // (регрессия, появившаяся вместе с переходом на абсолютное позиционирование
  // сегментов — раньше .day-row__segment не было flex-контейнером).
  protected segmentJustifyContent(align: ListItemSegmentAlign | undefined): string {
    switch (align) {
      case 'center':
        return 'center';
      case 'right':
        return 'flex-end';
      default:
        return 'flex-start';
    }
  }
}
