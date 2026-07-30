import { formatDate } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { Badge } from '@shared/components/badge/badge';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { formatCompactCount } from '../../utils/format-compact-count';

/**
 * Строка панели архива новостей справа (`news_archive`, 660×100 в
 * `docs/figma/news1.json`): картинка-превью 175×100 слева, справа — колонка
 * 485 (заголовок Montserrat 18 → текст Nunito 14 → разделитель → просмотры/
 * лайки + дата).
 *
 * Теги (`tag`-фрейм макета, 74×24) в экспорте лежат плоским соседом картинки и
 * текстов — точное место не восстановить (плагин выгружает только размеры, без
 * координат), поэтому бейджи нарисованы поверх картинки в левом верхнем углу:
 * 74px укладываются в 175px превью, а в колонке 485 на них не остаётся высоты
 * (24+24+18+1+38 > 100).
 */
@Component({
  selector: 'app-news-archive-item',
  imports: [Badge],
  templateUrl: './news-archive-item.html',
  styleUrl: './news-archive-item.scss',
})
export class NewsArchiveItem {
  readonly item = input.required<NewsItem>();
  readonly tags = input<NewsTag[]>([]);

  protected readonly viewsLabel = computed(() => formatCompactCount(this.item().views));
  protected readonly likesLabel = computed(() => formatCompactCount(this.item().likes));
  protected readonly dateLabel = computed(() => formatDate(this.item().publishedAt, 'dd.MM.yyyy', 'en-US'));
}
