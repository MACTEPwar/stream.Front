import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Datepicker, DatepickerSelectionMode } from './datepicker';

@Component({
  selector: 'app-datepicker-host',
  imports: [Datepicker],
  template: `
    <app-datepicker
      [id]="id()"
      [selectionMode]="selectionMode()"
      [placeholder]="placeholder()"
      [inline]="inline()"
      [(value)]="value"
    />
  `,
})
class DatepickerHost {
  readonly id = signal<string | undefined>(undefined);
  readonly selectionMode = signal<DatepickerSelectionMode>('single');
  readonly placeholder = signal<string | undefined>(undefined);
  readonly inline = signal(false);
  readonly value = signal<Date | Date[] | null>(null);
}

describe('Datepicker', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DatepickerHost] });
  });

  it('рендерит p-datepicker', () => {
    const fixture = TestBed.createComponent(DatepickerHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('p-datepicker')).not.toBeNull();
  });

  it('id пробрасывается в p-datepicker', () => {
    const fixture = TestBed.createComponent(DatepickerHost);
    fixture.componentInstance.id.set('period-from');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#period-from')).not.toBeNull();
  });

  it('изменение value на хосте отражается в инпуте (single)', async () => {
    const fixture = TestBed.createComponent(DatepickerHost);
    fixture.detectChanges();

    fixture.componentInstance.value.set(new Date(2026, 0, 15));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const input: HTMLInputElement | null = fixture.nativeElement.querySelector('.p-datepicker-input');
    expect(input?.value).toContain('2026');
  });

  it('выбор двух дат в selectionMode="range" отдаёт [Date, Date] наружу', async () => {
    const fixture = TestBed.createComponent(DatepickerHost);
    fixture.componentInstance.selectionMode.set('range');
    fixture.detectChanges();

    const input: HTMLElement = fixture.nativeElement.querySelector('.p-datepicker-input');
    input.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const days = document.querySelectorAll<HTMLElement>(
      '.app-datepicker-panel .p-datepicker-day:not(.p-disabled)',
    );
    expect(days.length).toBeGreaterThan(1);

    days[0].click();
    fixture.detectChanges();
    days[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const value = fixture.componentInstance.value();
    expect(Array.isArray(value)).toBe(true);
    expect((value as Date[]).length).toBe(2);
  });

  it('inline=true рендерит панель сразу, без попапа по клику на инпут', () => {
    const fixture = TestBed.createComponent(DatepickerHost);
    fixture.componentInstance.inline.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.p-datepicker-input')).toBeNull();
    expect(el.querySelector('.p-datepicker-day')).not.toBeNull();
  });
});
