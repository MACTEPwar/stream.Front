import { Component, computed, input } from '@angular/core';

const VIEWBOX_HEIGHT = 51;
const RENDER_HEIGHT_PX = 48;
/** px per SVG-unit — constant regardless of width mode, since height never changes. */
const PX_PER_UNIT = RENDER_HEIGHT_PX / VIEWBOX_HEIGHT;

const ORIGINAL_WIDTH_UNITS = 320;
/** Exact px-equivalent of the original fixed 320-unit design (≈301.18px, was rounded to 301px before). */
const DEFAULT_WIDTH_PX = ORIGINAL_WIDTH_UNITS * PX_PER_UNIT;

// "Outer" layer (glow/filter0_i, rings/filter2_d, frame-line/filter5_d) — 5-block clip-path split
// already established: left tip / mid-left / center gap (gem) / mid-right / right tip.
const OUTER_LEFT = 28.1421;
const OUTER_RIGHT = ORIGINAL_WIDTH_UNITS - OUTER_LEFT; // 291.858, mirror
const GAP_LEFT = 150;
const GAP_RIGHT = 170;
const OUTER_MID_LEFT_W = GAP_LEFT - OUTER_LEFT; // 121.8579
const OUTER_MID_RIGHT_W = OUTER_RIGHT - GAP_RIGHT; // 121.858

// "Body" layer (solid fill + 2 gradient overlays, filter1_i) — 3-block split (its own natural
// corners, ~2 units further in than the outer layer's, since the body shape is inset from glow/frame).
const BODY_LEFT = 30.0523;
const BODY_RIGHT = ORIGINAL_WIDTH_UNITS - BODY_LEFT; // 289.948, mirror
const BODY_MID_W = BODY_RIGHT - BODY_LEFT; // 259.8957

/** Narrowest width before a stretchable block would invert (outer mid blocks hit 0 first). */
const MIN_VIEWBOX_WIDTH_UNITS = ORIGINAL_WIDTH_UNITS - 2 * OUTER_MID_LEFT_W;
const MIN_WIDTH_PX = MIN_VIEWBOX_WIDTH_UNITS * PX_PER_UNIT;

/** `scale`-then-`shift`, anchored at `anchor` (so `anchor` itself only moves by `shift`). */
function anchoredScale(anchor: number, scale: number, shift: number): string {
  return `translate(${anchor + shift} 0) scale(${scale} 1) translate(${-anchor} 0)`;
}

/**
 * Кнопка «Поддержать» (stream.Front#39) — перенос приложенного SVG (Frame 68,
 * 320×51). Динамика: текст (`text()`), иконка через content projection
 * ([icon], может быть пустой — тогда `.button__icon:empty` в button.scss
 * убирает её из flex-раскладки и текст остаётся один по центру), и ширина
 * (`width()`, px) — режим «фиксированные пиксели» из 9-slice-подобного
 * растягивания: скруглённые/острые концы (`OUTER_LEFT..OUTER_RIGHT` у glow/
 * колец/рамки, `BODY_LEFT..BODY_RIGHT` у заливки тела), центральный зазор
 * под гем и кольца/угловые блики (`mask0`) — фиксированного размера,
 * растягивается только плоская середина (2 блока по бокам от зазора у
 * «5-блочных» групп, единый блок у «3-блочной» body-группы); кольца по
 * прямому запросу пользователя вообще не масштабируются, только сдвигаются
 * центром вместе с гемом. Высота (48px) и масштаб px/unit — всегда
 * константа, поэтому при любой ширине острые концы рендерятся 1:1 с
 * оригиналом, без искажений. Без `width()` — ширина ровно как в
 * оригинальном макете (extra=0, все transform ниже вырождаются в identity).
 */
@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly text = input.required<string>();
  readonly width = input<number>();

  protected readonly widthPx = computed(() => Math.max(this.width() ?? DEFAULT_WIDTH_PX, MIN_WIDTH_PX));
  protected readonly viewBoxWidth = computed(() => this.widthPx() / PX_PER_UNIT);
  protected readonly viewBox = computed(() => `0 0 ${this.viewBoxWidth()} ${VIEWBOX_HEIGHT}`);
  private readonly extra = computed(() => this.viewBoxWidth() - ORIGINAL_WIDTH_UNITS);

  // Outer layer (5 blocks): 1st/5th (tips) untouched, 2nd/4th stretch, 3rd (gap) only shifts.
  protected readonly outerMidLeftTransform = computed(() => {
    const w = OUTER_MID_LEFT_W + this.extra() / 2;
    return anchoredScale(OUTER_LEFT, w / OUTER_MID_LEFT_W, 0);
  });
  protected readonly outerGapTransform = computed(() => `translate(${this.extra() / 2} 0)`);
  protected readonly outerMidRightTransform = computed(() => {
    const w = OUTER_MID_RIGHT_W + this.extra() / 2;
    return anchoredScale(GAP_RIGHT, w / OUTER_MID_RIGHT_W, this.extra() / 2);
  });
  protected readonly outerRightTransform = computed(() => `translate(${this.extra()} 0)`);

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

  // Icon's native size (fixed, never stretches) — PX_PER_UNIT is width-independent, so these are
  // true constants. Positioning itself is handled by the .button__content flex layout (button.scss).
  protected readonly iconWidthPx = 44 * PX_PER_UNIT;
  protected readonly iconHeightPx = 38 * PX_PER_UNIT;
}
