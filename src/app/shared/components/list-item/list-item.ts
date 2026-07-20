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

// Собственный центр каждого варианта орнамента-разделителя в его исходных
// координатах из Schedule.svg (mask-rect'ы filter2_d/filter1_d) — тот же
// принцип анкора, что у anchoredScale(), но без масштаба: разделитель не
// растягивается, только переносится в вычисленную точку между сегментами
// (targetX - ORNAMENT_CENTER_X).
const LEFT_ORNAMENT_CENTER_X = 115.75 + 38 / 2;
const RIGHT_ORNAMENT_CENTER_X = 543.75 - 38 / 2;

// N=1 — единственный сегмент, границ между сегментами нет (не от чего
// оттолкнуться) — подложка использует ту же исходную геометрию, что и у
// одиночной центральной подложки при нулевых сдвигах.
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
// левого края (START_TEXT_LEFT) до одного и того же правого (END_TEXT_RIGHT)
// — оба выведены так, чтобы при БАЗОВЫХ ширинах (48px/56px) итоговая
// раскладка совпадала с исходным нерастянутым положением подложек в
// Schedule.svg (104.75 − 48 = 56.75 слева, 542.75 + 56 = 598.75 справа).
const START_TEXT_LEFT = SUBPLATE_ANCHOR_X + SUBPLATE_BODY_WIDTH - FIRST_SEGMENT_BASELINE_WIDTH_PX;
const END_TEXT_RIGHT = RIGHT_SUBPLATE_ANCHOR_X - RIGHT_SUBPLATE_WIDTH + LAST_SEGMENT_BASELINE_WIDTH_PX;

