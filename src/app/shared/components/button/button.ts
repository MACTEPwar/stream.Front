import { Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary';

/**
 * Переиспользуемая hex-образная кнопка (stream.Front#39) по референсам
 * (скриншоты «Видео»/«Поддержать»/«Сетка» + приложенный SVG «Поддержать»).
 * Форма — CSS `clip-path` с фиксированной глубиной среза углов: при любой
 * длине текста растягивается только средняя часть, узор (гранёные концы,
 * диамант по центру сверху) не ломается — принципиально отличается от
 * растягивания самого SVG/картинки.
 *
 * Открытые вопросы: цвета `secondary` (синяя «Сетка») сняты приблизительно
 * с малоразрешённого скриншота, а не с точного SVG (в отличие от `primary`,
 * который основан на приложенном векторе «Поддержать») — требует сверки,
 * когда будет точный референс. Только 2 варианта цвета — по договорённости.
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
}
