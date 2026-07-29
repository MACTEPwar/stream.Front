import { Component, computed, input, model } from '@angular/core';

import { Datepicker } from '../datepicker/datepicker';

function asSingleDate(value: Date | Date[] | null): Date | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Композиция из ДВУХ независимых `Datepicker(inline, selectionMode="single")`
 * (stream.Front#109, по прямому запросу пользователя) — нужна там, где
 * встроенного `numberOfMonths` у `p-datepicker` не хватает: тот показывает
 * только соседние месяцы (общая пара `currentMonth`/`currentYear` на весь
 * набор, см. комментарий `numberOfMonths` в `datepicker.ts`), а здесь нужна
 * произвольная разница (например, слева январь — справа декабрь).
 *
 * **Почему не `selectionMode="range"` с общим `value`** (первая попытка,
 * не сработала) — у `p-datepicker` ЛЮБАЯ внешняя перезапись `value` (даже
 * тем же значением, которое инстанс только что сам отдал через
 * `(ngModelChange)`, — а именно так себя ведёт `[ngModel]="value()"` на
 * `Datepicker`: подписка на сигнал заново прогоняет то же значение вниз)
 * вызывает `writeControlValue()` → `updateUI()`, который безусловно
 * пересчитывает показанный месяц из `value` (см. `primeng-datepicker.mjs`).
 * Для `range` с незавершённой парой `[date, null]` там баг:
 * `propValue = propValue[1]` берёт ИМЕННО конец диапазона, а он `null` →
 * `isValidDate(null)` ложь → фолбэк на `new Date()` — оба календаря
 * прыгали на "сегодня" уже на первом клике вместо января/декабря. Даже без
 * этого бага `updateUI()` для ЗАВЕРШЁННОЙ пары навигацировал бы оба
 * календаря на месяц `value[1]`, разрушая "разные фиксированные месяцы" —
 * сама механика "range с общим value" в принципе не совместима с задачей.
 *
 * Вместо этого — оба инстанса в `selectionMode="single"`, каждый со своим
 * ЛОКАЛЬНЫМ `[(value)]` (`leftValue`/`rightValue`, `model()` на этом
 * компоненте), никогда не связанным с другим инстансом напрямую. Каждый
 * календарь остаётся полностью независимым — `updateUI()` у single-режима не
 * ломает ничего (там нет партиал-состояния: клик всегда даёт полную дату из
 * уже показанного месяца — "прыжок" на её месяц — no-op).
 *
 * **Левее не может быть правее** (по прямому запросу пользователя) —
 * `[maxDate]` левого календаря = `rightDate()`, `[minDate]` правого =
 * `leftDate()`: нативные пропы `p-datepicker`, недопустимые даты рендерятся
 * `disabled` (физически некликабельны), а не пост-фактум сортировка
 * значения. Из-за этого `value` ниже больше не нужно сортировать — порядок
 * гарантирован самим UI: `leftDate() <= rightDate()` всегда, если оба
 * заданы.
 *
 * **Заливка выбранного диапазона** (по прямому запросу пользователя) —
 * `[rangeHighlight]="value()"` прокинут в ОБА календаря: `Datepicker` красит
 * дни СТРОГО МЕЖДУ `start`/`end` (сами концы уже красятся штатной
 * `.p-datepicker-day-selected` для `value` каждого инстанса), см. подробный
 * комментарий в `datepicker.ts`. Работает и для дней, до которых
 * долистали вручную в любом из двух календарей — сравнение чисто по датам,
 * не привязано к тому, какой физический инстанс их показывает.
 *
 * `value` — только для чтения (не `model()`): выставить диапазон снаружи
 * программно значит переписать `value` одного/обоих `p-datepicker`,
 * возвращая ровно ту же проблему, которую этот компонент обходит; вместо
 * этого извне можно только задать НАЧАЛЬНО показанные месяцы
 * (`leftDefaultDate`/`rightDefaultDate`).
 */
@Component({
  selector: 'app-datepicker-range',
  imports: [Datepicker],
  templateUrl: './datepicker-range.html',
  styleUrl: './datepicker-range.scss',
})
export class DatepickerRange {
  readonly leftDefaultDate = input<Date>();
  readonly rightDefaultDate = input<Date>();

  readonly leftValue = model<Date | Date[] | null>(null);
  readonly rightValue = model<Date | Date[] | null>(null);

  protected readonly leftDate = computed(() => asSingleDate(this.leftValue()));
  protected readonly rightDate = computed(() => asSingleDate(this.rightValue()));

  readonly value = computed<[Date, Date] | null>(() => {
    const left = this.leftDate();
    const right = this.rightDate();
    return left && right ? [left, right] : null;
  });
}
