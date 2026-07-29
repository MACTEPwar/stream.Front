import { Component, ViewEncapsulation } from '@angular/core';

/**
 * Группирует `Button` и/или `Checkbox` (в `buttonMode`) подряд под одной
 * общей визуальной обводкой (stream.Front#95) — карточки турниров/новостей:
 * сброс + 2 тоггла (глаз/сердце) под одной рамкой, отдельная кнопка-воронка
 * фильтра рядом уже вне группы.
 *
 * Технический подход: PrimeNG `<p-buttongroup>` не подошёл — его селекторы
 * (`first-of-type`/`last-of-type`) требуют прямого соседства `<button>`, а
 * наш `Button` и `Checkbox` оборачивают свои интерактивные элементы в
 * `<app-button>`/`<app-checkbox>`-хосты. Вместо этого — аналогичные правила,
 * сдвинутые на уровень выше, с `:is(button, label.checkbox)` для поддержки
 * обоих типов и `:first-child`/`:last-child` вместо `:first-of-type` (тот
 * работает per element type, поэтому в смешанной группе не определяет
 * правильные края).
 *
 * `ViewEncapsulation.None` — спроецированные `<app-button>`/`<app-checkbox>`
 * несут атрибут-скоуп родительского шаблона, обычный скоупнутый селектор
 * этого компонента до них не достанет; стили ограничены `.app-button-group`.
 */
@Component({
  selector: 'app-button-group',
  imports: [],
  templateUrl: './button-group.html',
  styleUrl: './button-group.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ButtonGroup {}
