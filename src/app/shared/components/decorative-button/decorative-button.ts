import {
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';

const VIEWBOX_HEIGHT = 51;
const RENDER_HEIGHT_PX = 48;
/** px per SVG-unit — constant regardless of width mode, since height never changes. */
const PX_PER_UNIT = RENDER_HEIGHT_PX / VIEWBOX_HEIGHT;

const ORIGINAL_WIDTH_UNITS = 320;
/** Exact px-equivalent of the original fixed 320-unit design (≈301.18px, was rounded to 301px before). */
const DEFAULT_WIDTH_PX = ORIGINAL_WIDTH_UNITS * PX_PER_UNIT;

/** Отступ слева/справа от контента (иконка+зазор+текст) в режиме width="content". */
const CONTENT_PADDING_PX = 50;

/**
 * Отступ слева/справа от контента в режиме width="content-compact" — по
 * прямому запросу пользователя: обычный "content" (50px, рассчитан на
 * широкий desktop-вид) не даёт тексту поместиться в компактной/средней
 * строке шапки на реальном телефоне (`Shell`, shell.ts) — с ним текст
 * появлялся только с ~700px. `16px` (было `4px` в первой версии — на глаз
 * казалось, что паддинг "не учитывается": численно он был symmetричен
 * (проверено getBoundingClientRect — по 4px с обеих сторон буквально), но
 * визуально терялся на фоне заострённых концов декоративной рамки. `16px`
 * выбран уже не по геометрическому минимуму кнопки, а по прямому запросу
 * пользователя, когда область входа/аватара в компактном/среднем виде
 * перестала участвовать в адаптивном тексте (`Shell`, shell.ts,
 * showCompactActionText — теперь считает natural-ширину только у кнопки
 * «Поддержать») и в бюджете строки освободилось много места. Итог измерен
 * реальным Chromium через Playwright (`ng serve` + `chromium.launch()`,
 * тот же приём, что у 320px-минимума, см. PROJECT_MAP.md). Компактный
 * режим — та же 9-slice-геометрия (см. widthPx ниже), просто с более
 * тесным полем и уменьшенным шрифтом (`.button--compact`,
 * decorative-button.scss) — высота (48px) не меняется. `24px` (было
 * `16px`) — по повторному прямому запросу пользователя: иконка+текст
 * визуально "пересекались" с острыми концами рамки, добавлено ещё поля
 * (см. PROJECT_MAP.md).
 */
const CONTENT_COMPACT_PADDING_PX = 24;

/**
 * Высота иконки при `iconSize()==='compact'` — по прямому запросу
 * пользователя: полноразмерная иконка (38 unit ≈ 35.75px, тот же размер,
 * что и в широком виде) визуально "слишком большая" рядом/вместо
 * компактного текста (14px, line-height 18px, `.button--compact
 * .button__text`, decorative-button.scss) — почти вдвое выше строки
 * текста. Применяется в двух разных местах компактной/средней строки шапки
 * (`Shell`, shell.ts) — у текстового `content-compact` кнопки «Поддержать»
 * (рядом со своим же текстом) и у icon-only кнопки «Войти» с фиксированной
 * числовой шириной (по прямому запросу пользователя — та же цель:
 * ориентир на высоту текста «Поддержать», хотя у самой «Войти» текста
 * рядом нет). `20px` — «чуть-чуть больше высоты текста», ширина считается
 * по тому же соотношению сторон, что у полноразмерной иконки (44:38),
 * чтобы не исказить пропорции произвольной спроецированной картинки.
 */
const COMPACT_ICON_HEIGHT_PX = 20;
const COMPACT_ICON_WIDTH_PX = COMPACT_ICON_HEIGHT_PX * (44 / 38);

// Все id/url(#...) внутри главного SVG (decorative-button.html) захардкожены как в исходнике
// (_2821_998), к каждому добавляется -{{uid}} — иначе несколько <app-decorative-button> на
// одной странице (см. /kit) делят один и тот же id, и url(#...)/getElementById
// резолвится в ПЕРВЫЙ такой элемент в документе, а не в свой собственный (было
// незаметно, пока все инстансы были одного цвета — с появлением type() один
// экземпляр начал реально красить тело/glow другого: DOM внутри своего <svg>
// показывал верный цвет, а нарисованный пиксель — от чужого инстанса).
let nextButtonUid = 0;

// "Glow" layer (filter0_i) — 5-block clip-path split: left tip / mid-left / center gap (gem) /
// mid-right / right tip. The gap boundaries (GAP_LEFT/GAP_RIGHT) and the pure-shift transforms
// (gap, right tip) are shared with the frame layer below — only the tip/mid-block anchors differ
// per layer, since each shape's own corner vertices sit at slightly different x.
const GLOW_LEFT = 28.1421;
const GLOW_RIGHT = ORIGINAL_WIDTH_UNITS - GLOW_LEFT; // 291.858, mirror
const GAP_LEFT = 150;
const GAP_RIGHT = 170;
const GLOW_MID_LEFT_W = GAP_LEFT - GLOW_LEFT; // 121.8579
const GLOW_MID_RIGHT_W = GLOW_RIGHT - GAP_RIGHT; // 121.858

// "Frame" layer (stroke outline, filter5_d) — same 5-block scheme as glow, but its own natural
// corners (~2 units further in — the stroke sits inset from the glow, per its own path data).
const FRAME_LEFT = 30.0527;
const FRAME_RIGHT = ORIGINAL_WIDTH_UNITS - FRAME_LEFT; // 289.9473, mirror
const FRAME_MID_LEFT_W = GAP_LEFT - FRAME_LEFT; // 119.9473
const FRAME_MID_RIGHT_W = FRAME_RIGHT - GAP_RIGHT; // 119.9473

// "Body" layer (solid fill + 2 gradient overlays, filter1_i) — 3-block split (its own natural
// corners, ~2 units further in than the glow layer's, since the body shape is inset from glow/frame).
const BODY_LEFT = 30.0523;
const BODY_RIGHT = ORIGINAL_WIDTH_UNITS - BODY_LEFT; // 289.948, mirror
const BODY_MID_W = BODY_RIGHT - BODY_LEFT; // 259.8957

/** Narrowest width before a stretchable block would invert (glow mid blocks hit 0 first). */
const MIN_VIEWBOX_WIDTH_UNITS = ORIGINAL_WIDTH_UNITS - 2 * GLOW_MID_LEFT_W;
const MIN_WIDTH_PX = MIN_VIEWBOX_WIDTH_UNITS * PX_PER_UNIT;

/** `scale`-then-`shift`, anchored at `anchor` (so `anchor` itself only moves by `shift`). */
function anchoredScale(anchor: number, scale: number, shift: number): string {
  return `translate(${anchor + shift} 0) scale(${scale} 1) translate(${-anchor} 0)`;
}

/** `width()` помимо числа (px) принимает именованные раскладки. */
export type DecorativeButtonWidthMode = 'parent' | 'content' | 'content-compact';

/** `type()` — меняет только цвета (см. DecorativeButton в конструкторе), геометрия одна на оба. */
export type DecorativeButtonType = 'primary' | 'secondary';

/**
 * Кнопка «Поддержать» (stream.Front#39) — перенос приложенного SVG (Frame 68,
 * 320×51). Динамика: текст (`text()`, необязательный — без него `.button__text`
 * вообще не рендерится, DOM-пустой узел не нужен, см. decorative-button.html;
 * кнопка становится icon-only, аналогично тому, как пустая иконка даёт
 * text-only — та же симметрия. Раз видимого текста может не быть, доступное
 * имя кнопки не может полагаться только на textContent — `ariaLabel()`
 * прокидывается в `[attr.aria-label]` на нативную `<button>`, stream.Front#148),
 * иконка через content projection
 * ([icon], может быть пустой — тогда `.button__icon:empty` в decorative-button.scss
 * убирает её из flex-раскладки и текст остаётся один по центру), и ширина
 * (`width()`) — три режима поверх одного и того же 9-slice-подобного
 * растягивания: скруглённые/острые концы (`OUTER_LEFT..OUTER_RIGHT` у glow/
 * колец/рамки, `BODY_LEFT..BODY_RIGHT` у заливки тела), центральный зазор
 * под гем и кольца/угловые блики (`mask0`) — фиксированного размера,
 * растягивается только плоская середина (2 блока по бокам от зазора у
 * «5-блочных» групп, единый блок у «3-блочной» body-группы); кольца по
 * прямому запросу пользователя вообще не масштабируются, только сдвигаются
 * центром вместе с гемом. Высота (48px) и масштаб px/unit — всегда
 * константа, поэтому при любой ширине острые концы рендерятся 1:1 с
 * оригиналом, без искажений. Режимы `width()`: число (px) — фиксированный
 * размер; `'parent'` — тянется на всю ширину родителя (CSS 100% + измерение
 * фактического px ResizeObserver'ом для геометрии SVG); `'content'` —
 * иконка+8px-зазор+текст (естественная ширина, тоже ResizeObserver) + по
 * `CONTENT_PADDING_PX` слева/справа. Без `width()` — ширина ровно как в
 * оригинальном макете (extra=0, все transform ниже вырождаются в identity).
 * `type()` (`'primary'` по умолчанию | `'secondary'`) — та же геометрия,
 * отличаются цвета (glow/база тела/тон тела/текст — из исходника Frame 68_2;
 * рамка/блики/гем — подобранный лавандовый тон, в исходнике их нет), см.
 * константы выше.
 */
@Component({
  selector: 'app-decorative-button',
  imports: [],
  templateUrl: './decorative-button.html',
  styleUrl: './decorative-button.scss',
  // `.button__icon > *` (decorative-button.scss) должен дотягиваться до
  // спроецированной иконки (`<ng-content select="[icon]" />`) — та несёт
  // атрибут-скоуп родительского шаблона (места использования: shell.html и
  // т.п.), а не DecorativeButton, обычный скоупнутый селектор до неё не
  // достаёт (тот же приём/причина, что у `ButtonGroup`, см. button-group.ts).
  // Найдено предметно: у `login-icon.svg` (24×24, заметно меньше слота
  // 44×38 — в отличие от `button-support-icon.svg`, где несовпадение
  // маскировалось близостью размеров) `object-fit: contain`/`width: 100%`/
  // `height: 100%` не применялись вовсе — иконка рендерилась в своём
  // натуральном 24×24 и прижималась к левому верхнему углу слота, а не
  // центрировалась (по прямому запросу пользователя — «иконку на входе
  // сделай посредине по вертикали и горизонтали»).
  encapsulation: ViewEncapsulation.None,
})
export class DecorativeButton {
  protected readonly uid = `btn${nextButtonUid++}`;

  readonly text = input<string>();
  readonly width = input<number | DecorativeButtonWidthMode>();
  readonly type = input<DecorativeButtonType>('primary');
  /** Доступное имя кнопки, когда `text()` не задан (icon-only, stream.Front#148) — см. JSDoc класса. */
  readonly ariaLabel = input<string>();
  /**
   * Размер иконки — независим от `width()` (по прямому запросу пользователя:
   * компактная иконка нужна и у `content-compact` кнопки «Поддержать», и у
   * icon-only кнопки «Войти» с фиксированной числовой шириной — привязка
   * только к режиму ширины `content-compact` не покрыла бы второй случай).
   * `'default'` — полноразмерная (44×38 unit, как в макете); `'compact'` —
   * `COMPACT_ICON_WIDTH_PX`/`COMPACT_ICON_HEIGHT_PX` (20px высотой — «чуть
   * больше высоты компактного текста», `.button--compact .button__text`,
   * decorative-button.scss, 18px line-height).
   */
  readonly iconSize = input<'default' | 'compact'>('default');

  // 'secondary' — тот же 1:1 SVG (см. Frame 68_2, приложен пользователем). В самом
  // экспорте отличаются только 4 цвета (glow/база тела/тон тела/текст) — рамка,
  // блики, гем и серый paint0_radial-оверлей там буквально те же hex, что и у
  // primary. По прямому запросу пользователя ("тоже перекрасить") рамка/блики/гем
  // ниже ТОЖЕ перекрашены под secondary — но, в отличие от первых 4-х, для них
  // синих значений в экспорте НЕТ, это подобранный (не из исходника) светлый
  // лавандовый тон: `#DCDCFC` — уже существующий цвет (светлый конец textGradient
  // secondary), `#F0F0FF` — светлее его же, той же светлотной логики, что у
  // primary (`#F7ECB2`→`#FFF9DB`, тёплый → почти белый).
  private readonly isSecondary = computed(() => this.type() === 'secondary');
  protected readonly glowFill = computed(() => (this.isSecondary() ? '#8383F3' : '#F4E9AE'));
  protected readonly bodyBaseFill = computed(() => (this.isSecondary() ? '#3F3FAF' : '#EEC68C'));
  protected readonly bodyTintStart = computed(() => (this.isSecondary() ? '#26267B' : '#9B8474'));
  protected readonly bodyTintEnd = computed(() => (this.isSecondary() ? '#7171D5' : '#D5AF71'));
  protected readonly textGradient = computed(() =>
    this.isSecondary()
      ? 'linear-gradient(180deg, #7C7CFA 0%, #DCDCFC 100%)'
      : 'linear-gradient(180deg, #77531C 0%, #653908 100%)',
  );
  protected readonly sparkleFill = computed(() => (this.isSecondary() ? '#F0F0FF' : '#FFF9DB'));
  protected readonly gemFill = computed(() => (this.isSecondary() ? '#DCDCFC' : '#F8ECB2'));
  // Рамка (см. комментарий у paint4_radial_2821_998/_secondary в decorative-button.html) —
  // НЕ мутируем цвета одного градиента, переключаем ссылку между двумя
  // статичными градиентами (Chromium-баг с filter5_d, найден пиксельно).
  protected readonly frameStrokeUrl = computed(() =>
    this.isSecondary()
      ? `url(#paint4_radial_2821_998_secondary-${this.uid})`
      : `url(#paint4_radial_2821_998-${this.uid})`,
  );

  private readonly buttonEl = viewChild<ElementRef<HTMLButtonElement>>('buttonEl');
  private readonly contentInnerEl = viewChild<ElementRef<HTMLDivElement>>('contentInner');

  // Заполняются ResizeObserver'ом в конструкторе — реальный размер родителя
  // ('parent') и естественная (shrink-to-fit) ширина иконка+зазор+текст
  // ('content') известны только браузеру после раскладки, аналитически не
  // считаются. ResizeObserver недоступен в jsdom (юнит-тесты) — там сигналы
  // остаются на начальном значении, ниже MIN_WIDTH_PX это всё равно клампится.
  private readonly measuredParentWidthPx = signal(DEFAULT_WIDTH_PX);
  private readonly measuredContentInnerWidthPx = signal(0);

  protected readonly widthPx = computed(() => {
    const w = this.width();
    const raw =
      w === 'parent'
        ? this.measuredParentWidthPx()
        : w === 'content'
          ? this.measuredContentInnerWidthPx() + 2 * CONTENT_PADDING_PX
          : w === 'content-compact'
            ? this.measuredContentInnerWidthPx() + 2 * CONTENT_COMPACT_PADDING_PX
            : (w ?? DEFAULT_WIDTH_PX);
    return Math.max(raw, MIN_WIDTH_PX);
  });

  /** Класс `.button--compact` (decorative-button.scss) — уменьшенный шрифт текста. */
  protected readonly isCompactText = computed(() => this.width() === 'content-compact');

  // 'parent': реальная ширина .button не задаётся через widthPx() (это привело
  // бы к тому, что кнопка пиксельно "застревала" бы на последнем измерении
  // вместо того, чтобы реально тянуться за родителем) — вместо этого CSS 100%,
  // а widthPx() ниже используется только для внутренней геометрии SVG.
  protected readonly widthStyle = computed(() =>
    this.width() === 'parent' ? '100%' : `${this.widthPx()}px`,
  );

  protected readonly viewBoxWidth = computed(() => this.widthPx() / PX_PER_UNIT);
  protected readonly viewBox = computed(() => `0 0 ${this.viewBoxWidth()} ${VIEWBOX_HEIGHT}`);
  private readonly extra = computed(() => this.viewBoxWidth() - ORIGINAL_WIDTH_UNITS);

  constructor() {
    // 'parent' — измеряем фактический (заданный через CSS 100% в widthStyle())
    // размер .button, включая живую реакцию на ресайз родителя/окна.
    effect((onCleanup) => {
      if (this.width() !== 'parent') return;
      const el = this.buttonEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.measuredParentWidthPx.set(entry.contentRect.width),
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });

    // 'content'/'content-compact' — .button__content-inner, в отличие от
    // .button__content, не растянут position:absolute/inset:0, поэтому его
    // собственная ширина — это естественная ширина иконка+gap+текст, которую
    // уже посчитал flex (пустая иконка схлопывается в 0 через :empty в
    // decorative-button.scss; сам gap меньше в compact-режиме, `.button--compact`,
    // но измеряется тем же способом). Одно и то же измерение на оба режима —
    // отличается только множитель отступа в widthPx() (CONTENT_PADDING_PX/
    // CONTENT_COMPACT_PADDING_PX) — реагирует и на смену text(), и на
    // появление/исчезновение иконки — оба меняют размер этого блока.
    effect((onCleanup) => {
      if (this.width() !== 'content' && this.width() !== 'content-compact') return;
      const el = this.contentInnerEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.measuredContentInnerWidthPx.set(entry.contentRect.width),
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

  // Glow layer (5 blocks): 1st/5th (tips) untouched, 2nd/4th stretch, 3rd (gap) only shifts.
  protected readonly glowMidLeftTransform = computed(() => {
    const w = GLOW_MID_LEFT_W + this.extra() / 2;
    return anchoredScale(GLOW_LEFT, w / GLOW_MID_LEFT_W, 0);
  });
  protected readonly glowMidRightTransform = computed(() => {
    const w = GLOW_MID_RIGHT_W + this.extra() / 2;
    return anchoredScale(GAP_RIGHT, w / GLOW_MID_RIGHT_W, this.extra() / 2);
  });

  // Frame layer (5 blocks, own tip/mid-block anchors — see FRAME_LEFT/FRAME_RIGHT above).
  protected readonly frameMidLeftTransform = computed(() => {
    const w = FRAME_MID_LEFT_W + this.extra() / 2;
    return anchoredScale(FRAME_LEFT, w / FRAME_MID_LEFT_W, 0);
  });
  protected readonly frameMidRightTransform = computed(() => {
    const w = FRAME_MID_RIGHT_W + this.extra() / 2;
    return anchoredScale(GAP_RIGHT, w / FRAME_MID_RIGHT_W, this.extra() / 2);
  });

  // Shared by both 5-block layers: the gap (fixed width, only shifts) and right tip (shifts by the
  // full extra) don't depend on which layer's own corner anchors — same formula either way.
  protected readonly gapTransform = computed(() => `translate(${this.extra() / 2} 0)`);
  protected readonly rightTipTransform = computed(() => `translate(${this.extra()} 0)`);

  protected readonly rTipTransform = computed(() => `translate(${this.extra() - 6} 0)`);

  // Body layer (3 blocks): 1st (tip) untouched, 2nd (whole middle, incl. the tiny bottom notch) stretches.
  protected readonly bodyMidTransform = computed(() => {
    const w = BODY_MID_W + this.extra();
    return anchoredScale(BODY_LEFT, w / BODY_MID_W, 0);
  });
  protected readonly bodyRightTransform = computed(() => `translate(${this.extra()} 0)`);

  // Elements that stay their original size and just need to re-centre on resize: the gem marker
  // (filter3_d) and the rings+corner-sparkle group (mask0) — both sit at the fixed original centre
  // (x=160) and shift by half the extra width, same as the outer gap block.
  protected readonly centerShiftTransform = computed(() => `translate(${this.extra() / 2} 0)`);

  // Icon's native size — PX_PER_UNIT is width-independent, so the full-size constant never
  // changes. `iconSize()==='compact'` swaps it for the smaller COMPACT_ICON_* constants (по
  // прямому запросу пользователя — see их JSDoc выше); НЕ завязано на width()/isCompactText() —
  // тот же компактный размер нужен и у icon-only кнопок с фиксированной числовой шириной
  // (`.shell__login-icon-button`, shell.html), не только у `content-compact`. Positioning
  // itself is handled by the .button__content flex layout (decorative-button.scss).
  protected readonly iconWidthPx = computed(() =>
    this.iconSize() === 'compact' ? COMPACT_ICON_WIDTH_PX : 44 * PX_PER_UNIT,
  );
  protected readonly iconHeightPx = computed(() =>
    this.iconSize() === 'compact' ? COMPACT_ICON_HEIGHT_PX : 38 * PX_PER_UNIT,
  );
}
