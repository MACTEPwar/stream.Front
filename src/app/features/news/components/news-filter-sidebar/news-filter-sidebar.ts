import { formatDate } from '@angular/common';
import { Component, OnInit, computed, output, signal } from '@angular/core';
import { ChipModule } from 'primeng/chip';
import { DrawerModule } from 'primeng/drawer';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { PopoverModule } from 'primeng/popover';

import { Button } from '@shared/components/button/button';
import { Checkbox } from '@shared/components/checkbox/checkbox';
import { Datepicker } from '@shared/components/datepicker/datepicker';
import { TextField } from '@shared/components/text-field/text-field';

import { NewsFilter } from '../../models/news-filter.model';
import { NewsTag } from '../../models/news-tag.model';
import { createNewsTagFilterState } from '../../services/news-tag-filter.state';

export type { NewsFilter } from '../../models/news-filter.model';

/**
 * Сайдбар фильтра новостей по тегам и периоду (stream.Front#111) — финальная
 * раскладка после сравнения 3 demo-вариантов (`news-filter-panel`,
 * `news-filter-variants/*`, оба удалены при выборе этого дизайна).
 *
 * Триггер — текстовый индикатор применённого периода (`periodLabel()`,
 * скрыт целиком, если период не задан) + кнопка-воронка с
 * `p-overlay-badge`-счётчиком выбранных ТЕГОВ (не дат; бейдж скрыт целиком
 * при 0 тегов, `undefined`, а не `0`, — `OverlayBadge.value` не рендерит
 * бейдж на пустом значении). По клику — `p-drawer(position="right")`.
 *
 * **Черновик (draft) vs applied** — единственный инстанс
 * `createNewsTagFilterState()` используется как ЧЕРНОВИК: пока сайдбар
 * открыт, пользователь свободно меняет даты/теги, это НЕ должно сразу же
 * менять индикатор/бейдж на триггере. Отдельные приватные applied-signals
 * (`appliedDateFrom`/`appliedDateTo`/`appliedTagIds`) — источник для
 * индикатора/бейджа/`filterChange`, обновляются ТОЛЬКО по "Применить"/
 * "Очистить" (`apply()`/`clear()`), не на каждое изменение черновика (в
 * отличие от прежней реализации через `effect()`). `open()` (клик по
 * кнопке-триггеру) синхронизирует черновик из applied ПЕРЕД показом
 * сайдбара — если пользователь закрыл сайдбар без "Применить" (backdrop/
 * Esc/иконка закрытия — все три ведут к `visible=false` через `[(visible)]`
 * без вызова `apply()`), черновик просто остаётся неиспользуемым мусором до
 * следующего `open()`, который его перезатирает актуальным applied-
 * состоянием — эффективно "отбрасывает" недосохранённые правки.
 *
 * Даты — два НЕЗАВИСИМЫХ попап-`Datepicker(selectionMode="single")`
 * ("Дата с"/"Дата по"), не `DatepickerRange` (тот — `inline`, для этой
 * раскладки не подходит). Переиспользованы `leftValue`/`rightValue` того же
 * `createNewsTagFilterState()` — поля исходно заводились под
 * `DatepickerRange`, но по факту это просто "модель значения левого/правого
 * календаря", подходит и двум независимым `Datepicker` без изменений.
 *
 * Теги — ряд `p-chip(removable)` уже выбранных (крестик на чипе →
 * `draft.removeTag()`) + кнопка "+", открывающая компактный `p-popover` с
 * поиском (`draft.searchQuery`) и списком `Checkbox` (`draft.filteredTags()`,
 * `draft.toggleTag()`) — тот же паттерн, что был у `NewsFilterPanel`/demo.
 * Цвет `p-chip` синхронизирован с цветом того же тега в `Checkbox`
 * (`tagChipClass()`/`tagChipStyle()`, см. news-filter-sidebar.scss).
 */
@Component({
  selector: 'app-news-filter-sidebar',
  imports: [
    Button,
    Checkbox,
    ChipModule,
    Datepicker,
    DrawerModule,
    OverlayBadgeModule,
    PopoverModule,
    TextField,
  ],
  templateUrl: './news-filter-sidebar.html',
  styleUrl: './news-filter-sidebar.scss',
})
export class NewsFilterSidebar implements OnInit {
  readonly filterChange = output<NewsFilter>();

  protected readonly visible = signal(false);
  protected readonly draft = createNewsTagFilterState();

  private readonly appliedDateFrom = signal<Date | null>(null);
  private readonly appliedDateTo = signal<Date | null>(null);
  private readonly appliedTagIds = signal<ReadonlySet<string>>(new Set());

  protected readonly periodLabel = computed(() => {
    const dateFrom = this.appliedDateFrom();
    const dateTo = this.appliedDateTo();
    if (!dateFrom && !dateTo) {
      return null;
    }
    if (dateFrom && dateTo) {
      return `${this.formatPeriodDate(dateFrom)} – ${this.formatPeriodDate(dateTo)}`;
    }
    return this.formatPeriodDate((dateFrom ?? dateTo) as Date);
  });

  protected readonly tagBadgeValue = computed(() => {
    const count = this.appliedTagIds().size;
    return count > 0 ? count : undefined;
  });

  ngOnInit(): void {
    this.draft.loadTags();
  }

  protected open(): void {
    this.draft.selectedTagIds.set(new Set(this.appliedTagIds()));
    this.draft.leftValue.set(this.appliedDateFrom());
    this.draft.rightValue.set(this.appliedDateTo());
    this.draft.searchQuery.set('');
    this.visible.set(true);
  }

  protected apply(): void {
    const filter = this.draft.filter();
    this.appliedDateFrom.set(filter.dateFrom);
    this.appliedDateTo.set(filter.dateTo);
    this.appliedTagIds.set(new Set(filter.tags));
    this.visible.set(false);
    this.filterChange.emit(filter);
  }

  /**
   * Публичный, потому что панель — не единственное место, откуда условия
   * сбрасывают: тулбар архива обязан сбросить **все** условия одним действием
   * (`ФИЛ-Ф-03`, `stream.Front#129`), а даты и темы живут здесь. Кнопка
   * «Очистить» внутри панели зовёт этот же метод.
   */
  reset(): void {
    this.draft.reset();
    this.appliedDateFrom.set(null);
    this.appliedDateTo.set(null);
    this.appliedTagIds.set(new Set());
    this.visible.set(false);
    this.filterChange.emit({ dateFrom: null, dateTo: null, tags: [] });
  }

  protected clear(): void {
    this.reset();
  }

  /**
   * Цвет чипа выбранного тега (ряд над попапом) синхронизирован с цветом
   * того же тега в `app-checkbox` попапа — см. `news-filter-sidebar.scss`
   * (`$tag-chip-severities`, продублировано из `$checkbox-severities` в
   * checkbox.scss) для severity и `tagChipStyle()` ниже для кастомного
   * `tag.color`.
   */
  protected tagChipClass(tag: NewsTag): string {
    const modifier = tag.color ? 'custom-color' : `severity-${tag.severity ?? 'primary'}`;
    return `news-filter-sidebar__tag-chip news-filter-sidebar__tag-chip--${modifier}`;
  }

  protected tagChipStyle(tag: NewsTag): Record<string, string> | null {
    return tag.color ? { '--tag-chip-custom-color': tag.color } : null;
  }

  private formatPeriodDate(date: Date): string {
    return formatDate(date, 'dd.MM.yyyy', 'en-US');
  }
}
