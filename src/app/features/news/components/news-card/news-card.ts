import { formatDate } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { Badge } from '@shared/components/badge/badge';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { CardImagePosition, PinnedNewsCardStyle } from '../../models/pinned-news-slot.model';
import { formatCompactCount } from '../../utils/format-compact-count';

/** Направление `flex-direction` карточки по выбранной админом стороне картинки (`stream.Front#118`). */
const FLEX_DIRECTION_BY_IMAGE_POSITION: Record<CardImagePosition, string> = {
  top: 'column',
  bottom: 'column-reverse',
  left: 'row',
  right: 'row-reverse',
};

/**
 * Карточка новости в закреплённой сетке страницы «Новости»
 * (`docs/figma/news1.json`, `stream.Front#112`, стилизация — `stream.Front#118`).
 * Растягивается на 100% ширины/высоты своей grid-ячейки (`:host { width:
 * 100%; height: 100% }`).
 *
 * **Стиль — обязательный вход, не автоопределение** (`stream.Front#118`):
 * раньше сторона картинки переключалась CSS container-запросом по фактической
 * ориентации ячейки (`@container (orientation: landscape)`) — теперь это
 * явный выбор админа (`PinnedNewsCardStyle.imagePosition`, любая из 4 сторон,
 * не только top/left), контейнер-запрос убран целиком. `imageSizePercent` —
 * доля площади карточки под картинку (`flex: 0 0 X%` на `.news-card__picture`,
 * без grow/shrink — тело карточки добирает остаток через `flex: 1 1 auto`).
 * `imageScale`/`imageOffsetX`/`imageOffsetY` — зум/пан картинки внутри своей
 * области (`transform: scale()`/`object-position`, комбинируется с
 * `object-fit: cover` на `<img>`). Фон/цвет текста карточки — `backgroundColor`/
 * `textColor` инлайн-стилями поверх дефолтных значений SCSS.
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
  readonly cardStyle = input.required<PinnedNewsCardStyle>();

  protected readonly viewsLabel = computed(() => formatCompactCount(this.item().views));
  protected readonly likesLabel = computed(() => formatCompactCount(this.item().likes));
  protected readonly dateLabel = computed(() => formatDate(this.item().publishedAt, 'dd.MM.yyyy', 'en-US'));

  protected readonly flexDirection = computed(() => FLEX_DIRECTION_BY_IMAGE_POSITION[this.cardStyle().imagePosition]);
  protected readonly pictureFlexBasis = computed(() => `0 0 ${this.cardStyle().imageSizePercent}%`);
  protected readonly imageTransform = computed(() => `scale(${this.cardStyle().imageScale})`);
  protected readonly imageObjectPosition = computed(
    () => `${this.cardStyle().imageOffsetX}% ${this.cardStyle().imageOffsetY}%`,
  );
}
