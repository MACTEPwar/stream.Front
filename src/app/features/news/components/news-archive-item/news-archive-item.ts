import { formatDate } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';

import { ImageUrlService } from '@core/services/image-url.service';
import { AdminNews } from '@features/admin/models/news.model';
import { Badge } from '@shared/components/badge/badge';
import { Checkbox } from '@shared/components/checkbox/checkbox';

import { formatCompactCount } from '../../utils/format-compact-count';

/**
 * Строка панели архива новостей справа (`news_archive`, 660×100 в
 * `docs/figma/news1.json`): картинка-превью 175×100 слева, справа — колонка
 * 485 (заголовок Montserrat 18 → текст Nunito 14 → разделитель → просмотры/
 * лайки + дата).
 *
 * `item` — реальный backend-контракт (`AdminNews`, `stream.Front#118` поверх
 * `streamer.API#65`/`#67`), НЕ мок `NewsItem` — теги уже приходят с цветом
 * (`AdminNewsTag.color`/`textColor`), картинка — первая по `order` из
 * `images[]` (резолвится через `ImageUrlService`, `/uploads/*`-путь валиден
 * только относительно backend origin).
 *
 * Лайк — `Checkbox` (`severity="primary"`), НЕ отдельная иконка +
 * счётчик текстом: сама коробка чекбокса отражает `likedByCurrentUser`
 * (залита primary-цветом, когда лайкнуто), сердце-иконка и число лайков
 * спроецированы внутрь через `<ng-content>` (по прямому запросу
 * пользователя). Клик эмитит `likeToggle` — реальный API-запрос и
 * оптимистичное обновление/откат делает `NewsPage` (родитель), сам компонент
 * не знает про HTTP.
 *
 * Теги (`tag`-фрейм макета, 74×24) в экспорте лежат плоским соседом картинки и
 * текстов — точное место не восстановить (плагин выгружает только размеры, без
 * координат), поэтому бейджи нарисованы поверх картинки в левом верхнем углу:
 * 74px укладываются в 175px превью, а в колонке 485 на них не остаётся высоты
 * (24+24+18+1+38 > 100).
 */
@Component({
  selector: 'app-news-archive-item',
  imports: [Badge, Checkbox],
  templateUrl: './news-archive-item.html',
  styleUrl: './news-archive-item.scss',
})
export class NewsArchiveItem {
  private readonly imageUrlService = inject(ImageUrlService);

  readonly item = input.required<AdminNews>();
  readonly likeToggle = output<boolean>();

  protected readonly imageUrl = computed(() => {
    const images = this.item().images;
    if (images.length === 0) {
      return null;
    }
    const first = images.slice().sort((a, b) => a.order - b.order)[0];
    return this.imageUrlService.resolve(first.url);
  });

  protected readonly isLiked = computed(() => !!this.item().likedByCurrentUser);
  protected readonly viewsLabel = computed(() => formatCompactCount(this.item().viewCount));
  protected readonly likesLabel = computed(() => formatCompactCount(this.item().likeCount));
  protected readonly dateLabel = computed(() => formatDate(this.item().publishedAt, 'dd.MM.yyyy', 'en-US'));

  protected onLikeToggle(checked: boolean): void {
    this.likeToggle.emit(checked);
  }
}
