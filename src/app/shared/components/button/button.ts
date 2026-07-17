import { afterRenderEffect, Component, ElementRef, input, signal, viewChild } from '@angular/core';

/**
 * Кнопка «Поддержать» (stream.Front#39) — статичный 1:1 перенос
 * приложенного SVG (Frame 68, 320×51), без вариантов, без уникальных id.
 * Динамические места — только текст (`text()`, живой HTML-оверлей поверх
 * SVG, typography — Figma-компонент «Button») и иконка через content
 * projection ([icon] в button.html, слот может быть пустым). Без иконки
 * текст автоматически сдвигается по горизонтали в центр кнопки (hasIcon()).
 */
@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly text = input.required<string>();

  private readonly iconSlot = viewChild<ElementRef<HTMLElement>>('iconSlot');

  protected readonly hasIcon = signal(false);

  constructor() {
    afterRenderEffect({
      read: () => {
        const el = this.iconSlot()?.nativeElement;
        this.hasIcon.set(!!el && el.childElementCount > 0);
      },
    });
  }
}
