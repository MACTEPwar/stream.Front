import { afterRenderEffect, Component, ElementRef, signal, viewChild } from '@angular/core';

/**
 * Кнопка «Поддержать» (stream.Front#39) — статичный 1:1 перенос
 * приложенного SVG (Frame 68, 320×51), без параметризации: без вариантов,
 * без текста-инпута, без уникальных id. По прямому запросу пользователя
 * все inputs предыдущей версии убраны — компонент рендерит ровно то, что
 * было в макете. Единственное, что можно подставить снаружи — иконка через
 * content projection ([icon] в button.html); слот может быть и пустым —
 * тогда текст «ПОДДЕРЖАТЬ» (статичный path) сдвигается по горизонтали в
 * центр кнопки (hasIcon()), т.к. без иконки исходная левая позиция текста
 * смотрится некрасиво смещённой.
 */
@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
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
