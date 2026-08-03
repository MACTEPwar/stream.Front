import { formatDate } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';

import { ImageUrlService } from '@core/services/image-url.service';
import { AdminNews } from '@features/admin/models/news.model';
import { Badge } from '@shared/components/badge/badge';
import { Checkbox } from '@shared/components/checkbox/checkbox';

import { formatCompactCount } from '../../utils/format-compact-count';

/**
 * Строка панели архива новостей справа (`stream.Front#121`, переверстано
 * поверх исходной 660×100 из `docs/figma/news1.json` по прямому запросу
 * пользователя): высота элемента максимум 250px (не фиксированная — реальное
 * описание разной длины), картинка-превью 175px на всю высоту элемента
 * слева, справа — колонка минимум 250px (заголовок Montserrat 18/24, одна
 * строка с CSS-эллипсисом → описание Nunito 14/18, 60% непрозрачности, до 3
 * строк с эллипсисом → разделитель 10%-й черноты → просмотры/лайки + дата).
 *
 * `item` — реальный backend-контракт (`AdminNews`, `stream.Front#118` поверх
 * `streamer.API#65`/`#67`), НЕ мок `NewsItem` — теги уже приходят с цветом
 * (`AdminNewsTag.color`/`textColor`), картинка — первая по `order` из
 * `images[]` (резолвится через `ImageUrlService`, `/uploads/*`-путь валиден
 * только относительно backend origin).
 *
 * **Просмотры и лайки — оба `Checkbox`** (`severity="primary"`, `stream.Front#121`
 * — раньше просмотры были голым текстом), НЕ отдельная иконка + счётчик
 * текстом: сама коробка чекбокса отражает состояние (залита primary-цветом),
 * иконка+число спроецированы внутрь через `<ng-content>`. **Лайк** —
 * интерактивен, клик эмитит `likeToggle`, реальный API-запрос и
 * оптимистичное обновление/откат делает `NewsPage` (родитель), сам компонент
 * не знает про HTTP. **Просмотры — НЕ интерактивны** (класс-модификатор
 * `--readonly`, `pointer-events: none`): реальный `AdminNews` не несёт флага
 * "просмотрено этим пользователем" (view-tracking не реализован на backend),
 * состояние всегда `false` — визуально чекбокс есть, но клик намеренно
 * ничего не делает, честнее, чем изображать рабочий тоггл без действия за
 * ним.
 *
 * Теги — левый НИЖНИЙ угол превью (по прямому запросу пользователя, было
 * верхний): `tag`-фрейм макета (74×24) в экспорте лежит плоским соседом
 * картинки и текстов, точное место в оригинале не восстановить (плагин
 * выгружает только размеры, без координат).
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
