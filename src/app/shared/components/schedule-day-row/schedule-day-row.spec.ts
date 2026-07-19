import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ScheduleDayRow } from './schedule-day-row';

@Component({
  selector: 'app-schedule-day-row-host',
  imports: [ScheduleDayRow],
  template: `
    <app-schedule-day-row
      [weekday]="weekday()"
      [isOnline]="isOnline()"
      [eventTitle]="eventTitle()"
      [time]="time()"
    />
  `,
})
class ScheduleDayRowHost {
  readonly weekday = signal('Пн');
  readonly isOnline = signal(true);
  readonly eventTitle = signal<string | undefined>('Стрим');
  readonly time = signal<string | undefined>('20:00');
}

// Каждый инстанс получает свой -{{uid}} суффикс на все id/url(#...) (см.
// schedule-day-row.html) — те же основания, что и у Button/SectionTitle.
describe('ScheduleDayRow', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ScheduleDayRowHost] });
  });

  it('online — показывает переданные weekday/eventTitle/time', () => {
    const fixture = TestBed.createComponent(ScheduleDayRowHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.day-row__weekday')?.textContent).toBe('Пн');
    expect(el.querySelector('.day-row__event')?.textContent).toBe('Стрим');
    expect(el.querySelector('.day-row__time')?.textContent).toBe('20:00');
    expect(el.querySelector('.day-row__event')?.classList).not.toContain('day-row__event--offline');
  });

  it('offline — вместо eventTitle/time показывает «Оффлайн» и «--:--», красным', () => {
    const fixture = TestBed.createComponent(ScheduleDayRowHost);
    fixture.componentInstance.isOnline.set(false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.day-row__event')?.textContent).toBe('Оффлайн');
    expect(el.querySelector('.day-row__time')?.textContent).toBe('--:--');
    expect(el.querySelector('.day-row__event')?.classList).toContain('day-row__event--offline');
    expect(el.querySelector('.day-row__time')?.classList).toContain('day-row__time--offline');
  });

  it('несколько инстансов на одной странице — каждый использует свои собственные id/url(#...), не первого попавшегося', () => {
    const firstFixture = TestBed.createComponent(ScheduleDayRowHost);
    firstFixture.detectChanges();

    const secondFixture = TestBed.createComponent(ScheduleDayRowHost);
    secondFixture.componentInstance.weekday.set('Вт');
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
