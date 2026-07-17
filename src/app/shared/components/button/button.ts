import { Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary';

let uidSeq = 0;

/**
 * Кнопка (stream.Front#39) — точный перенос приложенного SVG «Поддержать»
 * (Frame 68, 320×51: реальные фильтры/градиенты/маски, не приближение).
 * Зашитый текст-путь заменён на живой HTML-оверлей (`text()`), остальное —
 * буквально как в оригинале. Фиксированные размер/пропорции — намеренно:
 * по договорённости с пользователем сначала переносим кнопку 1:1 как есть,
 * динамическую ширину под произвольный текст делаем отдельным шагом позже
 * (растягивание одного файла ломало узор на углах — предыдущие раунды).
 * `variant` (`'primary' | 'secondary'`) — часть цветов параметризована через
 * CSS custom properties (тело/тени), рамка/гем/glow остаются золотыми для
 * обоих вариантов (по макету «Сетка»). id внутри SVG уникальны на инстанс
 * (`uid`), чтобы не конфликтовали при нескольких кнопках на странице.
 */
@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly text = input.required<string>();
  readonly variant = input<ButtonVariant>('primary');

  readonly uid = `btn-${uidSeq++}`;
}
