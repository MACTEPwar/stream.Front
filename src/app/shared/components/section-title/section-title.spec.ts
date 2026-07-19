import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SectionTitle } from './section-title';

@Component({
  selector: 'app-section-title-host',
  imports: [SectionTitle],
  template: `<app-section-title [text]="text()" />`,
})
class SectionTitleHost {
  readonly text = signal('Расписание');
}

describe('SectionTitle', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SectionTitleHost] });
  });

  it('рендерит текст в <h2>', () => {
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();

    const heading: HTMLElement = fixture.nativeElement.querySelector('h2.section-title__text');
    expect(heading?.textContent).toBe('Расписание');
  });

  it('подчёркивание разбито на 3 части по горизонтали (clip-path) — левая линия / шеврон / правая линия, границы 98/112', () => {
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

    expect(leftLine?.getAttribute('x1')).toBe('0');
    expect(leftLine?.getAttribute('x2')).toBe('98');
    expect(rightLine?.getAttribute('x1')).toBe('112');
    expect(rightLine?.getAttribute('x2')).toBe('210');
  });

  it('размер полностью статичный — без растягивания под текст (следующий шаг, ещё не сделан)', () => {
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.section-title__underline');
    expect(svg.getAttribute('width')).toBe('210');

    fixture.componentInstance.text.set('Очень длинный заголовок секции для проверки переноса');
    fixture.detectChanges();
    expect(svg.getAttribute('width')).toBe('210');
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
