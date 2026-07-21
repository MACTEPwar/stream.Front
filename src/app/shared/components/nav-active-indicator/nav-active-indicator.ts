import { Component, computed, input } from '@angular/core';

// Каждый инстанс получает свой -uid суффикс на оба url(#...) в шаблоне —
// без этого несколько <app-nav-active-indicator> на одной странице делили
// бы один и тот же id, а url(#id) резолвился бы в первый попавшийся элемент
// в документе, не в свой собственный <svg> (тот же баг, что был у Button/
// SectionTitle, см. frontend/src/app/shared/components/button/button.ts).
let nextNavActiveIndicatorUid = 0;

/** Исходная (Figma) ширина SVG — совпадает с шириной текста "Главная" в макете. */
const DEFAULT_WIDTH = 91;

/** Ширина центрального декоративного блока (шевроны+ромб, x∈[36.5, 54.5]) — не растягивается, только сдвигается. */
const CENTER_HALF_WIDTH = 9;

/** Длина одной затухающей линии в исходнике (x∈[0, 36.5] / зеркально [54.5, 91]) — растягивается/сжимается. */
const LINE_WIDTH = 36.5;

/**
 * Декоративная подложка активного пункта меню (stream.Front#49) — перенос
 * приложенного пользователем SVG (91×10): две затухающие горизонтальные
 * линии по краям, сходящиеся к паре стрелочек-шевронов и ромбу в центре.
 *
 * Общая ширина (`width()`) не фиксирована — по прямому запросу пользователя
 * подстраивается под ширину текста активного пункта меню (см. Shell,
 * измерение через ResizeObserver). Растягивается только затухающая линия по
 * каждому краю (9-slice-подобная схема, тот же приём, что у Button/
 * SectionTitle — anchoredScale/фиксированный центр): центральный блок
 * (шевроны+ромб, `CENTER_HALF_WIDTH` от середины) фиксированного размера,
 * только сдвигается вместе с серединой, чтобы не исказить его геометрию.
 */
@Component({
  selector: 'app-nav-active-indicator',
  imports: [],
  templateUrl: './nav-active-indicator.html',
  styleUrl: './nav-active-indicator.scss',
  // Хост в Shell центрируется через `left: 50%; transform: translateX(-50%)`
  // при auto-ширине — без явной ширины на самом хосте это превращает
  // shrink-to-fit-вычисление в CSS в min(preferred, containingBlockWidth -
  // left) = min(width(), width()/2) = width()/2, т.к. left уже "съедает"
  // половину доступного пространства (баг воспроизводится с любым `left`
  // в процентах на auto-width абсолютно спозиционированном элементе).
  // Явная ширина на хосте убирает эту auto-fit-арифметику целиком.
  host: { '[style.width.px]': 'width()' },
})
export class NavActiveIndicator {
  protected readonly uid = `navactiveindicator${nextNavActiveIndicatorUid++}`;

  readonly width = input<number>(DEFAULT_WIDTH);

  protected readonly shift = computed(() => (this.width() - DEFAULT_WIDTH) / 2);
  protected readonly scale = computed(() => (this.width() / 2 - CENTER_HALF_WIDTH) / LINE_WIDTH);

  protected readonly leftLineTransform = computed(() => `scale(${this.scale()} 1)`);
  protected readonly centerTransform = computed(() => `translate(${this.shift()} 0)`);
  // Правая линия начинается в x=DEFAULT_WIDTH-LINE_WIDTH=54.5 — растягивать
  // её надо от ЭТОЙ точки (левый край, стык с центральным блоком), а не от
  // начала координат (0), иначе после масштабирования левый край линии
  // перестаёт совпадать с новым правым краем центрального блока — тот же
  // anchoredScale-приём, что у Button/SectionTitle/ListItem.
  protected readonly rightLineTransform = computed(() => {
    const anchor = DEFAULT_WIDTH - LINE_WIDTH;
    return `translate(${this.shift()} 0) translate(${anchor} 0) scale(${this.scale()} 1) translate(${-anchor} 0)`;
  });
}
