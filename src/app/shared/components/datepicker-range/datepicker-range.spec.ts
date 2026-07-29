import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { DatepickerRange } from './datepicker-range';

@Component({
  selector: 'app-datepicker-range-host',
  imports: [DatepickerRange],
  template: `
    <app-datepicker-range
      [leftDefaultDate]="leftDefaultDate()"
      [rightDefaultDate]="rightDefaultDate()"
    />
  `,
})
class DatepickerRangeHost {
  readonly leftDefaultDate = signal<Date | undefined>(new Date(2026, 0, 1));
  readonly rightDefaultDate = signal<Date | undefined>(new Date(2026, 11, 1));
}

@Component({
  selector: 'app-datepicker-range-same-month-host',
  imports: [DatepickerRange],
  template: `<app-datepicker-range [leftDefaultDate]="sameMonth" [rightDefaultDate]="sameMonth" />`,
})
class DatepickerRangeSameMonthHost {
  readonly sameMonth = new Date(2026, 6, 1);
}

function visibleDay(panel: HTMLElement, nth: number): HTMLElement {
  return [...panel.querySelectorAll<HTMLElement>('.p-datepicker-day-cell:not(.p-datepicker-other-month) .p-datepicker-day')][
    nth
  ];
}

describe('DatepickerRange', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DatepickerRangeHost, DatepickerRangeSameMonthHost] });
  });

  it('рендерит два независимых app-datepicker', () => {
    const fixture = TestBed.createComponent(DatepickerRangeHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-datepicker').length).toBe(2);
  });

  it('показывает разные месяцы слева/справа (leftDefaultDate/rightDefaultDate)', () => {
    const fixture = TestBed.createComponent(DatepickerRangeHost);
    fixture.detectChanges();

    const years = [...fixture.nativeElement.querySelectorAll('.p-datepicker-select-year')].map(
      (el: HTMLElement) => el.textContent?.trim(),
    );
    expect(years).toEqual(['2026', '2026']);

    const months = [...fixture.nativeElement.querySelectorAll('.p-datepicker-select-month')].map(
      (el: HTMLElement) => el.textContent?.trim(),
    );
    expect(months[0]).not.toBe(months[1]);
  });

  it('клик по дате в разных календарях складывается в один упорядоченный диапазон, месяцы не сбрасываются', async () => {
    const fixture = TestBed.createComponent(DatepickerRangeHost);
    fixture.detectChanges();

    const [leftPanel, rightPanel] = fixture.nativeElement.querySelectorAll('app-datepicker');
    const leftDay = visibleDay(leftPanel, 0);
    leftDay.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Клик в левом (январь) не должен сдвинуть месяц ни в одном из календарей.
    const monthsAfterFirstClick = [...fixture.nativeElement.querySelectorAll('.p-datepicker-select-month')].map(
      (el: HTMLElement) => el.textContent?.trim(),
    );
    expect(monthsAfterFirstClick[0]).not.toBe(monthsAfterFirstClick[1]);

    const rightDay = visibleDay(rightPanel, 0);
    rightDay.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.debugElement.query(By.directive(DatepickerRange)).componentInstance as DatepickerRange;
    const value = component.value();
    expect(value).not.toBeNull();
    expect(value?.length).toBe(2);
    expect((value as Date[])[0].getTime()).toBeLessThan((value as Date[])[1].getTime());
  });

  it('после выбора в правом календаре более ранние даты в левом остаются доступны, а более поздние — disabled (maxDate)', async () => {
    const fixture = TestBed.createComponent(DatepickerRangeSameMonthHost);
    fixture.detectChanges();

    const [leftPanel, rightPanel] = fixture.nativeElement.querySelectorAll('app-datepicker');
    const rightDay10 = visibleDay(rightPanel, 9);
    rightDay10.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const leftDayBefore = visibleDay(leftPanel, 4); // раньше 10-го числа
    const leftDayAfter = visibleDay(leftPanel, 19); // позже 10-го числа

    expect(leftDayBefore.classList.contains('p-disabled')).toBe(false);
    expect(leftDayAfter.classList.contains('p-disabled')).toBe(true);
  });

  it('дни между выбранными датами (в пределах одного и того же видимого месяца) подсвечиваются заливкой', async () => {
    const fixture = TestBed.createComponent(DatepickerRangeSameMonthHost);
    fixture.detectChanges();

    const [leftPanel, rightPanel] = fixture.nativeElement.querySelectorAll('app-datepicker');
    visibleDay(leftPanel, 4).click(); // 5-е число
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    visibleDay(rightPanel, 14).click(); // 15-е число
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dayBetween = visibleDay(leftPanel, 9); // 10-е число — строго между
    expect(dayBetween.querySelector('.day-range-fill--in')).not.toBeNull();

    const dayOutside = visibleDay(leftPanel, 0); // 1-е число — вне диапазона
    expect(dayOutside.querySelector('.day-range-fill--in')).toBeNull();

    // Регрессия: заливка не должна перекрывать цифру дня (была невидима из-за
    // порядка стекинга CSS — позиционированный элемент без z-index красится
    // позже строчного текста независимо от порядка в разметке, см.
    // datepicker.scss).
    expect(dayBetween.querySelector('.day-number')?.textContent?.trim()).toBe('10');
  });

  it('после выбора периода навигация по месяцам в календаре с minDate продолжает работать (регрессия на баг PrimeNG)', async () => {
    // Баг: isSelectable() в primeng-datepicker.mjs читает currentView() только
    // в ветке проверки minDate (не maxDate) — эта случайная зависимость
    // заставляла внутренний effect() PrimeNG для defaultDate перезапускаться
    // при переключении date/month/year view и откатывать навигацию обратно на
    // defaultDate, но только у календаря с заданным minDate (правый). Нейтра-
    // лизовано через resolvedDefaultDate (см. datepicker.ts) — здесь просто
    // проверяем итоговое поведение end-to-end.
    const fixture = TestBed.createComponent(DatepickerRangeHost);
    fixture.detectChanges();

    const [leftPanel, rightPanel] = fixture.nativeElement.querySelectorAll('app-datepicker');
    visibleDay(leftPanel, 0).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    visibleDay(rightPanel, 25).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rightMonthBtn: HTMLElement = rightPanel.querySelector('.p-datepicker-select-month');
    rightMonthBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // 'Mar' (не 'мар') — русская локализация (ru-translation.ts) подключена
    // только глобально в app.config.ts/.storybook/preview.ts, TestBed её не
    // использует, PrimeNG в юнит-тестах остаётся на английском дефолте.
    const monthButtons = [...rightPanel.querySelectorAll('.p-datepicker-month')] as HTMLElement[];
    const marchBtn = monthButtons.find((el) => el.textContent?.trim() === 'Mar');
    marchBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rightMonthAfter = rightPanel.querySelector('.p-datepicker-select-month')?.textContent?.trim();
    expect(rightMonthAfter).toBe('March'); // шапка использует monthNames (полное), не monthNamesShort
  });
});
