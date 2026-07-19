import { Component, input } from '@angular/core';

// Каждый инстанс получает свой -uid суффикс на все id/url(#...) в шаблоне —
// без этого несколько <app-section-title> на одной странице делили бы один
// и тот же id, а url(#id) резолвился бы в первый попавшийся элемент в
// документе, не в свой собственный <svg> (тот же баг, что был у Button,
// см. frontend/src/app/shared/components/button/button.ts).
let nextSectionTitleUid = 0;

/**
 * Заголовок секции с декоративным подчёркиванием (stream.Front#37) —
 * перенос приложенного SVG (Group 471, viewBox 0 0 210 53). Из исходника
 * взята только нижняя декоративная часть — верхняя часть (текст, запечённый
 * как path с тенью) удалена и заменена живым `text()`. Typography — Figma
 * text-стиль "H1" (Montserrat Bold 28/36, letter-spacing 8%), вынесена в
 * миксин `mixins.h1` (`frontend/src/styles/_mixins.scss`).
 *
 * Подчёркивание разбито на 3 части по горизонтали через `clip-path`
 * (левая линия / центральный шеврон-«птичка» / правая линия), границы —
 * 98/112, собственные вершины исходного контура (там же, где раньше стыковались
 * левый/правый path и шеврон). Это ТОЛЬКО разбивка, без растягивания —
 * тот же первый шаг, что был у Button (сначала клипы, потом transform):
 * сейчас всё показывается в исходном фиксированном размере 1:1, адаптация
 * ширины под текст — следующий шаг, ещё не сделан.
 */
@Component({
  selector: 'app-section-title',
  imports: [],
  templateUrl: './section-title.html',
  styleUrl: './section-title.scss',
})
export class SectionTitle {
  protected readonly uid = `sectiontitle${nextSectionTitleUid++}`;

  readonly text = input.required<string>();
}
