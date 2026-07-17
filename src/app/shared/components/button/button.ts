import { Component } from '@angular/core';

/**
 * Кнопка «Поддержать» (stream.Front#39) — статичный 1:1 перенос
 * приложенного SVG (Frame 68, 320×51), без параметризации: без вариантов,
 * без текста-инпута, без уникальных id. По прямому запросу пользователя
 * все inputs предыдущей версии убраны — компонент рендерит ровно то, что
 * было в макете.
 */
@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {}
