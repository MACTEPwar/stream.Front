import { Component, computed, input } from '@angular/core';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS, PinnedNewsSlot } from '../../models/pinned-news-slot.model';
import { NewsCard } from '../news-card/news-card';

export interface PinnedNewsGridEntry {
  readonly item: NewsItem;
  readonly tags: NewsTag[];
  readonly slot: PinnedNewsSlot;
}

/**
 * Левая часть страницы «Новости» (`stream.Front#112`) — концептуальная сетка
 * `columns`×`rows` (`pinned-news-slot.model.ts`), каждая закреплённая новость
 * занимает произвольный прямоугольник ячеек по координатам своего
 * `PinnedNewsSlot` (`grid-column`/`grid-row`, не auto-placement). Сама
 * раскладка приходит извне (`NewsPage`, из `NewsService.getPinnedSlots()`) —
 * этот компонент только рендерит уже готовые записи, ничего не валидирует и
 * не переставляет сам.
 *
 * Высота строки — адаптивная (`grid-template-rows: repeat(rows, 1fr)` от
 * реальной высоты `:host`, не px) — весь грид всегда умещается в доступную
 * область без вертикального скролла; `:host` получает свою высоту от
 * родителя (`NewsPage`, flex-цепочка до `height: 100vh` у `Shell`), сам
 * компонент высоту не вычисляет. Колонки — `minmax(0, 1fr)`, а не фикс. px, —
 * тем же способом дают сетке пропорционально сжиматься на узких экранах
 * вместо горизонтального скролла (карточки внутри визуально уменьшаются, это
 * ожидаемо).
 *
 * **Размер сетки — входы, не константы** (`stream.Front#118`): `columns`/
 * `rows` — реальная настраиваемая величина (`PinnedGridConfig`,
 * `NewsService.getGridConfig()`, меняется через `PinnedGridEditor`), не
 * зафиксированные 3×12; дефолты (`DEFAULT_GRID_COLUMNS`/`DEFAULT_GRID_ROWS`)
 * только на случай, если родитель их не передал. `grid-template-columns`/
 * `grid-template-rows` собираются в TS (`repeat(N, ...)`) и применяются через
 * `[style.*]` на `:host` — SCSS больше не хардкодит `repeat(3, ...)`/
 * `repeat(12, 1fr)`.
 */
@Component({
  selector: 'app-pinned-news-grid',
  imports: [NewsCard],
  templateUrl: './pinned-news-grid.html',
  styleUrl: './pinned-news-grid.scss',
  host: {
    '[style.grid-template-columns]': 'gridTemplateColumns()',
    '[style.grid-template-rows]': 'gridTemplateRows()',
  },
})
export class PinnedNewsGrid {
  readonly entries = input<PinnedNewsGridEntry[]>([]);
  readonly columns = input<number>(DEFAULT_GRID_COLUMNS);
  readonly rows = input<number>(DEFAULT_GRID_ROWS);

  protected readonly gridTemplateColumns = computed(() => `repeat(${this.columns()}, minmax(0, 1fr))`);
  protected readonly gridTemplateRows = computed(() => `repeat(${this.rows()}, 1fr)`);

  protected gridColumn(slot: PinnedNewsSlot): string {
    return `${slot.colStart} / span ${slot.colSpan}`;
  }

  protected gridRow(slot: PinnedNewsSlot): string {
    return `${slot.rowStart} / span ${slot.rowSpan}`;
  }

  /** `slot.coverImageUrl` (выбран при добавлении карточки в `PinnedGridEditor`, `stream.Front#118`) переопределяет `item.imageUrl` только для отображения — `NewsItem`/`NewsCard` не меняются под это отдельным входом. */
  protected effectiveItem(entry: PinnedNewsGridEntry): NewsItem {
    return entry.slot.coverImageUrl !== null ? { ...entry.item, imageUrl: entry.slot.coverImageUrl } : entry.item;
  }
}
