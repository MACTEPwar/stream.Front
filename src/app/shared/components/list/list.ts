import { Component, computed, input } from '@angular/core';

import { ListItem, ListItemDividers, ListItemSegment } from '../list-item/list-item';

/** Направление раскладки — вертикальный стек строк или горизонтальный ряд. */
export type ListDirection = 'row' | 'column';

/**
 * `'stretch'` — элементы делят доступное место поровну (для `column` это
 * просто полная ширина, для `row` — `1fr`-колонки, их количество и,
 * соответственно, ширина каждой определяются числом элементов `items()`).
 * `'auto'` — каждый элемент занимает столько места, сколько нужно контенту.
 */
export type ListItemWidth = 'stretch' | 'auto';

/** Данные одного элемента списка — id для трекинга + его сегменты (см. `ListItem`). */
export interface ListItemData {
  id: string | number;
  segments: ListItemSegment[];
  /** Тип левого/правого декоративного разделителя этого item'а — см. `ListItemDividers`, без значения — оба `'ornament'`. */
  dividers?: ListItemDividers;
}

/**
 * Настройки списка целиком. Модель заведомо неполная и будет расти —
 * пользователь пока сам не знает, что ещё сюда понадобится (например
 * дефолтные цвета сегментов, если их не задавать на каждый item отдельно).
 */
export interface ListSettings {
  direction?: ListDirection;
  itemWidth?: ListItemWidth;
  gap?: number;
}

/**
 * Компонент-оркестратор списка: данные (`items()`, массив `ListItemData`) +
 * настройки (`settings()`, `ListSettings`) — снаружи (`ScheduleWidget`,
 * `DonatorsWidget`, что угодно ещё) просто отдаёт массив item'ов, `List`
 * сам раскладывает их (направление/ширина элементов — через `settings()`)
 * и рендерит каждый через `ListItem`. Раньше раскладка была вынесена в
 * отдельный `ListContainer` — по прямому запросу пользователя убран
 * (отдельный контейнер поверх `List` избыточен), логика раскладки перенесена
 * сюда же, на `:host`.
 *
 * Раскладка — CSS Grid на `:host`, не Flexbox: `List` не должен трогать
 * разметку/стили самого `ListItem` (`grid-auto-columns`/`grid-auto-rows` +
 * дефолтный `justify-items: stretch` управляют размером треков и элементов
 * структурно, по DOM-иерархии, без обращения к детям через селекторы —
 * Flexbox потребовал бы `flex`/ширину на каждом ребёнке напрямую).
 * `direction: 'column'` (дефолт) → `grid-auto-flow: row`, единственная
 * grid-колонка по умолчанию и так на всю ширину — `itemWidth` управляет
 * `justify-items` (`stretch` — на всю ширину, `auto` → `start` — по
 * контенту). `direction: 'row'` → `grid-auto-flow: column`,
 * `itemWidth: 'stretch'` → `grid-auto-columns: 1fr` (N колонок делят
 * ширину поровну по фактическому числу `items()`), `itemWidth: 'auto'` →
 * `grid-auto-columns: max-content`.
 *
 * Модель данных сознательно неполная — заложены только объекты и раскладка,
 * без доменной логики загрузки (она остаётся за отдельными сервисами вроде
 * будущего `ScheduleService`).
 */
@Component({
  selector: 'app-list',
  imports: [ListItem],
  templateUrl: './list.html',
  styleUrl: './list.scss',
  host: {
    '[style.display]': "'grid'",
    '[style.gridAutoFlow]': 'gridAutoFlow()',
    '[style.gridAutoColumns]': 'gridAutoColumns()',
    '[style.gridAutoRows]': 'gridAutoRows()',
    '[style.justifyItems]': 'justifyItems()',
    '[style.gap.px]': 'gap()',
  },
})
export class List {
  readonly items = input.required<ListItemData[]>();
  readonly settings = input<ListSettings>({});

  protected readonly direction = computed(() => this.settings().direction ?? 'column');
  protected readonly itemWidth = computed(() => this.settings().itemWidth ?? 'stretch');
  protected readonly gap = computed(() => this.settings().gap ?? 0);

  protected readonly gridAutoFlow = computed(() => (this.direction() === 'row' ? 'column' : 'row'));
  protected readonly gridAutoColumns = computed(() => {
    if (this.direction() !== 'row') return null;
    return this.itemWidth() === 'stretch' ? '1fr' : 'max-content';
  });
  protected readonly gridAutoRows = computed(() => (this.direction() === 'column' ? 'auto' : null));
  protected readonly justifyItems = computed(() => (this.itemWidth() === 'stretch' ? 'stretch' : 'start'));
}
