import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

/**
 * Та же палитра, что у `ButtonSeverity` (`button.scss`), плюс `'primary'`
 * (у `Button` это дефолт без явного значения — здесь нужно явное имя, чтобы
 * выбрать нужный CSS-класс, PrimeNG `p-checkbox` своего `severity`-input не
 * имеет).
 */
export type CheckboxSeverity = 'primary' | 'secondary' | 'danger' | 'contrast' | 'info' | 'success';

let nextCheckboxUid = 0;

/**
 * Тонкая обёртка над `p-checkbox` (`binary`, stream.Front#105) — коробка и
 * текстовый лейбл справа от неё как раздельные элементы (не встроенный
 * label PrimeNG API — у `p-checkbox` его вообще нет), обёрнуты в `<label
 * for>` для стандартного клика по всей строке.
 *
 * `checked` — `model()`, как у `TextField`/`Select` (не `ReactiveFormsModule`
 * наружу) — внутри мапится на `[ngModel]`/`(ngModelChange)`, поскольку
 * `p-checkbox` сам не даёт отдельного `value`-input, только
 * `ControlValueAccessor` (см. `primeng/types/primeng-checkbox.d.ts`).
 *
 * `severity` — фон отмеченной коробки, та же палитра фонов, что у `Button`
 * (`button.scss:34-119`, по прямому запросу пользователя): переопределяет
 * `--p-checkbox-checked-*` CSS-переменные на классе `.checkbox--severity-*`
 * (`checkbox.scss`) — работает через обычное наследование CSS-переменных,
 * `::ng-deep` тут не нужен (в отличие от hover/click ниже).
 *
 * `color` — произвольный CSS-цвет, перебивает `severity` целиком (по
 * прямому запросу пользователя): свой класс `.checkbox--custom-color`
 * (идёт в `checkbox.scss` ПОСЛЕ severity-цикла — при выставленном `color()`
 * оба класса на элементе одновременно, tie-break по порядку правил в
 * файле), значение цвета передаётся через inline custom property
 * `--checkbox-custom-color` (`checkbox.html`), т.к. эта часть — не
 * compile-time SCSS-карта, а рантайм-значение произвольного пользователя.
 *
 * Hover/"клик" (`:active`) — у PrimeNG dt()-токенов нет отдельного
 * `checkbox.checked.active.*` (только `checked.hover.*`), поэтому
 * "недостающий" клик дорисован отдельным CSS-правилом через `::ng-deep`
 * (таргетит внутренний класс `.p-checkbox-box` дочернего `p-checkbox` —
 * тот же приём, что понадобился `Select` для оверлея, см.
 * `select.scss`: обычный scoped-селектор Emulated-инкапсуляции не достаёт
 * до элементов, отрисованных ЧУЖИМ компонентом, а не в шаблоне этого).
 * Для `color()` та же "недостающая" пара (hover/клик) посчитана в CSS через
 * `color-mix()` — готового заранее оттенка для произвольного цвета нет.
 *
 * `iconColor` — цвет самой галочки, отдельно от `severity`/`color` (по
 * прямому запросу пользователя): свой класс `.checkbox--custom-icon-color`
 * (в `checkbox.scss` ПОСЛЕ обоих предыдущих блоков — тот же tie-break по
 * порядку правил), значение — inline custom property
 * `--checkbox-custom-icon-color`. Без него — белая галочка на всех severity,
 * кроме `'contrast'` (тёмная, т.к. фон `contrast` сам светлый) — по прямому
 * запросу пользователя.
 *
 * `buttonMode()` — скрывает коробку p-checkbox (visually-hidden pattern, не
 * `display:none` — иначе `<label for>` перестаёт синтетически кликать input)
 * и стилизует `<label>` как кнопку (высота 40px, рамка, паддинг, severity-
 * цвета). Класс `checkbox--checked` на label отражает состояние тоггла и
 * используется для "нажатого" вида. Через `<ng-content>` внутрь можно
 * проецировать любой контент — иконку, текст, их комбинацию.
 *
 * Размер коробки — временный дефолт PrimeNG (не сверен с Figma по прямому
 * согласованию — ревизия отдельной задачей при необходимости).
 */
@Component({
  selector: 'app-checkbox',
  imports: [CheckboxModule, FormsModule],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
})
export class Checkbox {
  protected readonly uid = `checkbox${nextCheckboxUid++}`;

  readonly label = input<string>();
  readonly severity = input<CheckboxSeverity>('primary');
  readonly color = input<string>();
  readonly iconColor = input<string>();
  readonly checked = model(false);
  readonly buttonMode = input(false);

  protected readonly rootClasses = computed(() => {
    const classes = ['checkbox', `checkbox--severity-${this.severity()}`];
    if (this.color()) {
      classes.push('checkbox--custom-color');
    }
    if (this.iconColor()) {
      classes.push('checkbox--custom-icon-color');
    }
    if (this.buttonMode()) {
      classes.push('checkbox--button-mode');
    }
    return classes.join(' ');
  });
}
