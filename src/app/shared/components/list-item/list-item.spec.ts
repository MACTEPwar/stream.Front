import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ListItem, ListItemDirection, ListItemDividers, ListItemSegment } from './list-item';

// Те же якоря/ширины, что в list-item.ts (SUBPLATE_ANCHOR_X/SUBPLATE_BODY_WIDTH/
// BORDER_ANCHOR_X/BORDER_STRAIGHT_WIDTH) — продублированы здесь, чтобы ожидаемые
// строки transform считались той же арифметикой (не хардкодить округлённые
// вручную десятичные, которые могут не совпасть с float-представлением JS).
const SUBPLATE_ANCHOR_X = 15;
const SUBPLATE_BODY_WIDTH = 104.75 - SUBPLATE_ANCHOR_X;
const BORDER_ANCHOR_X = 14.75;
const BORDER_STRAIGHT_WIDTH = 105.75 - BORDER_ANCHOR_X;
const RIGHT_SUBPLATE_ANCHOR_X = 643.75;
const RIGHT_SUBPLATE_WIDTH = RIGHT_SUBPLATE_ANCHOR_X - 542.75;
const RIGHT_BORDER_ANCHOR_X = 643.75;
const RIGHT_BORDER_STRAIGHT_WIDTH = RIGHT_BORDER_ANCHOR_X - 552.75;
const FIRST_BASELINE = 48;
const LAST_BASELINE = 56;
// Текстовый бокс = бокс подложки, та же формула, что и START_TEXT_LEFT/
// END_TEXT_RIGHT/BOUNDARY_GAP в list-item.ts — продублированы здесь по тому
// же принципу, что и anchoredScale() ниже: считать ожидаемые значения ТОЙ
// ЖЕ формулой, не хардкодить округлённые вручную десятичные.
const START_TEXT_LEFT = SUBPLATE_ANCHOR_X + SUBPLATE_BODY_WIDTH - FIRST_BASELINE;
const END_TEXT_RIGHT = RIGHT_SUBPLATE_ANCHOR_X - RIGHT_SUBPLATE_WIDTH + LAST_BASELINE;
const BOUNDARY_GAP = 54;
const LEFT_ORNAMENT_CENTER_X = 115.75 + 38 / 2;
const RIGHT_ORNAMENT_CENTER_X = 543.75 - 38 / 2;

function anchoredScale(anchor: number, scale: number): string {
  return `translate(${anchor} 0) scale(${scale} 1) translate(${-anchor} 0)`;
}

