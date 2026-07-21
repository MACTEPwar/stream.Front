import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NavActiveIndicator } from './nav-active-indicator';

@Component({
  selector: 'app-nav-active-indicator-host',
  imports: [NavActiveIndicator],
  template: `<app-nav-active-indicator />`,
})
class NavActiveIndicatorHost {}

describe('NavActiveIndicator', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NavActiveIndicatorHost] });
  });

  it('рендерит статичный SVG 91x10', () => {
    const fixture = TestBed.createComponent(NavActiveIndicatorHost);
    fixture.detectChanges();

    const svg: SVGSVGElement | null = fixture.nativeElement.querySelector('svg.nav-active-indicator');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('91');
    expect(svg?.getAttribute('height')).toBe('10');
  });

  it('содержит 5 path (2 затухающие линии + 3 шеврона)', () => {
    const fixture = TestBed.createComponent(NavActiveIndicatorHost);
    fixture.detectChanges();

    const svg: SVGSVGElement = fixture.nativeElement.querySelector('svg.nav-active-indicator');
    expect(svg.querySelectorAll('path').length).toBe(5);
  });

  it('несколько инстансов на одной странице — каждый использует свои собственные id/url(#...), не первого попавшегося', () => {
    const firstFixture = TestBed.createComponent(NavActiveIndicatorHost);
    firstFixture.detectChanges();

    const secondFixture = TestBed.createComponent(NavActiveIndicatorHost);
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
    expect(document.getElementById(referencedId)).not.toBeNull();

    document.body.removeChild(firstFixture.nativeElement);
    document.body.removeChild(secondFixture.nativeElement);
  });
});
