import { Signal, WritableSignal, computed, inject, signal } from '@angular/core';

import { NewsFilter } from '../models/news-filter.model';
import { NewsTag } from '../models/news-tag.model';
import { NewsTagService } from './news-tag.service';

function asSingleDate(value: Date | Date[] | null): Date | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export interface NewsTagFilterState {
  readonly tags: WritableSignal<NewsTag[]>;
  readonly selectedTagIds: WritableSignal<ReadonlySet<string>>;
  readonly searchQuery: WritableSignal<string>;
  readonly leftValue: WritableSignal<Date | Date[] | null>;
  readonly rightValue: WritableSignal<Date | Date[] | null>;
  readonly selectedTags: Signal<NewsTag[]>;
  readonly filteredTags: Signal<NewsTag[]>;
  readonly filter: Signal<NewsFilter>;
  readonly activeFilterCount: Signal<number>;
  loadTags(): void;
  isTagSelected(tagId: string): boolean;
  toggleTag(tagId: string, checked: boolean): void;
  removeTag(tagId: string): void;
  reset(): void;
}

/**
 * Общая бизнес-логика фильтра новостей по тегам и периоду (stream.Front#111) —
 * список тегов/поиск/сортировка выбранных наверх/`selectedTagIds`/даты/
 * итоговый `{dateFrom,dateTo,tags}`.
 *
 * Единственный потребитель — `NewsFilterSidebar` (`news-filter-sidebar.ts`),
 * которая использует один инстанс этого состояния как ЧЕРНОВИК (draft):
 * пока сайдбар открыт, `leftValue`/`rightValue`/`selectedTagIds` меняются
 * свободно, наружу (`filterChange`) уходят только через явный коммит
 * ("Применить"/"Очистить") — `NewsFilterSidebar` сама хранит отдельные
 * applied-signals и синхронизирует в этот draft при каждом открытии сайдбара
 * (см. её же комментарий).
 *
 * Обычная фабричная функция (не `@Injectable`) — вызывается в injection
 * context (поле/конструктор компонента, как `input()`/`inject()` в проекте),
 * каждый вызов создаёт независимый набор signals (в отличие от
 * `providedIn: 'root'`-сервиса, тут состояние на инстанс компонента, не
 * синглтон на всё приложение).
 */
export function createNewsTagFilterState(): NewsTagFilterState {
  const newsTagService = inject(NewsTagService);

  const tags = signal<NewsTag[]>([]);
  const selectedTagIds = signal<ReadonlySet<string>>(new Set());
  const searchQuery = signal('');
  const leftValue = signal<Date | Date[] | null>(null);
  const rightValue = signal<Date | Date[] | null>(null);

  const selectedTags = computed(() => tags().filter((tag) => selectedTagIds().has(tag.id)));

  const filteredTags = computed(() => {
    const selectedIds = selectedTagIds();
    const query = searchQuery().trim().toLowerCase();

    const selected: NewsTag[] = [];
    const unselected: NewsTag[] = [];
    for (const tag of tags()) {
      (selectedIds.has(tag.id) ? selected : unselected).push(tag);
    }

    return [...selected, ...unselected].filter((tag) => tag.name.toLowerCase().includes(query));
  });

  const dateFrom = computed(() => asSingleDate(leftValue()));
  const dateTo = computed(() => asSingleDate(rightValue()));

  const filter = computed<NewsFilter>(() => ({
    dateFrom: dateFrom(),
    dateTo: dateTo(),
    tags: [...selectedTagIds()],
  }));

  const activeFilterCount = computed(
    () => selectedTagIds().size + (dateFrom() || dateTo() ? 1 : 0),
  );

  function loadTags(): void {
    newsTagService.getTags().subscribe((value) => tags.set(value));
  }

  function isTagSelected(tagId: string): boolean {
    return selectedTagIds().has(tagId);
  }

  function toggleTag(tagId: string, checked: boolean): void {
    selectedTagIds.update((ids) => {
      const next = new Set(ids);
      if (checked) {
        next.add(tagId);
      } else {
        next.delete(tagId);
      }
      return next;
    });
  }

  function removeTag(tagId: string): void {
    toggleTag(tagId, false);
  }

  function reset(): void {
    selectedTagIds.set(new Set());
    leftValue.set(null);
    rightValue.set(null);
  }

  return {
    tags,
    selectedTagIds,
    searchQuery,
    leftValue,
    rightValue,
    selectedTags,
    filteredTags,
    filter,
    activeFilterCount,
    loadTags,
    isTagSelected,
    toggleTag,
    removeTag,
    reset,
  };
}