function computeSegmentBoxes(widths: (number | string | undefined)[]): { x: number; width: number }[] {
  const gapTotal = (widths.length - 1) * BOUNDARY_GAP;
  const available = END_TEXT_RIGHT - START_TEXT_LEFT - gapTotal;
  let fixedTotal = 0;
  let flexTotal = 0;
  const parsed = widths.map((width) => {
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
  const logicalWidths = parsed.map((entry) => ('fixedPx' in entry ? entry.fixedPx : entry.flex * flexUnitPx));

  const boxes: { x: number; width: number }[] = [];
  let cursor = START_TEXT_LEFT;
  for (const width of logicalWidths) {
    const boxWidth = width ?? 0;
    boxes.push({ x: cursor, width: boxWidth });
    cursor += boxWidth + BOUNDARY_GAP;
  }
  return boxes;
}

function computeDividerPositions(widths: (number | string | undefined)[]): number[] {
  const boxes = computeSegmentBoxes(widths);
  const positions: number[] = [];
  for (let i = 0; i < boxes.length - 1; i++) {
    positions.push(boxes[i].x + boxes[i].width + BOUNDARY_GAP / 2);
  }
  return positions;
}

@Component({
  selector: 'app-list-item-host',
  imports: [ListItem],
  template: `<app-list-item [segments]="segments()" [dividers]="dividers()" [direction]="direction()" />`,
})
class ListItemHost {
  readonly segments = signal<ListItemSegment[]>([
    { text: 'Пн', width: '60px', align: 'left' },
    { text: 'Стрим на движке', width: 1, align: 'center' },
    { text: '20:00', width: '60px', align: 'right' },
  ]);
  readonly dividers = signal<ListItemDividers>([]);
  readonly direction = signal<ListItemDirection>('left');
}

// Каждый инстанс получает свой -{{uid}} суффикс на все id/url(#...) (см.
// list-item.html) — те же основания, что и у Button/SectionTitle.
describe('ListItem', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ListItemHost] });
  });

  it('рендерит по одному сегменту на элемент массива, с текстом и порядком как в segments()', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const texts = Array.from(el.querySelectorAll('.day-row__segment')).map((n) => n.textContent);
    expect(texts).toEqual(['Пн', 'Стрим на движке', '20:00']);
  });

  it('текстовый бокс каждого сегмента совпадает с боксом его подложки (единая геометрия — segmentBoxes())', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.detectChanges(); // host default: 60px / flex(1) / 60px

    const el: HTMLElement = fixture.nativeElement;
    const spans = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    const boxes = computeSegmentBoxes(['60px', 1, '60px']);
    spans.forEach((span, i) => {
      expect(span.style.left).toBe(`${boxes[i].x}px`);
      expect(span.style.width).toBe(`${boxes[i].width}px`);
    });
  });

  it('текстовый бокс первого/последнего сегмента точно стыкуется правым/левым краем с реальным краем подложки при любой ширине (subplateBodyTransform()/rightSubplateTransform())', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Четверг', width: '100px' },
      { text: 'Турнир', width: 1 },
      { text: '18:00', width: '90px' },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const [first, , last] = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    const firstShift = 100 - FIRST_BASELINE;
    const lastShift = 90 - LAST_BASELINE;
    // Правый край текстового бокса первого сегмента = правый край растянутой подложки.
    expect(Number.parseFloat(first.style.left) + Number.parseFloat(first.style.width)).toBeCloseTo(
      SUBPLATE_ANCHOR_X + SUBPLATE_BODY_WIDTH + firstShift,
    );
    // Левый край текстового бокса последнего сегмента = левый край растянутой подложки.
    expect(Number.parseFloat(last.style.left)).toBeCloseTo(
      RIGHT_SUBPLATE_ANCHOR_X - RIGHT_SUBPLATE_WIDTH - lastShift,
    );
  });

  it('текстовый бокс среднего сегмента совпадает с центральной подложкой и не зависит от собственного width() — геометрия целиком идёт от соседних сегментов', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Пн', width: '60px' },
      { text: 'Стрим', width: 1 },
      { text: '20:00', width: '60px' },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const middleWithFlex1 = (Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[])[1];
    const leftWidthFlex1 = [middleWithFlex1.style.left, middleWithFlex1.style.width];

    fixture.componentInstance.segments.set([
      { text: 'Пн', width: '60px' },
      { text: 'Стрим', width: 5 },
      { text: '20:00', width: '60px' },
    ]);
    fixture.detectChanges();

    const middleWithFlex5 = (Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[])[1];
    expect([middleWithFlex5.style.left, middleWithFlex5.style.width]).toEqual(leftWidthFlex1);
  });

  it('без width() у первого/последнего сегмента — текстовый бокс на базовой (нерастянутой) позиции подложки', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'A' }, { text: 'B' }]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const [first, last] = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    const boxes = computeSegmentBoxes([undefined, undefined]);
    expect(first.style.left).toBe(`${boxes[0].x}px`);
    expect(first.style.width).toBe(`${boxes[0].width}px`);
    expect(last.style.left).toBe(`${boxes[1].x}px`);
    expect(last.style.width).toBe(`${boxes[1].width}px`);
  });

  it('регрессия: последний сегмент "резиновый" (как первый фиксированный + последний flex) — получает широкий бокс без наложения на первый', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Сб', width: '48px' },
      { text: 'Кастомная игра', width: 1 },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const [first, last] = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    const boxes = computeSegmentBoxes(['48px', 1]);
    expect(first.style.left).toBe(`${boxes[0].x}px`);
    expect(first.style.width).toBe(`${boxes[0].width}px`);
    expect(last.style.left).toBe(`${boxes[1].x}px`);
    expect(last.style.width).toBe(`${boxes[1].width}px`);
    // Не пересекаются и не оставляют неожиданно широкий разрыв.
    expect(Number.parseFloat(last.style.left)).toBeCloseTo(
      Number.parseFloat(first.style.left) + Number.parseFloat(first.style.width) + BOUNDARY_GAP,
    );
  });

  it('align() — управляет text-align каждого сегмента независимо, дефолт "left"', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const segments = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    expect(segments[0].style.textAlign).toBe('left');
    expect(segments[1].style.textAlign).toBe('center');
    expect(segments[2].style.textAlign).toBe('right');
  });

  it('без align() — дефолтный text-align "left"', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'A' }]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect((el.querySelector('.day-row__segment') as HTMLElement).style.textAlign).toBe('left');
  });

  it('align() — управляет justify-content (не только text-align): .day-row__segment — flex-контейнер (вертикальное центрирование), text-align в нём не позиционирует содержимое', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const segments = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    expect(segments[0].style.justifyContent).toBe('flex-start');
    expect(segments[1].style.justifyContent).toBe('center');
    expect(segments[2].style.justifyContent).toBe('flex-end');
  });

  it('без align() — дефолтный justify-content "flex-start"', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'A' }]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect((el.querySelector('.day-row__segment') as HTMLElement).style.justifyContent).toBe('flex-start');
  });

  it('без color() у сегмента — дефолтный цвет #F9F9F9, с color() — используется он', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Вт' },
      { text: 'Оффлайн', color: '#CF1717' },
      { text: '--:--', color: '#CF1717' },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const segments = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    expect(segments[0].style.color).toBe('rgb(249, 249, 249)');
    expect(segments[1].style.color).toBe('rgb(207, 23, 23)');
    expect(segments[2].style.color).toBe('rgb(207, 23, 23)');
  });

  it('firstSegmentShiftPx() ≠ 0 — остриё подложки/«крючок» границы просто сдвигаются, прямые части подложки/границы растягиваются анкором в своей левой вершине', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Четверг', width: '100px' },
      { text: 'Турнир', width: 1 },
      { text: '18:00', width: '56px' },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const [subplateTip, subplateBody] = Array.from(svg.querySelectorAll('path[fill^="url(#paint3_radial"]'));
    const [borderStraight, borderCurl] = Array.from(svg.querySelectorAll('path[fill^="url(#paint8_linear"]'));

    // 100 - 48 = 52 (firstSegmentShiftPx)
    expect(subplateTip.getAttribute('transform')).toBeNull();
    expect(subplateBody.getAttribute('transform')).toBe(
      anchoredScale(SUBPLATE_ANCHOR_X, (SUBPLATE_BODY_WIDTH + 52) / SUBPLATE_BODY_WIDTH),
    );
    expect(borderStraight.getAttribute('transform')).toBe(
      anchoredScale(BORDER_ANCHOR_X, (BORDER_STRAIGHT_WIDTH + 52) / BORDER_STRAIGHT_WIDTH),
    );
    expect(borderCurl.getAttribute('transform')).toBe('translate(52 0)');
  });

  it('width() первого сегмента = базовым 48px — декор без сдвига/растяжения (identity-transform)', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Пн', width: '48px' },
      { text: 'Стрим', width: 1 },
      { text: '20:00', width: '56px' },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const [, subplateBody] = Array.from(svg.querySelectorAll('path[fill^="url(#paint3_radial"]'));
    const [borderStraight, borderCurl] = Array.from(svg.querySelectorAll('path[fill^="url(#paint8_linear"]'));
    expect(subplateBody.getAttribute('transform')).toBe(anchoredScale(SUBPLATE_ANCHOR_X, 1));
    expect(borderStraight.getAttribute('transform')).toBe(anchoredScale(BORDER_ANCHOR_X, 1));
    expect(borderCurl.getAttribute('transform')).toBe('translate(0 0)');
  });

  it('width() первого сегмента не задан фиксированным px (число/%/отсутствует) — подложка всё равно растягивается по фактически вычисленной (резиновой) ширине, а не остаётся на базовой', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'Пн', width: 1 }, { text: 'X' }, { text: 'Y' }]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const [, subplateBody] = Array.from(svg.querySelectorAll('path[fill^="url(#paint3_radial"]'));
    const boxes = computeSegmentBoxes([1, undefined, undefined]);
    const expectedScale = (SUBPLATE_BODY_WIDTH + (boxes[0].width - FIRST_BASELINE)) / SUBPLATE_BODY_WIDTH;
    expect(subplateBody.getAttribute('transform')).toBe(anchoredScale(SUBPLATE_ANCHOR_X, expectedScale));
  });

  it('lastSegmentShiftPx() ≠ 0 — правая подложка/прямая часть границы растягиваются влево анкором в фиксированном правом крае, «крючок» границы сдвигается влево', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Пн', width: '48px' },
      { text: 'Турнир выходного дня', width: 1 },
      { text: '18:00', width: '100px' },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const rightSubplate = svg.querySelector('path[fill^="url(#paint5_radial"]');
    const [rightBorderStraight, rightBorderHook] = Array.from(svg.querySelectorAll('path[fill^="url(#paint7_linear"]'));

    // 100 - 56 = 44 (lastSegmentShiftPx)
    expect(rightSubplate?.getAttribute('transform')).toBe(
      anchoredScale(RIGHT_SUBPLATE_ANCHOR_X, (RIGHT_SUBPLATE_WIDTH + 44) / RIGHT_SUBPLATE_WIDTH),
    );
    expect(rightBorderStraight.getAttribute('transform')).toBe(
      anchoredScale(RIGHT_BORDER_ANCHOR_X, (RIGHT_BORDER_STRAIGHT_WIDTH + 44) / RIGHT_BORDER_STRAIGHT_WIDTH),
    );
    expect(rightBorderHook.getAttribute('transform')).toBe('translate(-44 0)');
  });

  it('width() последнего сегмента = базовым 56px — правый декор без сдвига/растяжения (identity-transform)', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Пн', width: '48px' },
      { text: 'Стрим', width: 1 },
      { text: '20:00', width: '56px' },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const rightSubplate = svg.querySelector('path[fill^="url(#paint5_radial"]');
    expect(rightSubplate?.getAttribute('transform')).toBe(anchoredScale(RIGHT_SUBPLATE_ANCHOR_X, 1));
  });

  it('подложка резинового сегмента совпадает с его текстовым боксом при любой ширине соседних сегментов', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Четверг', width: '100px' },
      { text: 'Турнир', width: 1 },
      { text: '18:00', width: '100px' },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const centerRect = svg.querySelector('rect[fill^="url(#paint6_radial"]');
    const boxes = computeSegmentBoxes(['100px', 1, '100px']);
    expect(Number(centerRect?.getAttribute('x'))).toBeCloseTo(boxes[1].x);
    expect(Number(centerRect?.getAttribute('width'))).toBeCloseTo(boxes[1].width);
  });

  it('width() первого/последнего сегментов = базовым — подложка резинового сегмента на том же месте, что и text-бокс, без искусственного сдвига', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Пн', width: '48px' },
      { text: 'Стрим', width: 1 },
      { text: '20:00', width: '56px' },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const centerRect = svg.querySelector('rect[fill^="url(#paint6_radial"]');
    const boxes = computeSegmentBoxes(['48px', 1, '56px']);
    expect(Number(centerRect?.getAttribute('x'))).toBeCloseTo(boxes[1].x);
    expect(Number(centerRect?.getAttribute('width'))).toBeCloseTo(boxes[1].width);
  });

  it('первый разделитель следует за фактическим боксом первого сегмента — общая формула (box.right + BOUNDARY_GAP/2), единая для любой границы', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Четверг', width: '100px' },
      { text: 'Турнир', width: 1 },
      { text: '18:00', width: '56px' },
    ]);
    fixture.componentInstance.dividers.set(['left', 'right']);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const [leftInstance] = Array.from(svg.querySelectorAll('g[mask^="url(#mask-left-"]'));
    const [firstBoundary] = computeDividerPositions(['100px', 1, '56px']);
    expect(leftInstance.getAttribute('transform')).toBe(`translate(${firstBoundary - LEFT_ORNAMENT_CENTER_X} 0)`);
  });

  it('последний разделитель следует за фактическим боксом последнего сегмента — та же общая формула', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Пн', width: '48px' },
      { text: 'Турнир', width: 1 },
      { text: '18:00', width: '100px' },
    ]);
    fixture.componentInstance.dividers.set(['left', 'right']);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const [rightInstance] = Array.from(svg.querySelectorAll('g[mask^="url(#mask-right-"]'));
    const [, lastBoundary] = computeDividerPositions(['48px', 1, '100px']);
    expect(rightInstance.getAttribute('transform')).toBe(`translate(${lastBoundary - RIGHT_ORNAMENT_CENTER_X} 0)`);
  });

  it('строго внутренний разделитель (между 2-м и 3-м сегментом, только при 4 сегментах) — та же общая формула, что и у крайних', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Ср', width: '48px' },
      { text: 'Игра', width: 1 },
      { text: '2ч', width: '40px' },
      { text: '19:00', width: '56px' },
    ]);
    fixture.componentInstance.dividers.set(['left', 'right', 'left']);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    // Индекс 1 (граница между сегментом 1 и 2) — тип 'right' по dividers(), единственный right-инстанс.
    const [rightInstance] = Array.from(svg.querySelectorAll('g[mask^="url(#mask-right-"]'));
    const [, interiorBoundary] = computeDividerPositions(['48px', 1, '40px', '56px']);
    expect(rightInstance.getAttribute('transform')).toBe(`translate(${interiorBoundary - RIGHT_ORNAMENT_CENTER_X} 0)`);
  });

  it('без dividers() — дефолт "left" на каждой границе', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelectorAll('g[mask^="url(#mask-left-"]')).toHaveLength(2);
    expect(svg.querySelectorAll('g[mask^="url(#mask-right-"]')).toHaveLength(0);
  });

  it('dividers() — "none" на конкретном индексе скрывает только эту границу, остальные рендерятся по своему типу', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.dividers.set(['none', 'right']);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelectorAll('g[mask^="url(#mask-left-"]')).toHaveLength(0);
    expect(svg.querySelectorAll('g[mask^="url(#mask-right-"]')).toHaveLength(1);
  });

  it('1 сегмент — 0 границ, разделителей нет вовсе', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'Единственный', width: 1 }]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelectorAll('g[mask^="url(#mask-left-"]')).toHaveLength(0);
    expect(svg.querySelectorAll('g[mask^="url(#mask-right-"]')).toHaveLength(0);
  });

  it('4 сегмента — 3 границы, 3 разделителя (в т.ч. между 2-м и 3-м, не только по краям)', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Ср', width: '48px' },
      { text: 'Игра', width: 1 },
      { text: '2ч', width: '40px' },
      { text: '19:00', width: '56px' },
    ]);
    fixture.componentInstance.dividers.set(['left', 'right', 'left']);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelectorAll('g[mask^="url(#mask-left-"]')).toHaveLength(2);
    expect(svg.querySelectorAll('g[mask^="url(#mask-right-"]')).toHaveLength(1);
  });

  it('2 сегмента (не только 3) — рендерится без ошибок, декор слева/справа завязан на фактическую (в т.ч. резиновую) ширину первого/последнего сегмента', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Сб', width: '100px' },
      { text: 'Кастомная игра', width: 1 },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.day-row__segment')).toHaveLength(2);

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const [, subplateBody] = Array.from(svg.querySelectorAll('path[fill^="url(#paint3_radial"]'));
    // 100 - 48 = 52 (firstSegmentShiftPx)
    expect(subplateBody.getAttribute('transform')).toBe(
      anchoredScale(SUBPLATE_ANCHOR_X, (SUBPLATE_BODY_WIDTH + 52) / SUBPLATE_BODY_WIDTH),
    );
    // Второй сегмент ("Кастомная игра", резиновый) — тоже растягивает свою подложку по факту
    // вычисленной ширины (регрессия: раньше резиновый последний сегмент игнорировался, подложка
    // оставалась узкой на базовой ширине, а текст залезал за её пределы).
    const rightSubplate = svg.querySelector('path[fill^="url(#paint5_radial"]');
    const boxes = computeSegmentBoxes(['100px', 1]);
    const expectedScale = (RIGHT_SUBPLATE_WIDTH + (boxes[1].width - LAST_BASELINE)) / RIGHT_SUBPLATE_WIDTH;
    expect(rightSubplate?.getAttribute('transform')).toBe(anchoredScale(RIGHT_SUBPLATE_ANCHOR_X, expectedScale));
  });

  it('без direction() — дефолт "left", класс day-row--mirrored не применяется', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.detectChanges();

    const dayRow: HTMLElement = fixture.nativeElement.querySelector('.day-row');
    expect(dayRow.classList.contains('day-row--mirrored')).toBe(false);
  });

  it('direction() = "right" — весь декор зеркалится классом day-row--mirrored', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.direction.set('right');
    fixture.detectChanges();

    const dayRow: HTMLElement = fixture.nativeElement.querySelector('.day-row');
    expect(dayRow.classList.contains('day-row--mirrored')).toBe(true);
  });

  it('произвольное количество сегментов (не только 3) — рендерится без ошибок', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'A' }, { text: 'B' }]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.day-row__segment')).toHaveLength(2);
  });

  it('1 сегмент — только центральная подложка (по прямому запросу пользователя), начальной/конечной нет вовсе', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'Единственный', width: '100px' }]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.day-row__segment')).toHaveLength(1);

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelectorAll('path[fill^="url(#paint3_radial"]')).toHaveLength(0);
    expect(svg.querySelector('path[fill^="url(#paint5_radial"]')).toBeNull();
    const centerRects = svg.querySelectorAll('rect[fill^="url(#paint6_radial"]');
    expect(centerRects).toHaveLength(1);
    expect(centerRects[0].getAttribute('x')).toBe('169.75');
    expect(centerRects[0].getAttribute('width')).toBe('320');
  });

  it('2 сегмента — начальная/конечная подложка есть, центральной нет вовсе (нет сегмента между ними)', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Сб', width: '48px' },
      { text: 'Кастомная игра', width: 1 },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelectorAll('path[fill^="url(#paint3_radial"]')).toHaveLength(2);
    expect(svg.querySelector('path[fill^="url(#paint5_radial"]')).not.toBeNull();
    expect(svg.querySelectorAll('rect[fill^="url(#paint6_radial"]')).toHaveLength(0);
  });

  it('4 сегмента — начальная, конечная и 2 центральные подложки (по одной на каждый сегмент между ними), с одинаковым зазором от соседних разделителей', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Ср', width: '48px' },
      { text: 'Игра', width: 1 },
      { text: '2ч', width: '40px' },
      { text: '19:00', width: '56px' },
    ]);
    fixture.componentInstance.dividers.set(['left', 'right', 'left']);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelectorAll('path[fill^="url(#paint3_radial"]')).toHaveLength(2);
    expect(svg.querySelector('path[fill^="url(#paint5_radial"]')).not.toBeNull();
    const centerRects = Array.from(svg.querySelectorAll('rect[fill^="url(#paint6_radial"]')) as SVGRectElement[];
    expect(centerRects).toHaveLength(2);

    // Центральные подложки — ровно боксы сегментов 1 и 2 (segmentBoxes().slice(1,-1)),
    // та же единая геометрия, что и у текста — не отдельная формула с 35px-зазором.
    const boxes = computeSegmentBoxes(['48px', 1, '40px', '56px']);
    expect(Number(centerRects[0].getAttribute('x'))).toBeCloseTo(boxes[1].x);
    expect(Number(centerRects[0].getAttribute('width'))).toBeCloseTo(boxes[1].width);
    expect(Number(centerRects[1].getAttribute('x'))).toBeCloseTo(boxes[2].x);
    expect(Number(centerRects[1].getAttribute('width'))).toBeCloseTo(boxes[2].width);
  });

  it('поддерживаемый диапазон 1..4 сегмента — 4 сегмента рендерятся без ошибок', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Ср', width: '48px' },
      { text: 'Игра', width: 1 },
      { text: '2ч', width: '40px' },
      { text: '19:00', width: '56px' },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const texts = Array.from(el.querySelectorAll('.day-row__segment')).map((n) => n.textContent);
    expect(texts).toEqual(['Ср', 'Игра', '2ч', '19:00']);
  });

  it('несколько инстансов на одной странице — каждый использует свои собственные id/url(#...), не первого попавшегося', () => {
    const firstFixture = TestBed.createComponent(ListItemHost);
    firstFixture.detectChanges();

    const secondFixture = TestBed.createComponent(ListItemHost);
    secondFixture.componentInstance.segments.set([{ text: 'Ср' }, { text: 'X' }, { text: 'Y' }]);
    secondFixture.detectChanges();

    document.body.appendChild(firstFixture.nativeElement);
    document.body.appendChild(secondFixture.nativeElement);

    const firstSvg: SVGSVGElement = firstFixture.nativeElement.querySelector('.day-row__svg');
    const secondSvg: SVGSVGElement = secondFixture.nativeElement.querySelector('.day-row__svg');

    const firstFillUrl = firstSvg.querySelector('path[fill^="url(#paint0_linear"]')?.getAttribute('fill');
    const secondFillUrl = secondSvg.querySelector('path[fill^="url(#paint0_linear"]')?.getAttribute('fill');
    expect(firstFillUrl).not.toBe(secondFillUrl);

    const referencedId = secondFillUrl?.slice('url(#'.length, -1) ?? '';
    const resolved = document.getElementById(referencedId);
    expect(resolved).not.toBeNull();
    expect(secondSvg.contains(resolved)).toBe(true);

    document.body.removeChild(firstFixture.nativeElement);
    document.body.removeChild(secondFixture.nativeElement);
  });
});
