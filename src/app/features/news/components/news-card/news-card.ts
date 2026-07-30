import { formatDate } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { Badge } from '@shared/components/badge/badge';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { formatCompactCount } from '../../utils/format-compact-count';

/**
 * Три формы карточки из макета (`docs/figma/news1.json`, фреймы `news`):
 * `featured` — 330×470 (картинка 330×310), `compact` — 330×324 (картинка
 * 330×152), `wide` — 680×250 (картинка 340×250 слева, контент справа; в сетке
 * занимает две колонки по 330 + гаттер 20).
 */
export type NewsCardVariant = 'featured' | 'compact' | 'wide';

/**
 * Карточка новости в сетке страницы «Новости» (`docs/figma/news1.json`).
 * Структура одинакова у всех трёх вариантов (картинка → контент(заголовок+
 * текст, теги) → разделитель → просмотры/лайки+дата), различаются только
 * размеры/направление раскладки — отсюда один компонент с `variant()`, а не
 * три почти одинаковых.
 *
 * Блок заголовок+текст — фиксированной высоты (56/68/140 по макету) с
 * `overflow: hidden`: в макете текст-превью физически не влезает в
 * `featured`-карточку с двухстрочным заголовком (у неё блок 56px = ровно две
 * строки заголовка) — вёрстка повторяет это поведение, а не растягивает
 * карточку под контент.
 *
 * Теги — общий `Badge` (цвет/severity приходят из `NewsTag`, тот же источник,
 * что у `NewsFilterSidebar`), просмотры/лайки — `pi pi-eye`/`pi pi-heart`.
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
  readonly variant = input<NewsCardVariant>('compact');

  protected readonly viewsLabel = computed(() => formatCompactCount(this.item().views));
  protected readonly likesLabel = computed(() => formatCompactCount(this.item().likes));
  protected readonly dateLabel = computed(() => formatDate(this.item().publishedAt, 'dd.MM.yyyy', 'en-US'));
}
