import { Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/** Единственный нестандартный `severity` в текущих usages (`AdminUsersPage`/`AdminSchedulePage`, кнопки «Удалить») — остальные PrimeNG severity заводятся отдельной задачей по мере необходимости (см. AC stream.Front#89). */
export type ButtonSeverity = 'danger';

/** Единственный нестандартный `size` в текущих usages — полная шкала PrimeNG (`large` и т.д.) вне скоупа этой итерации. */
export type ButtonSize = 'small';

/**
 * Тонкая обёртка над `pButton` (stream.Front#89) для админ-панели —
 * не полный проксирующий враппер PrimeNG API, а только пропсы, реально
 * используемые в `AdminUsersPage`/`AdminSchedulePage` на эту итерацию:
 * текст, `severity`/`size` (см. типы выше), `disabled` и опциональная
 * `icon` (класс PrimeIcons, например `'pi pi-trash'`) — рендерится перед
 * текстом внутри самого `pButton`-хоста (deprecated `pButtonIcon`-директива
 * не используется, PrimeNG 22 рекомендует произвольный элемент прямо в
 * контенте, см. `node_modules/primeng/types/primeng-button.d.ts`); если
 * `icon()` не передан — `<i>` в DOM вообще не рендерится (`@if`, не пустой
 * слот), кнопка остаётся с одним текстом по центру.
 */
@Component({
  selector: 'app-button',
  imports: [ButtonModule],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly text = input.required<string>();
  readonly severity = input<ButtonSeverity>();
  readonly size = input<ButtonSize>();
  readonly disabled = input(false);
  readonly icon = input<string>();
}
