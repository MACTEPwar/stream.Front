import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

/**
 * Тонкая обёртка над `p-select` (stream.Front#94) — не полный проксирующий
 * враппер PrimeNG API, только пропсы, реально нужные текущему usage
 * (`AdminUsersPage`: фильтр по роли + селект роли в drawer «Изменить роль»):
 * `options`/`optionLabel`/`optionValue` и двусторонний `[(value)]`, плюс
 * опциональный `filter` (`stream.Front#118`, поиск по `optionLabel()`-полю
 * через `filterBy`) — выключен по умолчанию, включается там, где список
 * опций может быть длинным (выбор новости в `PinnedGridEditor`).
 *
 * `value` — `model()`, как у `TextField` (не `ReactiveFormsModule` наружу) —
 * внутри мапится на `[ngModel]`/`(ngModelChange)`, поскольку `p-select` сам
 * не предоставляет отдельного `value`-input (только `ControlValueAccessor`,
 * см. `primeng/types/primeng-select.d.ts`).
 *
 * Компонент — generic по типу опции/значения (`TOption`/`TValue`), как
 * `roleOptions`/`roleFilterOptions` в `AdminUsersPage` — там разные формы
 * `value` (`AdminUserRole` и `AdminUserAnyRole | null`).
 *
 * `appendTo="body"` (select.html) — селект роли открывается внутри `p-drawer`
 * («Изменить роль»), у которого `overflow` обрезает абсолютно позиционированный
 * оверлей списка; вынос в конец `<body>` — стандартный приём PrimeNG для
 * оверлеев внутри drawer/modal, не завязан на конкретное место использования
 * (безопасен и для фильтра вне drawer).
 *
 * `panelStyleClass="app-select-panel"` (select.html) — персональный
 * класс-хук на оверлее списка. `appendTo="body"` физически переносит
 * `p-select-overlay` в конец `<body>`, из DOM-поддерева этого компонента —
 * CSS-переменные, заданные на `:host` (select.scss), наследуются только по
 * фактическому дереву DOM и до вынесенного списка уже не доходят (список
 * рисовался тёмным фоном темы `AdminPreset` вместо заданных цветов), поэтому
 * его стили в `select.scss` идут через `::ng-deep` (без `:host`-предка —
 * иначе селектор искал бы оверлей внутри DOM-поддерева `:host`, а он там
 * больше не находится) — единственный доступный способ достать содержимое,
 * физически покинувшее дерево компонента. Обычный `ViewEncapsulation.None`
 * на весь компонент (как у `ButtonGroup`) здесь не подходит — он лишает
 * рил-`:host`-правила scope-атрибута Angular, а именно этот атрибут даёт им
 * специфичность выше, чем у собственного `:root, :host`-правила PrimeNG для
 * тех же токенов (без него это уже игра на порядке подключения стилей, не
 * специфичности, и наша перекраска базовой коробки селекта переставала
 * побеждать).
 */
@Component({
  selector: 'app-select',
  imports: [SelectModule, FormsModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class Select<TOption = unknown, TValue = unknown> {
  readonly id = input<string>();
  readonly options = input<TOption[]>([]);
  readonly optionLabel = input<string>();
  readonly optionValue = input<string>();
  readonly placeholder = input<string>();
  /** Строка поиска над списком опций (`p-select filter`, `stream.Front#118`) — по умолчанию выключена, включается там, где список может быть длинным (например выбор новости в `PinnedGridEditor`). */
  readonly filter = input(false);
  readonly value = model<TValue | null>(null);
}
