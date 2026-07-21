import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NavActiveIndicator } from './nav-active-indicator';

@Component({
  selector: 'app-nav-active-indicator-host',
  imports: [NavActiveIndicator],
  template: `<app-nav-active-indicator />`,
})
class NavActiveIndicatorHost {}

@Component({
  selector: 'app-nav-active-indicator-width-host',
  imports: [NavActiveIndicator],
  template: `<app-nav-active-indicator [width]="width()" />`,
})
class NavActiveIndicatorWidthHost {
  readonly width = signal(91);
}

describe('NavActiveIndicator', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NavActiveIndicatorHost, NavActiveIndicatorWidthHost] });
  });

  it('без width() (дефолт 91) — рендерит статичный SVG 91x10, геометрия совпадает с оригиналом 1:1', () => {
    const fixture = TestBed.createComponent(NavActiveIndicatorHost);
    fixture.detectChanges();

    const svg: SVGSVGElement | null = fixture.nativeElement.querySelector('svg.nav-active-indicator');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('91');
    expect(svg?.getAttribute('height')).toBe('10');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 91 10');

    const groups = svg?.querySelectorAll('g') ?? [];
    expect(groups[0].getAttribute('transform')).toBe('scale(1 1)');
    expect(groups[1].getAttribute('transform')).toBe('translate(0 0)');
    expect(groups[2].getAttribute('transform')).toBe('translate(0 0) translate(54.5 0) scale(1 1) translate(-54.5 0)');
  });

  it('host получает явную CSS-ширину, совпадающую с width() — иначе `left: 50%`-центрирование в Shell схлопывает auto-width хост вдвое (shrink-to-fit: min(preferred, containerWidth - left))', () => {
    const fixture = TestBed.createComponent(NavActiveIndicatorWidthHost);
    fixture.componentInstance.width.set(140);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement.querySelector('app-nav-active-indicator');
    expect(host.style.width).toBe('140px');
  });

  it('содержит 5 path (2 затухающие линии + 3 шеврона/ромб)', () => {
    const fixture = TestBed.createComponent(NavActiveIndicatorHost);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.nav-active-indicator');
    expect(svg.querySelectorAll('path').length).toBe(5);
  });

  it('width() = 140 — растягивает крайние линии, центральный декор фиксированного размера сдвигается по формуле', () => {
    const fixture = TestBed.createComponent(NavActiveIndicatorWidthHost);
    fixture.componentInstance.width.set(140);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.nav-active-indicator');
    expect(svg.getAttribute('width')).toBe('140');
    expect(svg.getAttribute('viewBox')).toBe('0 0 140 10');

    const shift = (140 - 91) / 2; // 24.5
    const scale = (140 / 2 - 9) / 36.5; // 1.671232876712329
    const anchor = 91 - 36.5; // 54.5 — левый край правой линии, стык с центральным блоком

    const groups = svg.querySelectorAll('g');
    expect(groups[0].getAttribute('transform')).toBe(`scale(${scale} 1)`);
    expect(groups[1].getAttribute('transform')).toBe(`translate(${shift} 0)`);
    expect(groups[2].getAttribute('transform')).toBe(
      `translate(${shift} 0) translate(${anchor} 0) scale(${scale} 1) translate(${-anchor} 0)`,
    );
  });

  it('несколько инстансов на одной странице с разной шириной — каждый использует свои собственные id/url(#...), не первого попавшегося', () => {
    const firstFixture = TestBed.createComponent(NavActiveIndicatorWidthHost);
    firstFixture.componentInstance.width.set(91);
    firstFixture.detectChanges();

    const secondFixture = TestBed.createComponent(NavActiveIndicatorWidthHost);
    secondFixture.componentInstance.width.set(140);
    secondFixture.detectChanges();

    document.body.appendChild(firstFixture.nativeElement);
    document.body.appendChild(secondFixture.nativeElement);

    const firstFill = firstFixture.nativeElement
      .querySelector('svg.nav-active-indicator path')
      ?.getAttribute('fill');
    const secondFill = secondFixture.nativeElement
      .querySelector('svg.nav-active-indicator path')
      ?.getAttribute('fill');

    expect(firstFill).not.toBe(secondFill);

    const referencedId = secondFill?.slice('url(#'.length, -1) ?? '';
    const resolved = document.getElementById(referencedId);
    expect(resolved).not.toBeNull();
    expect(secondFixture.nativeElement.contains(resolved)).toBe(true);

    const secondSvg: SVGSVGElement = secondFixture.nativeElement.querySelector('svg.nav-active-indicator');
    expect(secondSvg.getAttribute('width')).toBe('140');

    document.body.removeChild(firstFixture.nativeElement);
    document.body.removeChild(secondFixture.nativeElement);
  });
});
