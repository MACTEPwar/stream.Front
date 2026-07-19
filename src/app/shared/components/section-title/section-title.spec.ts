import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SectionTitle } from './section-title';

// jsdom не реализует ResizeObserver — section-title.ts это учитывает
// (typeof ResizeObserver === 'undefined' guard, ширина остаётся на
// DEFAULT_WIDTH). Чтобы всё же проверить реактивную геометрию (растягивание
// линий/сдвиг шеврона) без реального браузера, подменяем глобальный
// ResizeObserver фейком и триггерим его коллбэк вручную — тот же общий
// приём, что используется для тестирования любого ResizeObserver-based кода
// в jsdom.
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  // Реальный ResizeObserver здесь не нужен — измерение подменяется вручную через trigger().
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect(): void {}

  trigger(width: number): void {
    this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

@Component({
  selector: 'app-section-title-host',
  imports: [SectionTitle],
  template: `<app-section-title [text]="text()" />`,
})
class SectionTitleHost {
  readonly text = signal('Расписание');
}

describe('SectionTitle', () => {
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SectionTitleHost] });
    originalResizeObserver = globalThis.ResizeObserver;
    FakeResizeObserver.instances = [];
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
  });

  it('рендерит текст в <h2>', () => {
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();

    const heading: HTMLElement = fixture.nativeElement.querySelector('h2.section-title__text');
    expect(heading?.textContent).toBe('Расписание');
  });

  it('рендерит декоративное подчёркивание — 2 затухающие линии + шеврон по центру', () => {
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.section-title__underline');
    expect(svg).not.toBeNull();

    const leftLine = svg.querySelector('line[clip-path^="url(#clip-left_2906_2094"]');
    const chevron = svg.querySelector('path[clip-path^="url(#clip-center_2906_2094"]');
    const rightLine = svg.querySelector('line[clip-path^="url(#clip-right_2906_2094"]');
    expect(leftLine).not.toBeNull();
    expect(chevron).not.toBeNull();
    expect(rightLine).not.toBeNull();
  });

  it('без ResizeObserver (jsdom) — ширина падает на DEFAULT_WIDTH (210), геометрия совпадает с оригиналом 1:1', () => {
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.section-title__underline');
    expect(svg.getAttribute('width')).toBe('210');

    const [leftLine, rightLine] = svg.querySelectorAll('line');
    expect(leftLine.getAttribute('x1')).toBe('0');
    expect(leftLine.getAttribute('x2')).toBe('98'); // midpoint(105) - CHEVRON_HALF(7)
    expect(rightLine.getAttribute('x1')).toBe('112'); // midpoint(105) + CHEVRON_HALF(7)
    expect(rightLine.getAttribute('x2')).toBe('210');

    const chevron = svg.querySelector('path[stroke="#F7ECB2"]');
    expect(chevron?.getAttribute('transform')).toBe('translate(0 0)'); // 210/2 = 105 = исходный центр шеврона
  });

  it('ширина текста растягивает левую/правую линии, шеврон остаётся фиксированного размера по центру', () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();
    FakeResizeObserver.instances[0]?.trigger(400);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.section-title__underline');
    expect(svg.getAttribute('width')).toBe('400');

    const [leftLine, rightLine] = svg.querySelectorAll('line');
    expect(leftLine.getAttribute('x1')).toBe('0');
    expect(leftLine.getAttribute('x2')).toBe('193'); // 400/2 - 7
    expect(rightLine.getAttribute('x1')).toBe('207'); // 400/2 + 7
    expect(rightLine.getAttribute('x2')).toBe('400');

    const chevron = svg.querySelector('path[stroke="#F7ECB2"]');
    expect(chevron?.getAttribute('transform')).toBe('translate(95 0)'); // 400/2 - 105

    // левая и правая часть равны по длине (зеркальны)
    const leftLength = Number(leftLine.getAttribute('x2')) - Number(leftLine.getAttribute('x1'));
    const rightLength = Number(rightLine.getAttribute('x2')) - Number(rightLine.getAttribute('x1'));
    expect(leftLength).toBe(rightLength);
  });

  it('градиенты линий совпадают по координатам с фактическими x1/x2 линии (не остаются на исходных 0/98/112/210)', () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();
    FakeResizeObserver.instances[0]?.trigger(400);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.section-title__underline');
    const leftGradient = svg.querySelector('linearGradient[id^="paint0_linear_2906_2094"]');
    const rightGradient = svg.querySelector('linearGradient[id^="paint1_linear_2906_2094"]');

    expect(leftGradient?.getAttribute('x1')).toBe('0');
    expect(leftGradient?.getAttribute('x2')).toBe('193');
    expect(rightGradient?.getAttribute('x1')).toBe('207');
    expect(rightGradient?.getAttribute('x2')).toBe('400');
  });

  it("ширина текста меньше 210 (дефолта) — clip-left/clip-right не обрезают линии, которые теперь короче исходных 98/112 (регрессия: был виден разрыв между шевроном и линией)", () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();
    FakeResizeObserver.instances[0]?.trigger(150);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.section-title__underline');
    const [leftLine, rightLine] = svg.querySelectorAll('line');
    const leftClipRect = svg.querySelector('clipPath[id^="clip-left_2906_2094"] rect');
    const rightClipRect = svg.querySelector('clipPath[id^="clip-right_2906_2094"] rect');

    const leftClipStart = Number(leftClipRect?.getAttribute('x'));
    const leftClipEnd = leftClipStart + Number(leftClipRect?.getAttribute('width'));
    expect(leftClipStart).toBeLessThanOrEqual(Number(leftLine.getAttribute('x1')));
    expect(leftClipEnd).toBeGreaterThanOrEqual(Number(leftLine.getAttribute('x2')));

    const rightClipStart = Number(rightClipRect?.getAttribute('x'));
    const rightClipEnd = rightClipStart + Number(rightClipRect?.getAttribute('width'));
    expect(rightClipStart).toBeLessThanOrEqual(Number(rightLine.getAttribute('x1')));
    expect(rightClipEnd).toBeGreaterThanOrEqual(Number(rightLine.getAttribute('x2')));
  });

  it('совсем короткая ширина текста — кламп не даёт линиям инвертироваться', () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();
    FakeResizeObserver.instances[0]?.trigger(1);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.section-title__underline');
    const totalWidth = Number(svg.getAttribute('width'));
    expect(totalWidth).toBeGreaterThan(1);

    const [leftLine, rightLine] = svg.querySelectorAll('line');
    expect(Number(leftLine.getAttribute('x2'))).toBeGreaterThan(Number(leftLine.getAttribute('x1')));
    expect(Number(rightLine.getAttribute('x2'))).toBeGreaterThan(Number(rightLine.getAttribute('x1')));
  });

  it('меняет текст на разной длине без ошибок рендера', () => {
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Расписание');

    fixture.componentInstance.text.set('Очень длинный заголовок секции для проверки переноса');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe(
      'Очень длинный заголовок секции для проверки переноса',
    );
  });

  it('несколько инстансов на одной странице — каждый использует свои собственные id/url(#...), не первого попавшегося', () => {
    const first = TestBed.createComponent(SectionTitleHost);
    first.detectChanges();
    const second = TestBed.createComponent(SectionTitleHost);
    second.componentInstance.text.set('Топ донатеров');
    second.detectChanges();

    document.body.appendChild(first.nativeElement);
    document.body.appendChild(second.nativeElement);

    const firstSvg: SVGSVGElement = first.nativeElement.querySelector('svg.section-title__underline');
    const secondSvg: SVGSVGElement = second.nativeElement.querySelector('svg.section-title__underline');

    const firstFilterId = firstSvg.querySelector('g')?.getAttribute('filter');
    const secondFilterId = secondSvg.querySelector('g')?.getAttribute('filter');
    expect(firstFilterId).not.toBe(secondFilterId);

    const secondLineUrl = secondSvg.querySelector('line[stroke^="url(#paint0_linear"]')?.getAttribute('stroke');
    const referencedId = secondLineUrl?.slice('url(#'.length, -1) ?? '';
    const resolved = document.getElementById(referencedId);
    expect(resolved).not.toBeNull();
    expect(secondSvg.contains(resolved)).toBe(true);

    document.body.removeChild(first.nativeElement);
    document.body.removeChild(second.nativeElement);
  });
});
