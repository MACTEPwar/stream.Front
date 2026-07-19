import { Component, ElementRef, computed, effect, input, signal, viewChild } from '@angular/core';

// Каждый инстанс получает свой -uid суффикс на все id/url(#...) в шаблоне —
// без этого несколько <app-section-title> на одной странице делили бы один
// и тот же id, а url(#id) резолвился бы в первый попавшийся элемент в
// документе, не в свой собственный <svg> (тот же баг, что был у Button,
// см. frontend/src/app/shared/components/button/button.ts).
let nextSectionTitleUid = 0;

/** Ширина «птички»-шеврона (98→112 в исходном SVG) — фиксирована, не зависит от totalWidth(). */
const CHEVRON_WIDTH = 14;
const CHEVRON_HALF = CHEVRON_WIDTH / 2;

/** Не даёт левой/правой линии инвертироваться при совсем короткой ширине текста. */
const MIN_WIDTH = 30;

/** Ширина текста ещё не измерена ResizeObserver'ом (первый рендер, или jsdom в юнит-тестах) — совпадает с исходным дизайном. */
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
 * правая линия), общая ширина НЕ вводится отдельным инпутом — по прямому
 * запросу пользователя равна фактической ширине отрендеренного `text()`,
 * измеряется `ResizeObserver`'ом на самом `<h2>` (тот же приём, что и у
 * `width()="content"` в Button) — реагирует и на смену `text()`, и на смену
 * шрифта/контейнера. Левая и правая линии растягиваются от этой ширины —
 * равны по длине и зеркальны (левая transparent→gold, правая gold→transparent),
 * шеврон фиксированного размера (`CHEVRON_WIDTH`) только сдвигается, чтобы
 * остаться по центру, сам не масштабируется (та же идея, что у гема/колец в
 * Button). Ширина клампится снизу (`MIN_WIDTH`), чтобы конструкция не
 * ломалась (линии не инвертируются) при совсем коротком тексте.
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

  private readonly textEl = viewChild<ElementRef<HTMLHeadingElement>>('textEl');
  private readonly measuredTextWidthPx = signal(DEFAULT_WIDTH);

  protected readonly totalWidth = computed(() => Math.max(this.measuredTextWidthPx(), MIN_WIDTH));
  protected readonly viewBox = computed(() => `0 41 ${this.totalWidth()} 12`);
  private readonly midpoint = computed(() => this.totalWidth() / 2);

  protected readonly leftLineEndX = computed(() => this.midpoint() - CHEVRON_HALF);
  protected readonly rightLineStartX = computed(() => this.midpoint() + CHEVRON_HALF);
  // Исходный path шеврона нарисован с центром в x=105 — сдвигаем его целиком
  // на разницу между новой серединой и этой исходной координатой.
  protected readonly chevronTransform = computed(() => `translate(${this.midpoint() - 105} 0)`);

  constructor() {
    effect((onCleanup) => {
      const el = this.textEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => this.measuredTextWidthPx.set(entry.contentRect.width));
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }
}
