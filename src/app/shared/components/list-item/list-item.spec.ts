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

function anchoredScale(anchor: number, scale: number): string {
  return `translate(${anchor} 0) scale(${scale} 1) translate(${-anchor} 0)`;
}

// Та же арифметика, что segmentWidthsPx()/boundaryPositions() в list-item.ts
// (продублирована по тому же принципу, что и anchoredScale() выше — считать
// ожидаемые значения той же формулой, не хардкодить округлённые вручную
// десятичные).
const CONTENT_LEFT_INSET = 30;
const CONTENT_GAP = 16;
const CONTENT_AVAILABLE_WIDTH = 644 - CONTENT_LEFT_INSET - 24;
const RIGHT_ORNAMENT_CENTER_X = 543.75 - 38 / 2;

function computeBoundaryPositions(widths: (number | string | undefined)[]): number[] {
  const gapTotal = Math.max(widths.length - 1, 0) * CONTENT_GAP;
  const available = CONTENT_AVAILABLE_WIDTH - gapTotal;
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
  const px = parsed.map((entry) => ('fixedPx' in entry ? entry.fixedPx : entry.flex * flexUnitPx));

  const positions: number[] = [];
  let x = CONTENT_LEFT_INSET;
  for (let i = 0; i < px.length - 1; i++) {
    x += px[i] ?? 0;
    positions.push(x + CONTENT_GAP / 2);
    x += CONTENT_GAP;
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

  it('width() строкой — фиксированная CSS-длина (flex: 0 0 <width>)', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const [first] = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    expect(first.style.flex).toBe('0 0 60px');
  });

  it('width() числом — пропорциональный flex-grow (flex: <n> <n> 0)', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const [, middle] = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    expect(middle.style.flex).toBe('1 1 0px');
  });

  it('без width() — дефолт flex: 1 1 0 (равная доля)', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'A' }, { text: 'B' }]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const segments = Array.from(el.querySelectorAll('.day-row__segment')) as HTMLElement[];
    expect(segments[0].style.flex).toBe('1 1 0px');
    expect(segments[1].style.flex).toBe('1 1 0px');
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

  it('width() первого сегмента не задан фиксированным px (число/%/отсутствует) — сдвига/растяжения нет', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'Пн', width: 1 }, { text: 'X' }, { text: 'Y' }]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const [, subplateBody] = Array.from(svg.querySelectorAll('path[fill^="url(#paint3_radial"]'));
    expect(subplateBody.getAttribute('transform')).toBe(anchoredScale(SUBPLATE_ANCHOR_X, 1));
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

  it('подложка резинового сегмента растягивается за оба края вместе с первым/последним сегментом, отступ от разделителей не меняется', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Четверг', width: '100px' },
      { text: 'Турнир', width: 1 },
      { text: '18:00', width: '100px' },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const centerRect = svg.querySelector('rect[fill^="url(#paint6_radial"]');

    // firstSegmentShiftPx = 100 - 48 = 52, lastSegmentShiftPx = 100 - 56 = 44
    expect(centerRect?.getAttribute('x')).toBe(`${169.75 + 52}`);
    expect(centerRect?.getAttribute('width')).toBe(`${320 - 52 - 44}`);
  });

  it('width() первого/последнего сегментов = базовым — подложка резинового сегмента без сдвига/растяжения', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([
      { text: 'Пн', width: '48px' },
      { text: 'Стрим', width: 1 },
      { text: '20:00', width: '56px' },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const centerRect = svg.querySelector('rect[fill^="url(#paint6_radial"]');
    expect(centerRect?.getAttribute('x')).toBe('169.75');
    expect(centerRect?.getAttribute('width')).toBe('320');
  });

  it('первый разделитель сохраняет тот же зазор от левой подложки, что и раньше — сдвигается вместе с firstSegmentShiftPx(), а не по общей CSS-арифметике границ', () => {
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
    // 100 - 48 = 52 (firstSegmentShiftPx) — тот же сдвиг, что у подложки/границы.
    expect(leftInstance.getAttribute('transform')).toBe('translate(52 0)');
  });

  it('последний разделитель сохраняет тот же зазор от правой подложки, что и раньше — сдвигается вместе с lastSegmentShiftPx()', () => {
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
    // 100 - 56 = 44 (lastSegmentShiftPx)
    expect(rightInstance.getAttribute('transform')).toBe('translate(-44 0)');
  });

  it('width() первого/последнего сегментов = базовым — оба разделителя без сдвига (identity-transform), как в исходном Schedule.svg', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.dividers.set(['left', 'right']);
    fixture.componentInstance.segments.set([
      { text: 'Пн', width: '48px' },
      { text: 'Стрим', width: 1 },
      { text: '20:00', width: '56px' },
    ]);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const [leftInstance] = Array.from(svg.querySelectorAll('g[mask^="url(#mask-left-"]'));
    const [rightInstance] = Array.from(svg.querySelectorAll('g[mask^="url(#mask-right-"]'));
    expect(leftInstance.getAttribute('transform')).toBe('translate(0 0)');
    expect(rightInstance.getAttribute('transform')).toBe('translate(0 0)');
  });

  it('строго внутренний разделитель (между 2-м и 3-м сегментом, только при 4 сегментах) — нет эталона в исходнике, позиция считается общей CSS-арифметикой границ', () => {
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
    const [, interiorBoundary] = computeBoundaryPositions(['48px', 1, '40px', '56px']);
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

  it('2 сегмента (не только 3) — рендерится без ошибок, декор слева/справа по-прежнему завязан на первый/последний сегмент', () => {
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
    // 100 - 48 = 52 (firstSegmentShiftPx, второй/последний сегмент без фикс. px-ширины не сдвигает правый декор)
    expect(subplateBody.getAttribute('transform')).toBe(
      anchoredScale(SUBPLATE_ANCHOR_X, (SUBPLATE_BODY_WIDTH + 52) / SUBPLATE_BODY_WIDTH),
    );
    const rightSubplate = svg.querySelector('path[fill^="url(#paint5_radial"]');
    expect(rightSubplate?.getAttribute('transform')).toBe(anchoredScale(RIGHT_SUBPLATE_ANCHOR_X, 1));
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

  it('поддерживаемый диапазон 1..4 сегмента — 1 сегмент рендерится без ошибок, декор слева/справа завязан на него же', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'Единственный', width: '100px' }]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.day-row__segment')).toHaveLength(1);

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    const [, subplateBody] = Array.from(svg.querySelectorAll('path[fill^="url(#paint3_radial"]'));
    const rightSubplate = svg.querySelector('path[fill^="url(#paint5_radial"]');
    // Один и тот же сегмент — одновременно и первый (база 48px), и последний
    // (база 56px): 100-48=52 слева, 100-56=44 справа — разные сдвиги у общего сегмента.
    expect(subplateBody.getAttribute('transform')).toBe(
      anchoredScale(SUBPLATE_ANCHOR_X, (SUBPLATE_BODY_WIDTH + 52) / SUBPLATE_BODY_WIDTH),
    );
    expect(rightSubplate?.getAttribute('transform')).toBe(
      anchoredScale(RIGHT_SUBPLATE_ANCHOR_X, (RIGHT_SUBPLATE_WIDTH + 44) / RIGHT_SUBPLATE_WIDTH),
    );
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
