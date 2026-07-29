import { Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TagSeverity } from 'primeng/types/tag';

import { ButtonSeverity } from '@shared/components/button/button';

/**
 * Та же палитра, что у `Button` (по прямому запросу пользователя — "цвета
 * аналогично как у кнопки"), плюс `'primary'` (дефолт без явного значения у
 * `Button` — здесь нужно явное имя, `p-tag` своего `severity="primary"` не
 * имеет, дефолтный вид получает через отсутствие `severity`-атрибута
 * вообще, см. `tagSeverity()` ниже).
 */
export type BadgeSeverity = ButtonSeverity | 'primary';

/**
 * Тонкая обёртка над PrimeNG `p-tag`. Inputs: `text` (`input.required<string>()`
 * — подпись у бейджа не опциональна, icon-only режим не заводился), `severity`
 * (см. `BadgeSeverity`, дефолт `'primary'`) — фон/текст переопределены той же
 * палитрой, что у `Button` (`button.scss:34-119`), на CSS-переменных
 * `--p-tag-{severity}-background`/`-color` (`badge.scss`); `p-tag` — сам
 * "host-class" компонент (класс `p-tag` навешен на собственный host-элемент,
 * не на вложенный див, см. `primeng-tag.mjs`), поэтому `<p-tag>` в шаблоне
 * этого компонента одновременно и есть та самая коробка — плейн-селекторы
 * `badge.scss` (`p-tag { ... }`) достают до неё без `::ng-deep`.
 *
 * `color`/`textColor` — произвольные CSS-цвета фона/текста, независимо друг
 * от друга перебивают `severity` (по прямому запросу пользователя: "цвет bg
 * и цвет текста принимает как параметры") — реализовано прямым `[style.*]`-
 * биндингом на `<p-tag>` (`badge.html`): инлайновый стиль сильнее любого
 * класс-селектора без доп. трюков (`::ng-deep`/`!important` не нужны).
 */
@Component({
  selector: 'app-badge',
  imports: [TagModule],
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class Badge {
  readonly text = input.required<string>();
  readonly severity = input<BadgeSeverity>('primary');
  readonly color = input<string>();
  readonly textColor = input<string>();

  protected readonly tagSeverity = computed<TagSeverity | undefined>(() => {
    const severity = this.severity();
    return severity === 'primary' ? undefined : severity;
  });
}
