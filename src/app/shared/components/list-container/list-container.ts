import { Component, computed, input } from '@angular/core';

/** Направление раскладки — вертикальный стек строк или горизонтальный ряд. */
export type ListContainerDirection = 'row' | 'column';

/**
 * `'stretch'` — элементы делят доступное место поровну (для `column` это
 * просто полная ширина, для `row` — `1fr`-колонки, их количество и,
 * соответственно, ширина каждой определяются числом спроецированных
 * элементов). `'auto'` — каждый элемент занимает столько места, сколько
 * нужно его контенту.
 */
export type ListContainerItemWidth = 'stretch' | 'auto';

/**
 * Переиспользуемый layout-контейнер списка (stream.Front#38) — общий паттерн,
 * замеченный между макетами «Расписание» и «Топ донатеров»: и то и другое —
 * список из N элементов, различаются только направлением и шириной элементов.
 * Контент — ЦЕЛИКОМ через content projection (`<ng-content>`), компонент
 * ничего не знает о домене и не трогает разметку/стили спроецированных
 * элементов; вёрстка самих строк (`ScheduleDayRow`/`DonatorRow`) — отдельные
 * задачи (`#30`/`#31`).
 *
 * Раскладка — CSS Grid на `:host`, не Flexbox: Flexbox потребовал бы задать
 * `flex`/ширину на каждом спроецированном ребёнке напрямую, а сделать это
 * через селектор вида `.host > *` в стилях этого компонента нельзя —
 * emulated view encapsulation Angular добавляет атрибут `_ngcontent-*` к
 * обеим частям селектора, а у спроецированного контента (принадлежит шаблону
 * вызывающего компонента) этого атрибута нет, поэтому правило тихо ни на что
 * не сработает. Grid обходит это структурно: `grid-auto-columns`/
 * `grid-auto-rows` и дефолтный `justify-items: stretch` управляют размером
 * треков и элементов по DOM-иерархии, без обращения к детям через селекторы.
 */
@Component({
  selector: 'app-list-container',
  imports: [],
  templateUrl: './list-container.html',
  styleUrl: './list-container.scss',
  // Раскладка задаётся стилями самого :host (нет своего wrapper-элемента, см.
  // комментарий класса выше) — host-биндинги, а не [style.*] в шаблоне,
  // единственный способ реактивно достучаться до стилей :host.
  host: {
    '[style.display]': "'grid'",
    '[style.gridAutoFlow]': 'gridAutoFlow()',
    '[style.gridAutoColumns]': 'gridAutoColumns()',
    '[style.gridAutoRows]': 'gridAutoRows()',
    '[style.justifyItems]': 'justifyItems()',
    '[style.gap.px]': 'gap()',
  },
})
export class ListContainer {
  readonly direction = input<ListContainerDirection>('column');
  readonly itemWidth = input<ListContainerItemWidth>('stretch');
  readonly gap = input<number>(0);

  protected readonly gridAutoFlow = computed(() => (this.direction() === 'row' ? 'column' : 'row'));

  // Для 'row' ширина каждой grid-колонки — сама auto-track ('1fr'/'max-content');
  // для 'column' элементы стоят в единственной колонке, её ширина — вся ширина
  // контейнера по умолчанию, поэтому auto-track здесь управляет уже ВЫСОТОЙ
  // строки (auto — по контенту в обоих случаях, растягивать высоту незачем).
  protected readonly gridAutoColumns = computed(() => {
    if (this.direction() !== 'row') return null;
    return this.itemWidth() === 'stretch' ? '1fr' : 'max-content';
  });
  protected readonly gridAutoRows = computed(() => (this.direction() === 'column' ? 'auto' : null));

  protected readonly justifyItems = computed(() => (this.itemWidth() === 'stretch' ? 'stretch' : 'start'));
}
