import { Component, computed, input } from '@angular/core';

// Каждый инстанс получает свой -uid суффикс на все id/url(#...) в шаблоне —
// без этого несколько <app-section-title> на одной странице делили бы один
// и тот же id, а url(#id) резолвился бы в первый попавшийся элемент в
// документе, не в свой собственный <svg> (тот же баг, что был у Button,
// см. frontend/src/app/shared/components/button/button.ts).
let nextSectionTitleUid = 0;

/** Ширина «птички»-шеврона (98→112 в исходном SVG) — фиксирована, не зависит от width(). */
const CHEVRON_WIDTH = 14;
const CHEVRON_HALF = CHEVRON_WIDTH / 2;

/** Не даёт левой/правой линии инвертироваться при совсем маленьком width(). */
const MIN_WIDTH = 30;

/** Ширина подчёркивания без width() — совпадает с исходным дизайном. */
const DEFAULT_WIDTH = 210;

/**
 * Заголовок секции с декоративным подчёркиванием (stream.Front#37) —
 * перенос приложенного SVG (Group 471, viewBox 0 0 210 53). Из исходника
 * взята только нижняя декоративная часть — верхняя часть (текст, запечённый
 * как path с тенью) удалена и заменена живым `text()`. Typography — Figma
 * text-стиль "H1" (Montserrat Bold 28/36, letter-spacing 8%), вынесена в
 * миксин `mixins.h1` (`frontend/src/styles/_mixins.scss`).
 *
 * Подчёркивание — 3 части (левая линия / центральный шеврон-«птичка» /
 * правая линия), общая ширина задаётся `width()` (px, по прямому запросу
 * пользователя — не измеряется автоматически, вводится явно). Левая и
 * правая линии растягиваются от `width()` — равны по длине и зеркальны
 * (левая transparent→gold, правая gold→transparent), шеврон фиксированного
 * размера (`CHEVRON_WIDTH`) только сдвигается, чтобы остаться по центру, сам
 * не масштабируется (та же идея, что у гема/колец в Button). `width()`
 * клампится снизу (`MIN_WIDTH`), чтобы конструкция не ломалась (линии не
 * инвертируются) при совсем маленьких значениях.
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
  readonly width = input<number>();

  protected readonly totalWidth = computed(() => Math.max(this.width() ?? DEFAULT_WIDTH, MIN_WIDTH));
  protected readonly viewBox = computed(() => `0 41 ${this.totalWidth()} 12`);
  private readonly midpoint = computed(() => this.totalWidth() / 2);

  protected readonly leftLineEndX = computed(() => this.midpoint() - CHEVRON_HALF);
  protected readonly rightLineStartX = computed(() => this.midpoint() + CHEVRON_HALF);
  // Исходный path шеврона нарисован с центром в x=105 — сдвигаем его целиком
  // на разницу между новой серединой и этой исходной координатой.
  protected readonly chevronTransform = computed(() => `translate(${this.midpoint() - 105} 0)`);
}
