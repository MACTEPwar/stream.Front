import { Component, input } from '@angular/core';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { PinnedNewsSlot } from '../../models/pinned-news-slot.model';
import { NewsCard } from '../news-card/news-card';

export interface PinnedNewsGridEntry {
  readonly item: NewsItem;
  readonly tags: NewsTag[];
  readonly slot: PinnedNewsSlot;
}

/**
 * Левая часть страницы «Новости» (`stream.Front#112`) — концептуальная сетка
 * `PINNED_GRID_COLUMNS`×`PINNED_GRID_ROWS` (`pinned-news-slot.model.ts`),
 * каждая закреплённая новость занимает произвольный прямоугольник ячеек по
 * координатам своего `PinnedNewsSlot` (`grid-column`/`grid-row`, не
 * auto-placement). Сама раскладка приходит извне (`NewsPage`, из
 * `NewsService.getPinnedSlots()`) — этот компонент только рендерит уже
 * готовые записи, ничего не валидирует и не переставляет сам.
 *
 * Высота строки — адаптивная (`grid-template-rows: repeat(12, 1fr)` от
 * реальной высоты `:host`, не px) — весь грид всегда умещается в доступную
 * область без вертикального скролла; `:host` получает свою высоту от
 * родителя (`NewsPage`, flex-цепочка до `height: 100vh` у `Shell`), сам
 * компонент высоту не вычисляет. Колонки — `minmax(0, 1fr)`, а не фикс. px, —
 * тем же способом дают сетке пропорционально сжиматься на узких экранах
 * вместо горизонтального скролла (карточки внутри визуально уменьшаются, это
 * ожидаемо).
 */
@Component({
  selector: 'app-pinned-news-grid',
  imports: [NewsCard],
  templateUrl: './pinned-news-grid.html',
  styleUrl: './pinned-news-grid.scss',
})
export class PinnedNewsGrid {
  readonly entries = input<PinnedNewsGridEntry[]>([]);

  protected gridColumn(slot: PinnedNewsSlot): string {
    return `${slot.colStart} / span ${slot.colSpan}`;
  }

  protected gridRow(slot: PinnedNewsSlot): string {
    return `${slot.rowStart} / span ${slot.rowSpan}`;
  }
}
