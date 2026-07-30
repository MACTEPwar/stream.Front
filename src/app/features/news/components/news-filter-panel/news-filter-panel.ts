import { Component, OnInit, computed, effect, inject, output, signal } from '@angular/core';

import { Badge } from '@shared/components/badge/badge';
import { Checkbox } from '@shared/components/checkbox/checkbox';
import { DatepickerRange } from '@shared/components/datepicker-range/datepicker-range';
import { TextField } from '@shared/components/text-field/text-field';

import { NewsTag } from '../../models/news-tag.model';
import { NewsTagService } from '../../services/news-tag.service';

export interface NewsFilter {
  dateFrom: Date | null;
  dateTo: Date | null;
  tags: string[];
}

function asSingleDate(value: Date | Date[] | null): Date | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Панель фильтра новостей по тегам и диапазону дат (stream.Front#111) —
 * демо на `NewsPage`, БЕЗ попап-обвязки (отдельная задача) и БЕЗ применения
 * к реальному списку новостей (списка ещё не существует).
 *
 * Список тегов (слева) отсортирован: сначала выбранные (в исходном порядке
 * из `NewsTagService`), потом невыбранные (тоже в исходном порядке) — при
 * выборе тег "поднимается" наверх, при снятии возвращается на своё место
 * среди невыбранных. Поиск (`TextField`) фильтрует уже отсортированный
 * список case-insensitive подстрокой по имени.
 *
 * Чипы выбранных тегов (`Badge` + отдельная кликабельная иконка-крестик) и
 * чекбоксы синхронизированы через общий `selectedTagIds`.
 *
 * `filterChange` эмитится через `effect()` при любом изменении дат/тегов —
 * единый снимок `{ dateFrom, dateTo, tags }`.
 */
@Component({
  selector: 'app-news-filter-panel',
  imports: [Badge, Checkbox, DatepickerRange, TextField],
  templateUrl: './news-filter-panel.html',
  styleUrl: './news-filter-panel.scss',
})
export class NewsFilterPanel implements OnInit {
  private readonly newsTagService = inject(NewsTagService);

  readonly filterChange = output<NewsFilter>();

  protected readonly tags = signal<NewsTag[]>([]);
  protected readonly selectedTagIds = signal<ReadonlySet<string>>(new Set());
  protected readonly searchQuery = signal('');

  protected readonly leftValue = signal<Date | Date[] | null>(null);
  protected readonly rightValue = signal<Date | Date[] | null>(null);

  protected readonly selectedTags = computed(() =>
    this.tags().filter((tag) => this.selectedTagIds().has(tag.id)),
  );

  protected readonly filteredTags = computed(() => {
    const selectedIds = this.selectedTagIds();
    const query = this.searchQuery().trim().toLowerCase();

    const selected: NewsTag[] = [];
    const unselected: NewsTag[] = [];
    for (const tag of this.tags()) {
      (selectedIds.has(tag.id) ? selected : unselected).push(tag);
    }

    return [...selected, ...unselected].filter((tag) => tag.name.toLowerCase().includes(query));
  });

  private readonly dateFrom = computed(() => asSingleDate(this.leftValue()));
  private readonly dateTo = computed(() => asSingleDate(this.rightValue()));

  constructor() {
    effect(() => {
      this.filterChange.emit({
        dateFrom: this.dateFrom(),
        dateTo: this.dateTo(),
        tags: [...this.selectedTagIds()],
      });
    });
  }

  ngOnInit(): void {
    this.newsTagService.getTags().subscribe((tags) => this.tags.set(tags));
  }

  protected isTagSelected(tagId: string): boolean {
    return this.selectedTagIds().has(tagId);
  }

  protected toggleTag(tagId: string, checked: boolean): void {
    this.selectedTagIds.update((ids) => {
      const next = new Set(ids);
      if (checked) {
        next.add(tagId);
      } else {
        next.delete(tagId);
      }
      return next;
    });
  }

  protected removeTag(tagId: string): void {
    this.toggleTag(tagId, false);
  }
}
