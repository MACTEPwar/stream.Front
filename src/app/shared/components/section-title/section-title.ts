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
 * взята только нижняя декоративная часть (2 затухающие линии + шеврон по
 * центру) — верхняя часть (текст, запечённый как path с тенью) удалена и
 * заменена живым `text()`. Typography — Figma text-стиль "H1" (Montserrat
 * Bold 28/36, letter-spacing 8%), вынесена в миксин `mixins.h1`
 * (`frontend/src/styles/_mixins.scss`) — первый компонент с именованным
 * многосвойственным Figma text-стилем, поэтому заведён миксин, а не просто
 * россыпь токенов инлайн, как раньше у Button.
 *
 * По прямому запросу пользователя это первый (неполный) проход: ширина
 * подчёркивания зафиксирована на 210px, как в исходнике, НЕ подстраивается
 * под длину текста — при коротком тексте подчёркивание нависает за него, при
 * длинном текст перетекает за подчёркивание. Доработка (адаптивная ширина)
 * — отдельная будущая задача, см. PROJECT_MAP.md.
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
