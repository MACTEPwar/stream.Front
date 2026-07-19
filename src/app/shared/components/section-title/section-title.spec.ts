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

  it('рендерит декоративное подчёркивание — 2 затухающие линии + шеврон по центру', () => {
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.section-title__underline');
    expect(svg).not.toBeNull();
    const gradientLines = svg.querySelectorAll('path[fill^="url(#paint"]');
    expect(gradientLines).toHaveLength(2);
    const chevron = svg.querySelector('path[stroke="#F7ECB2"]');
    expect(chevron).not.toBeNull();
  });

  it('typography — Figma-стиль "H1" (Montserrat Bold 28/36, letter-spacing 8%) из mixins.h1', () => {
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();

    const heading: HTMLElement = fixture.nativeElement.querySelector('h2.section-title__text');
    const cs = getComputedStyle(heading);
    expect(cs.fontFamily).toContain('Montserrat');
    expect(cs.fontWeight).toBe('700');
    expect(cs.fontSize).toBe('28px');
    expect(cs.lineHeight).toBe('36px');
    expect(cs.letterSpacing).not.toBe('normal');
    expect(cs.textShadow).not.toBe('none');
  });

  it('меняет текст на разной длине без ошибок рендера — подчёркивание при этом остаётся фиксированной ширины (известное ограничение этого прохода)', () => {
    const fixture = TestBed.createComponent(SectionTitleHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Расписание');

    fixture.componentInstance.text.set('Очень длинный заголовок секции для проверки переноса');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe(
      'Очень длинный заголовок секции для проверки переноса',
    );

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.section-title__underline');
    expect(svg.getAttribute('width')).toBe('210');
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

    const secondLineUrl = secondSvg.querySelector('path[fill^="url(#paint0_linear"]')?.getAttribute('fill');
    const referencedId = secondLineUrl?.slice('url(#'.length, -1) ?? '';
    const resolved = document.getElementById(referencedId);
    expect(resolved).not.toBeNull();
    expect(secondSvg.contains(resolved)).toBe(true);

    document.body.removeChild(first.nativeElement);
    document.body.removeChild(second.nativeElement);
  });
});
