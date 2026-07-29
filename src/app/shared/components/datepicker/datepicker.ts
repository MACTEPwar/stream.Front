import { Component, computed, input, model, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';

/**
 * Только `single`/`range` (stream.Front#109) — `p-datepicker` сам поддерживает
 * ещё и `multiple`, но текущий usage его не требует (см. "Не входит" в
 * задаче); заводится отдельно по мере необходимости.
 */
export type DatepickerSelectionMode = 'single' | 'range';

/**
 * Тонкая обёртка над `p-datepicker` (stream.Front#109) — не полный
 * проксирующий враппер PrimeNG API, только пропсы, нужные текущему usage:
 * тип выбора (`selectionMode`) и значение.
 *
 * `value` — `model()`, как у `Select`/`TextField`, мапится на `[ngModel]`/
 * `(ngModelChange)` (`p-datepicker` сам не даёт отдельного `value`-input,
 * только `ControlValueAccessor`, см. `DATEPICKER_VALUE_ACCESSOR` в
 * `primeng/types/primeng-datepicker.d.ts`). В `selectionMode="range"`
 * PrimeNG отдаёт значение как `[Date, Date]` — отсюда широкий тип
 * `Date | Date[] | null`, а не просто `Date`.
 *
 * `appendTo="body"` + `panelStyleClass="app-datepicker-panel"`
 * (datepicker.html) — та же причина, что у `Select` (select.ts): панель
 * календаря физически выносится в конец `<body>`, вне DOM-поддерева этого
 * компонента, поэтому цвета на `:host` (datepicker.scss) до неё не
 * доходят и оверлей стилизуется отдельно через `::ng-deep`. Применяется
 * только в попап-режиме (`!inline()`, см. ниже) — при `inline` панель и так
 * рендерится прямо на месте, `appendTo="body"` буквально утащил бы её в
 * конец `<body>` (см. `appendOverlay()` в `primeng-datepicker.mjs` — вызов
 * не смотрит на `inline()`), сломав раскладку.
 *
 * `inline` (stream.Front#109, по прямому запросу пользователя) — календарь
 * всегда открыт, без попапа по клику на инпут (которого в этом режиме у
 * `p-datepicker` вообще нет, см. `@if (!inline())` вокруг инпута в
 * `primeng-datepicker.mjs`); дефолт `false` — не меняет поведение
 * существующих usage.
 *
 * `numberOfMonths` — нативный проп `p-datepicker` (несколько месяцев в одной
 * панели при `range`-выборе), пробрасывается как есть. Показывает только
 * СОСЕДНИЕ месяцы — `createMonths()` строит `months()` от одной общей пары
 * `currentMonth`/`currentYear`, независимого состояния на панель нет (см.
 * `onMonthSelect()`/`onYearSelect()` в `primeng-datepicker.mjs` — оба всегда
 * пересобирают ВЕСЬ набор от новой базы). Для произвольной разницы между
 * месяцами (например, слева январь — справа декабрь) этого недостаточно,
 * см. `DatepickerRange` (`datepicker-range.ts`) — композиция из двух
 * независимых `Datepicker(inline)`.
 *
 * `defaultDate` — нативный проп `p-datepicker` (какой месяц показан
 * изначально, пока `value` пуст); нужен `DatepickerRange`, чтобы задать
 * разные стартовые месяцы двум независимым инстансам.
 *
 * **Баг PrimeNG, из-за которого `defaultDate` пробрасывается НЕ напрямую, а
 * через `resolvedDefaultDate` (ниже)** — обнаружен на живую (stream.Front#109,
 * `DatepickerRange` с заданным `minDate`): открытие month/year-picker
 * (клик по названию месяца/года в шапке) неожиданно откатывало НАВИГАЦИЮ
 * пользователя обратно на месяц `defaultDate`, но ТОЛЬКО у календаря с
 * заданным `minDate` — календарь с `maxDate` вместо этого не страдал.
 * Причина — в `primeng-datepicker.mjs`: `isSelectable()` читает
 * `this.currentView()` ТОЛЬКО в ветке проверки `minDate` (`else if
 * (minDate.getFullYear() === year && this.currentView() != 'year')`) —
 * у аналогичной ветки `maxDate` такого чтения нет вовсе (асимметрия в
 * исходнике PrimeNG). `isSelectable()` вызывается из `createMonths()`,
 * который, в свою очередь, вызывается ИЗНУТРИ внутреннего `effect()` для
 * `minDate`/`maxDate`/`disabledDates`/`disabledDays` (тот же файл,
 * конструктор `DatePicker`) — раз `isSelectable()` прочитал `currentView()`
 * ВО ВРЕМЯ выполнения этого эффекта (и только когда `minDate` задан),
 * Angular динамически регистрирует `currentView` как зависимость ЭТОГО
 * эффекта. Переключение view (`setCurrentView()` при открытии
 * month/year-picker) после этого помечает эффект "грязным" → он
 * перезапускается → тем же тиком перезапускается и СОСЕДНИЙ `effect()` для
 * `defaultDate` (тот же конструктор, объявлен следом) → его тело безусловно
 * перезаписывает `this.currentMonth`/`currentYear` значением `defaultDate`,
 * не проверяя, что пользователь уже перешёл в другой месяц. У `maxDate`-
 * календаря (нет обращения к `currentView()` в `isSelectable()`) эта
 * случайная зависимость не возникает — переключение view эффект не будит.
 *
 * Раз `defaultDate` нужен только для НАЧАЛЬНОГО месяца (пока `value` пуст),
 * а не для реагирования на что-либо после монтирования — безопасно "погасить"
 * его в `undefined` сразу после первого применения: `p-datepicker.onInit()`
 * использует `defaultDate()` синхронно (не через эффект) для начального
 * `currentMonth`/`currentYear`, так что исходное значение всё равно
 * применяется корректно; а вот эффект PrimeNG для `defaultDate` сам
 * проверяет `defaultDate !== undefined` — если после первого применения
 * `resolvedDefaultDate()` станет `undefined`, спонтанный повторный запуск
 * эффекта (из-за бага выше) просто ничего не сделает.
 *
 * `minDate`/`maxDate` — нативные пропы `p-datepicker` (даты вне диапазона
 * рендерятся disabled, физически некликабельны — не пост-фактум сортировка);
 * нужны `DatepickerRange`, чтобы жёстко запретить выбрать в левом календаре
 * дату позже правого и наоборот.
 *
 * `rangeHighlight` — необязательная пара `[start, end]` для визуальной
 * заливки дней МЕЖДУ ними (не включая сами `start`/`end` — те уже красятся
 * штатной `.p-datepicker-day-selected` для `value` ЭТОГО инстанса). Нужен,
 * т.к. в `DatepickerRange` каждый календарь — `selectionMode="single"` (см.
 * `datepicker-range.ts` — почему не `range`), поэтому родной "залитый
 * диапазон между" PrimeNG не рисует сам, приходится подсвечивать вручную.
 * Реализовано через `dateTemplate` (`#date`, datepicker.html) — единственный
 * официальный способ добавить что-то на КАЖДУЮ ячейку дня, официально
 * поддержанный PrimeNG (в отличие от `::ng-deep` на весь `.p-datepicker-day`,
 * который не умеет отличать одну дату от другой — CSS не знает арифметику
 * дат). Оверлей — `position: absolute; inset: 0` позади номера дня
 * (`.p-datepicker-day` уже `position: relative` в стилях самого PrimeNG),
 * обычный (не `::ng-deep`) селектор в `datepicker.scss` — контент из
 * `<ng-template #date>` физически принадлежит ШАБЛОНУ ЭТОГО компонента
 * (спроецирован через `ngTemplateOutlet` внутрь `p-datepicker`), поэтому
 * несёт наш `_ngcontent`-атрибут независимо от того, физически ли ячейка
 * находится в нашем DOM-поддереве или унесена `appendTo="body"` — в отличие
 * от `.p-datepicker-day`/`.p-datepicker-panel` и т.п., которые рендерит
 * СОБСТВЕННЫЙ шаблон `p-datepicker` и которым наш атрибут взяться неоткуда
 * (вот там `::ng-deep` действительно необходим, см. код ниже).
 */
@Component({
  selector: 'app-datepicker',
  host: {
    '[class.datepicker--inline]': 'inline()',
  },
  imports: [DatePickerModule, FormsModule],
  templateUrl: './datepicker.html',
  styleUrl: './datepicker.scss',
})
export class Datepicker implements OnInit {
  readonly id = input<string>();
  readonly selectionMode = input<DatepickerSelectionMode>('single');
  readonly placeholder = input<string>();
  readonly disabled = input(false);
  readonly inline = input(false);
  readonly numberOfMonths = input(1);
  readonly defaultDate = input<Date>();
  readonly minDate = input<Date>();
  readonly maxDate = input<Date>();
  readonly rangeHighlight = input<[Date, Date] | null>(null);
  readonly value = model<Date | Date[] | null>(null);

  private readonly defaultDateArmed = signal(true);
  protected readonly resolvedDefaultDate = computed(() =>
    this.defaultDateArmed() ? this.defaultDate() : undefined,
  );

  ngOnInit(): void {
    // См. подробный комментарий у `defaultDate` выше — гасим ПОСЛЕ того, как
    // `p-datepicker.onInit()` успел синхронно применить исходное значение
    // (microtask гарантированно выполняется уже после этого, до любого
    // пользовательского взаимодействия).
    queueMicrotask(() => this.defaultDateArmed.set(false));
  }

  isDateInRange(date: { year: number; month: number; day: number }): boolean {
    const range = this.rangeHighlight();
    if (!range) {
      return false;
    }
    const [start, end] = range;
    const cellTime = new Date(date.year, date.month, date.day).getTime();
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return cellTime > startTime && cellTime < endTime;
  }
}
