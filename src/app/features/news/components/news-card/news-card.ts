import { formatDate } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { Badge } from '@shared/components/badge/badge';

import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import {
  CardImagePosition,
  FocalPoint,
  PinnedNewsCardStyle,
} from '../../models/pinned-news-slot.model';
import { formatCompactCount } from '../../utils/format-compact-count';
import { hexToRgba } from '../../utils/hex-to-rgba';

/** Прозрачность разделителя над блоком просмотров/лайков — 10% от `textColor` карточки, не сплошной цвет (`docs/figma`, `stream.Front#121`). */
const DIVIDER_OPACITY = 0.1;

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
 * Фон/цвет текста карточки — `backgroundColor`/`textColor` инлайн-стилями
 * поверх дефолтных значений SCSS.
 *
 * **Focal point вместо зума/пана** (`pinned-grid-rework`) — `imageScale`/
 * `imageOffsetX`/`imageOffsetY` убраны: картинка держит главный объект в
 * кадре через `object-fit: cover` + `object-position: {focalPoint().x}%
 * {focalPoint().y}%` (`focalPoint` — отдельный вход, `null` эквивалентен
 * центру 50/50), точка выбирается один раз в `FocalPointPicker`
 * (`PinnedGridEditor`) и применяется одинаково при любой форме ячейки.
 *
 * Иконка лайка (`likeIconClass`) переключается между `pi-heart`/`pi-heart-fill`
 * по `item().likedByCurrentUser` (тот же приём, что `NewsArchiveItem`) —
 * счётчик здесь статичный текст, не интерактивный `Checkbox` (карточка сетки
 * кликом не лайкается, в отличие от строки архива).
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
  readonly focalPoint = input<FocalPoint | null>(null);

  protected readonly viewsLabel = computed(() => formatCompactCount(this.item().views));
  protected readonly likesLabel = computed(() => formatCompactCount(this.item().likes));
  protected readonly likeIconClass = computed(() =>
    this.item().likedByCurrentUser ? 'pi pi-heart-fill' : 'pi pi-heart',
  );
  protected readonly dateLabel = computed(() =>
    formatDate(this.item().publishedAt, 'dd.MM.yyyy', 'en-US'),
  );

  protected readonly flexDirection = computed(
    () => FLEX_DIRECTION_BY_IMAGE_POSITION[this.cardStyle().imagePosition],
  );
  /** Без обложки место под картинку не резервируется вовсе — текст получает всю площадь карточки (`ЗАК-Ф-05`, `stream.Front#132`), а не серый прямоугольник заданной админом доли. */
  protected readonly pictureFlexBasis = computed(() =>
    this.item().imageUrl ? `0 0 ${this.cardStyle().imageSizePercent}%` : '0 0 0%',
  );
  protected readonly imageObjectPosition = computed(() => {
    const focalPoint = this.focalPoint();
    return focalPoint ? `${focalPoint.x}% ${focalPoint.y}%` : '50% 50%';
  });
  protected readonly dividerColor = computed(() =>
    hexToRgba(this.cardStyle().textColor, DIVIDER_OPACITY),
  );
}
