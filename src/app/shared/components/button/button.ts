import { Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Нестандартные `severity` в текущих usages — `'danger'` (админка,
 * `AdminUsersPage`/`AdminSchedulePage`, кнопки «Удалить», stream.Front#89) и
 * `'contrast'` (публичный сайт, иконки-кнопки карточек турниров/новостей —
 * светлый фон/тёмная иконка, см. `filter`-блок в `docs/figma/tournament1.json`,
 * stream.Front#95). Остальные PrimeNG severity заводятся отдельной задачей по
 * мере необходимости.
 */
export type ButtonSeverity = 'danger' | 'contrast';

/** Единственный нестандартный `size` в текущих usages — полная шкала PrimeNG (`large` и т.д.) вне скоупа этой итерации. */
export type ButtonSize = 'small';

/**
 * Тонкая обёртка над `pButton` (stream.Front#89) — не полный проксирующий
 * враппер PrimeNG API, а только пропсы, реально используемые в проекте:
 * текст, `severity`/`size` (см. типы выше), `disabled` и опциональная
 * `icon` (класс PrimeIcons, например `'pi pi-trash'`) — рендерится перед
 * текстом внутри самого `pButton`-хоста (deprecated `pButtonIcon`-директива
 * не используется, PrimeNG 22 рекомендует произвольный элемент прямо в
 * контенте, см. `node_modules/primeng/types/primeng-button.d.ts`); если
 * `icon()` не передан — `<i>` в DOM вообще не рендерится (`@if`, не пустой
 * слот).
 *
 * `text()` необязателен (stream.Front#95) — icon-only режим для
 * иконок-кнопок публичного сайта (карточки турниров/новостей: сброс/глаз/
 * сердце/воронка-фильтр). `[iconOnly]` пробрасывается в `pButton` явно
 * (`!text()`), а не полагается на автоопределение директивы — то определяет
 * icon-only только по спец-директивам `pButtonIcon`/`pButtonLabel` в
 * контенте (`ButtonDirective.isIconOnly()`), которые этот компонент не
 * использует (обычный `<i>`, см. выше).
 *
 * `active()` (stream.Front#95) — только визуальное "нажатое"/подсвеченное
 * состояние (класс `button--active`, стили см. `button.scss`), компонент не
 * хранит и не вычисляет бизнес-смысл тоггла сам — что значит "активно"
 * (лайкнуто/в избранном/фильтр применён) решает вызывающий код, сюда
 * приходит уже готовый `boolean`.
 */
@Component({
  selector: 'app-button',
  imports: [ButtonModule],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly text = input<string>();
  readonly severity = input<ButtonSeverity>();
  readonly size = input<ButtonSize>();
  readonly disabled = input(false);
  readonly icon = input<string>();
  readonly active = input(false);
}