// Зазор между соседними боксами — единый на любую границу (крайнюю или
// внутреннюю), а не унаследованный из Schedule.svg асимметричный (там левый/
// правый/центральный зазоры были все разными, т.к. в исходнике никогда не
// было больше одной внутренней границы). Ширины хватает, чтобы вместить сам
// орнамент-разделитель (38px) плюс отступ по ~8px с каждой стороны.
const BOUNDARY_GAP = 54;

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
 * `START_TEXT_LEFT` до `END_TEXT_RIGHT`) — по прямому запросу пользователя
 * ("текст и подложка должны соответствовать"). Раньше текст и декор жили в
 * двух независимо подобранных системах координат (CSS `flex`/`inset`/`gap`
 * против координат из Schedule.svg) и расходились в размере/позиции —
 * теперь единственный источник истины на оба слоя.
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
  // сегмент только один, но формула корректна и для нескольких). Доступное
  // место считается от START_TEXT_LEFT до END_TEXT_RIGHT, той же единой
  // системы координат, что и у самих подложек — не отдельного CSS-инсета.
  protected readonly segmentWidthsPx = computed(() => {
    const segments = this.segments();
    if (segments.length < 2) return segments.map(() => 0);

    const gapTotal = (segments.length - 1) * BOUNDARY_GAP;
    const available = END_TEXT_RIGHT - START_TEXT_LEFT - gapTotal;

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

  // Бокс (x/width) каждого сегмента — единственный источник истины и для
  // текста, и для подложки: последовательно, от START_TEXT_LEFT, ширина
  // каждого — ровно его "логическая" ширина (segmentWidthsPx()), без
  // поправок по роли. Крайние боксы автоматически стыкуются своим ПРАВЫМ
  // (первый) / ЛЕВЫМ (последний) краем с реальным краем подложки при любой
  // ширине — это гарантирует сама формула START_TEXT_LEFT/END_TEXT_RIGHT
  // (обе выведены так, что box.x±box.width всегда алгебраически совпадает
  // с SUBPLATE_ANCHOR_X+SUBPLATE_BODY_WIDTH+firstSegmentShiftPx() и
  // симметричным выражением справа — см. firstSegmentShiftPx()/
  // lastSegmentShiftPx() ниже, тождество не требует отдельной поправки).
  // При N=1 границ нет — статичный соло-бокс.
  protected readonly segmentBoxes = computed(() => {
    const segments = this.segments();
    if (segments.length === 1) {
      return [{ x: SOLO_CENTER_SUBPLATE_X, width: SOLO_CENTER_SUBPLATE_WIDTH }];
    }
    const widths = this.segmentWidthsPx();
    const boxes: { x: number; width: number }[] = [];
    let cursor = START_TEXT_LEFT;
    for (const width of widths) {
      const boxWidth = width ?? 0;
      boxes.push({ x: cursor, width: boxWidth });
      cursor += boxWidth + BOUNDARY_GAP;
    }
    return boxes;
  });

  // x каждого разделителя — середина зазора между боксом сегмента i и i+1,
  // той же единой геометрии, что и сами боксы (не отдельная система
  // координат) — при N=1 границ нет вовсе (по прямому запросу пользователя
  // — "разделителя нет только если 1 элемент").
  protected readonly dividerInstances = computed(() => {
    const count = this.segments().length;
    if (count < 2) return [];
    const boxes = this.segmentBoxes();
    const dividers = this.dividers();
    return Array.from({ length: count - 1 }, (_, i) => {
      const box = boxes[i];
      const x = (box?.x ?? 0) + (box?.width ?? 0) + BOUNDARY_GAP / 2;
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
  // её граница) в исходнике рассчитан на конкретную ширину первого
  // сегмента — по прямому запросу пользователя эти элементы двигаются
  // вместе с фактическим боксом первого сегмента (segmentBoxes()[0]),
  // чтобы отступ между концом подложки и началом разделителя оставался
  // визуально таким же независимо от заданной ширины. Правый край бокса
  // (START_TEXT_LEFT + box.width) алгебраически совпадает с правым краем
  // растянутой подложки (SUBPLATE_ANCHOR_X + SUBPLATE_BODY_WIDTH + shift)
  // при ЛЮБОМ box.width — тождество за счёт того, как выведен START_TEXT_LEFT
  // (см. константу выше), поправка на роль сегмента не нужна.
  protected readonly firstSegmentShiftPx = computed(() => {
    if (this.segments().length < 2) return 0;
    return this.segmentBoxes()[0].width - FIRST_SEGMENT_BASELINE_WIDTH_PX;
  });

  // Подложка и её граница не просто сдвигаются — растягиваются (левый край,
  // включая остриё-«стрелку» подложки и «крючок» границы, остаётся на месте,
  // растягивается только прямая середина), по прямому запросу пользователя.
  // «Крючок» границы (borderCurlTransform()) — просто сдвигается вместе, он
  // не часть растягиваемой прямой, а фиксированный декор на её конце.
  protected readonly subplateBodyTransform = computed(() =>
    anchoredScale(SUBPLATE_ANCHOR_X, (SUBPLATE_BODY_WIDTH + this.firstSegmentShiftPx()) / SUBPLATE_BODY_WIDTH),
  );
  protected readonly borderStraightTransform = computed(() =>
    anchoredScale(BORDER_ANCHOR_X, (BORDER_STRAIGHT_WIDTH + this.firstSegmentShiftPx()) / BORDER_STRAIGHT_WIDTH),
  );
  protected readonly borderCurlTransform = computed(() => `translate(${this.firstSegmentShiftPx()} 0)`);

  // Зеркало firstSegmentShiftPx() — но от бокса ПОСЛЕДНЕГО сегмента, сам
  // сдвиг декора при использовании направлен влево (отрицательный x),
  // см. rightBorderHookTransform() ниже.
  protected readonly lastSegmentShiftPx = computed(() => {
    const boxes = this.segmentBoxes();
    if (boxes.length < 2) return 0;
    return boxes[boxes.length - 1].width - LAST_SEGMENT_BASELINE_WIDTH_PX;
  });

  // Правая подложка/граница растягиваются влево (анкор — фиксированный правый
  // край у обеих, тот же принцип, что у левых subplateBodyTransform()/
  // borderStraightTransform()); «крючок» границы — просто сдвигается влево
  // вместе (rightBorderHookTransform()).
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

  // Роль сегмента определяет, какая у него подложка: 1-й (при >=2 сегментах)
  // — «начальная» (стрелка, subplateBodyTransform() и т.п. выше), последний
  // (при >=2) — «конечная» (rightSubplateTransform() и т.п.), сегменты МЕЖДУ
  // ними (индексы 1..N-2) — «центральная», по одной на каждый, N-2 штук.
  // Бокс каждой центральной подложки — ровно бокс её сегмента (segmentBoxes()),
  // тот же самый, что и у текста — единая геометрия, никакого отдельного
  // зазора от разделителя не считается (уже заложен в BOUNDARY_GAP при
  // построении самих боксов). При N=1 — соло-подложка (см. segmentBoxes()),
  // при N<=2 центральных нет вовсе (0..N-2 сегментов между начальным/
  // конечным, пусто, когда их не больше 2).
  protected readonly hasStartAndEnd = computed(() => this.segments().length >= 2);
  protected readonly centerSubplates = computed(() => {
    const count = this.segments().length;
    if (count === 1) return this.segmentBoxes();
    if (count < 3) return [];
    return this.segmentBoxes().slice(1, -1);
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
