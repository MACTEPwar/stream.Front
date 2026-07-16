import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary';

const HEIGHT = 48;
const MARGIN = 3; // отступ от края viewBox — чтобы обводка/свечение не обрезались
const CORNER = 20; // горизонтальный вынос диагонали угла
const RADIUS = 6; // радиус скругления вершин

let uidSeq = 0;

/** Точка на отрезке from→to, отстоящая от `from` на `dist` (но не дальше середины). */
function offsetPoint(
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  dist: number,
): [number, number] {
  const dx = tx - fx;
  const dy = ty - fy;
  const len = Math.hypot(dx, dy) || 1;
  const t = Math.min(dist, len / 2) / len;
  return [fx + dx * t, fy + dy * t];
}

/**
 * Путь шестиугольника со скруглёнными вершинами (квадратичные дуги), точно
 * под заданную ширину. Вершины вычисляются от фактических размеров, поэтому
 * при любой ширине тянется только средняя часть, а углы (фикс. CORNER/RADIUS)
 * не искажаются.
 */
function roundedHexPath(w: number, h: number): string {
  const m = MARGIN;
  const pts: [number, number][] = [
    [m + CORNER, m],
    [w - m - CORNER, m],
    [w - m, h / 2],
    [w - m - CORNER, h - m],
    [m + CORNER, h - m],
    [m, h / 2],
  ];
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const [cx, cy] = pts[i];
    const [px, py] = pts[(i - 1 + n) % n];
    const [nx, ny] = pts[(i + 1) % n];
    const [ix, iy] = offsetPoint(cx, cy, px, py, RADIUS);
    const [ox, oy] = offsetPoint(cx, cy, nx, ny, RADIUS);
    d += `${i === 0 ? 'M' : 'L'}${ix.toFixed(2)} ${iy.toFixed(2)}`;
    d += `Q${cx.toFixed(2)} ${cy.toFixed(2)} ${ox.toFixed(2)} ${oy.toFixed(2)}`;
  }
  return `${d}Z`;
}

/**
 * Кнопка (stream.Front#39) по макету «Поддержать»/«Сетка» — целиком на чистом
 * SVG. Форма (скруглённый шестиугольник), заливка/верхняя тень (градиенты),
 * рамка, кольца, диамант — SVG-слои по одному вычисляемому пути. `ResizeObserver`
 * измеряет фактическую ширину (её задаёт текст + паддинги в `.button__content`),
 * путь пересчитывается под неё → тянется только середина, углы не искажаются,
 * шва по цвету/узору не существует (всё — один путь). `text` (required input),
 * `variant` (`'primary' | 'secondary'`), иконка — слот проекции `[icon]`.
 */
@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button implements AfterViewInit, OnDestroy {
  readonly text = input.required<string>();
  readonly variant = input<ButtonVariant>('primary');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private resizeObserver?: ResizeObserver;

  readonly height = HEIGHT;
  readonly margin = MARGIN;
  readonly width = signal(0);
  readonly uid = `btn-${uidSeq++}`;

  readonly viewBox = computed(() => `0 0 ${Math.max(this.width(), 1)} ${HEIGHT}`);
  readonly bodyPath = computed(() => roundedHexPath(Math.max(this.width(), 1), HEIGHT));
  readonly centerX = computed(() => Math.max(this.width(), 1) / 2);

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const w = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      this.zone.run(() => this.width.set(Math.round(w)));
    });
    this.resizeObserver.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
