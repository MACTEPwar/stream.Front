import { formatDate } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { Badge } from '@shared/components/badge/badge';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { formatCompactCount } from '../../utils/format-compact-count';

/**
 * Карточка новости в закреплённой сетке страницы «Новости»
 * (`docs/figma/news1.json`, `stream.Front#112`). Раньше существовало три
 * фиксированных px-варианта (`featured`/`compact`/`wide`, `variant` input) —
 * с переходом страницы на bento-сетку 3×12 (`PinnedNewsGrid`, где размер
 * каждой карточки определяет произвольный `colSpan`/`rowSpan` слота, а не
 * дискретный набор из трёх заранее известных форм) `variant` убран целиком:
 * карточка растягивается на 100% ширины/высоты своей grid-ячейки
 * (`:host { width: 100%; height: 100% }`), а переключение "картинка сверху" /
 * "картинка слева" — не проп, а CSS container-запрос по фактической
 * ориентации самой ячейки (`@container (orientation: landscape)`, см.
 * `news-card.scss`) — так это работает для любого реального colSpan/rowSpan,
 * без необходимости синхронизировать отдельный проп с раскладкой слота.
 *
 * Блок заголовок+текст — гибкой высоты с `overflow: hidden`: в маленькой
 * ячейке текст-превью может не влезать целиком (или не влезать вовсе) — он
 * просто обрезается, карточка никогда не растягивается сверх размера ячейки.
 *
 * Теги — общий `Badge` (цвет/severity приходят из `NewsTag`, тот же
 * источник, что у `NewsFilterSidebar`), просмотры/лайки — `pi pi-eye`/`pi
 * pi-heart`.
 */
@Component({
  selector: 'app-news-card',
  imports: [Badge],
  templateUrl: './news-card.html',
  styleUrl: './news-card.scss',
})
export class NewsCard {
  readonly item = input.required<NewsItem>();
  readonly tags = input<NewsTag[]>([]);

  protected readonly viewsLabel = computed(() => formatCompactCount(this.item().views));
  protected readonly likesLabel = computed(() => formatCompactCount(this.item().likes));
  protected readonly dateLabel = computed(() => formatDate(this.item().publishedAt, 'dd.MM.yyyy', 'en-US'));
}
