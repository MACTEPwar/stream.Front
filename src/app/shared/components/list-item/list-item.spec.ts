import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ListItem, ListItemDividers, ListItemSegment } from './list-item';

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

@Component({
  selector: 'app-list-item-host',
  imports: [ListItem],
  template: `<app-list-item [segments]="segments()" [dividers]="dividers()" />`,
})
class ListItemHost {
  readonly segments = signal<ListItemSegment[]>([
    { text: 'Пн', width: '60px', align: 'left' },
    { text: 'Стрим на движке', width: 1, align: 'center' },
    { text: '20:00', width: '60px', align: 'right' },
  ]);
  readonly dividers = signal<ListItemDividers>({});
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

  it('firstSegmentShiftPx() ≠ 0 — остриё подложки/«крючок» границы/разделитель просто сдвигаются, прямые части подложки/границы растягиваются анкором в своей левой вершине', () => {
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
    const divider = svg.querySelector('g[mask^="url(#mask1"]');

    // 100 - 48 = 52 (firstSegmentShiftPx)
    expect(subplateTip.getAttribute('transform')).toBeNull();
    expect(subplateBody.getAttribute('transform')).toBe(
      anchoredScale(SUBPLATE_ANCHOR_X, (SUBPLATE_BODY_WIDTH + 52) / SUBPLATE_BODY_WIDTH),
    );
    expect(borderStraight.getAttribute('transform')).toBe(
      anchoredScale(BORDER_ANCHOR_X, (BORDER_STRAIGHT_WIDTH + 52) / BORDER_STRAIGHT_WIDTH),
    );
    expect(borderCurl.getAttribute('transform')).toBe('translate(52 0)');
    expect(divider?.getAttribute('transform')).toBe('translate(52 0)');
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

  it('lastSegmentShiftPx() ≠ 0 — правая подложка/прямая часть границы растягиваются влево анкором в фиксированном правом крае, «крючок» границы/разделитель сдвигаются влево', () => {
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
    const rightDivider = svg.querySelector('g[mask^="url(#mask0"]');

    // 100 - 56 = 44 (lastSegmentShiftPx)
    expect(rightSubplate?.getAttribute('transform')).toBe(
      anchoredScale(RIGHT_SUBPLATE_ANCHOR_X, (RIGHT_SUBPLATE_WIDTH + 44) / RIGHT_SUBPLATE_WIDTH),
    );
    expect(rightBorderStraight.getAttribute('transform')).toBe(
      anchoredScale(RIGHT_BORDER_ANCHOR_X, (RIGHT_BORDER_STRAIGHT_WIDTH + 44) / RIGHT_BORDER_STRAIGHT_WIDTH),
    );
    expect(rightBorderHook.getAttribute('transform')).toBe('translate(-44 0)');
    expect(rightDivider?.getAttribute('transform')).toBe('translate(-44 0)');
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
    const rightDivider = svg.querySelector('g[mask^="url(#mask0"]');
    expect(rightSubplate?.getAttribute('transform')).toBe(anchoredScale(RIGHT_SUBPLATE_ANCHOR_X, 1));
    expect(rightDivider?.getAttribute('transform')).toBe('translate(0 0)');
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

  it('без dividers() — оба разделителя рендерятся (дефолт "ornament")', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelector('g[mask^="url(#mask0"]')).not.toBeNull();
    expect(svg.querySelector('g[mask^="url(#mask1"]')).not.toBeNull();
  });

  it('dividers() — "none" скрывает соответствующий разделитель независимо от сегментов', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.dividers.set({ left: 'none' });
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelector('g[mask^="url(#mask1"]')).toBeNull();
    expect(svg.querySelector('g[mask^="url(#mask0"]')).not.toBeNull();
  });

  it('dividers() — оба "none" скрывает оба разделителя', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.dividers.set({ left: 'none', right: 'none' });
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('.day-row__svg');
    expect(svg.querySelector('g[mask^="url(#mask0"]')).toBeNull();
    expect(svg.querySelector('g[mask^="url(#mask1"]')).toBeNull();
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

  it('произвольное количество сегментов (не только 3) — рендерится без ошибок', () => {
    const fixture = TestBed.createComponent(ListItemHost);
    fixture.componentInstance.segments.set([{ text: 'A' }, { text: 'B' }]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.day-row__segment')).toHaveLength(2);
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
