import { formatDate } from '@angular/common';
import { Component, ElementRef, computed, effect, inject, input, signal } from '@angular/core';

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
import { isLightColor } from '../../utils/is-light-color';

/** Прозрачность разделителя над блоком просмотров/лайков — 10% от `textColor` карточки, не сплошной цвет (`docs/figma`, `stream.Front#121`). */
const DIVIDER_OPACITY = 0.1;

/** Направление `flex-direction` карточки по выбранной админом стороне картинки (`stream.Front#118`). */
const FLEX_DIRECTION_BY_IMAGE_POSITION: Record<CardImagePosition, string> = {
  top: 'column',
  bottom: 'column-reverse',
  left: 'row',
  right: 'row-reverse',
};

/** Минимальная толщина блока изображения, ниже которой оно вырождается в полосу (`ЗАК-Ф-12`, таблица порогов в spec). */
const MIN_PICTURE_THICKNESS_PX = 96;
/** Минимальная толщина текстового блока — строка заголовка + полоса счётчиков с отступами (`ЗАК-Ф-12`). */
const MIN_TEXT_THICKNESS_PX = 64;

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
 * **Битое изображение — `hasVisibleImage`/`onImageError`** (`ЗАК-Ф-18`,
 * `stream.Front#127`) — `<img (error)>` помечает СВОЙ url как неудачный
 * (`failedImageUrl`); картинка после этого ведёт себя как отсутствующая
 * (`ЗАК-Ф-05`), включая выход из режима подложки. Метка держится, пока
 * `item().imageUrl` не сменится на другой адрес — тот же битый url,
 * пришедший повторно, считается битым и без повторной попытки загрузки.
 *
 * **Режим подложки** (`ЗАК-Ф-12`—`ЗАК-Ф-15`, `stream.Front#127`) — пока
 * обоим блокам (картинке и тексту) хватает минимальной толщины ({@link
 * MIN_PICTURE_THICKNESS_PX}/{@link MIN_TEXT_THICKNESS_PX} по оси, которую
 * делит `imageSizePercent`: `top`/`bottom` — высота, `left`/`right` —
 * ширина), карточка выглядит как задал администратор. Как только доли не
 * хватает хотя бы одному — `isQuiltMode()` включает `.news-card--quilt`:
 * картинка растягивается на всю карточку (`position: absolute; inset: 0`),
 * текст поверх неё той же абсолютной позицией, с подложкой-градиентом
 * (`quiltScrimBackground`) — построена под УЖЕ ВЫБРАННЫЙ `textColor`
 * (`isLightColor()` решает, тёмная подложка нужна или светлая), а не
 * наоборот (`ЗАК-Ф-13`). Заголовок в этом режиме не убирается никогда,
 * описание — убирается всегда (в перечислении `ЗАК-Ф-14` из "что остаётся"
 * его нет — только заголовок/темы/счётчики/дата), остальное урезается уже
 * знакомым приёмом `overflow: hidden` по мере нехватки места, без отдельной
 * JS-логики "хватает/не хватает" для каждого элемента отдельно.
 *
 * **Порог считается по РЕАЛЬНОМУ измеренному размеру ячейки**
 * (`ResizeObserver` на `:host`, `hostWidthPx`/`hostHeightPx` — тот же приём,
 * что `SectionTitle`, включая `typeof ResizeObserver === 'undefined'` guard
 * под jsdom), не по CSS `@container`-запросу и не по брейкпоинту (`ЗАК-Ф-15`):
 * порог зависит от РАСПРЕДЕЛЕНИЯ (`imageSizePercent`) внутри конкретной оси
 * ячейки, а не от одной лишь её ширины/высоты — чистый `@container`
 * потребовал бы либо второго контейнера с шириной под конкретную долю (нет
 * способа выразить "62% от родителя" как контейнер), либо пробрасывать
 * порог через CSS custom property, что не проще расчёта в TS. Пока размер
 * не измерен (первый рендер до срабатывания `ResizeObserver`, или его нет в
 * окружении) — обычный вид по умолчанию, не подложка.
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
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly item = input.required<NewsItem>();
  readonly tags = input<NewsTag[]>([]);
  readonly cardStyle = input.required<PinnedNewsCardStyle>();
  readonly focalPoint = input<FocalPoint | null>(null);

  private readonly hostWidthPx = signal<number | null>(null);
  private readonly hostHeightPx = signal<number | null>(null);
  private readonly failedImageUrl = signal<string | null>(null);

  protected readonly viewsLabel = computed(() => formatCompactCount(this.item().views));
  protected readonly likesLabel = computed(() => formatCompactCount(this.item().likes));
  protected readonly likeIconClass = computed(() =>
    this.item().likedByCurrentUser ? 'pi pi-heart-fill' : 'pi pi-heart',
  );
  protected readonly dateLabel = computed(() =>
    formatDate(this.item().publishedAt, 'dd.MM.yyyy', 'en-US'),
  );

  protected readonly hasVisibleImage = computed(() => {
    const url = this.item().imageUrl;
    return !!url && url !== this.failedImageUrl();
  });

  protected readonly flexDirection = computed(
    () => FLEX_DIRECTION_BY_IMAGE_POSITION[this.cardStyle().imagePosition],
  );

  private readonly axisSizePx = computed(() => {
    const position = this.cardStyle().imagePosition;
    return position === 'left' || position === 'right' ? this.hostWidthPx() : this.hostHeightPx();
  });

  protected readonly isQuiltMode = computed(() => {
    if (!this.hasVisibleImage()) {
      return false;
    }
    const axisSize = this.axisSizePx();
    if (axisSize === null) {
      return false;
    }
    const pictureThickness = (axisSize * this.cardStyle().imageSizePercent) / 100;
    const textThickness = axisSize - pictureThickness;
    return pictureThickness < MIN_PICTURE_THICKNESS_PX || textThickness < MIN_TEXT_THICKNESS_PX;
  });

  /** Без обложки или в режиме подложки место под картинку долей не размечается — либо его нет вовсе (`ЗАК-Ф-05`), либо картинка занимает всё через `position: absolute` (`.news-card--quilt`, `flex` тогда не участвует). */
  protected readonly pictureFlexBasis = computed(() => {
    if (this.isQuiltMode()) {
      return 'none';
    }
    return this.hasVisibleImage() ? `0 0 ${this.cardStyle().imageSizePercent}%` : '0 0 0%';
  });

  protected readonly imageObjectPosition = computed(() => {
    const focalPoint = this.focalPoint();
    return focalPoint ? `${focalPoint.x}% ${focalPoint.y}%` : '50% 50%';
  });
  protected readonly dividerColor = computed(() =>
    hexToRgba(this.cardStyle().textColor, DIVIDER_OPACITY),
  );

  /**
   * Подложка под текст в режиме подложки — построена под цвет текста, не
   * наоборот (`ЗАК-Ф-13`): тёмная под светлый `textColor`, светлая под тёмный.
   *
   * Плотная зона (0.85) держится до 35% высоты, не спадает сразу от нижнего
   * края — текст (заголовок/теги/счётчики/дата, прижаты к низу своего блока
   * в `.news-card--quilt .news-card__text`, см. scss) в норме укладывается в
   * неё целиком, а не только в узкую полосу у самого края (a11y-review:
   * `flex: 1 1 auto` растягивал текстовый блок почти на всю карточку, и без
   * широкой плотной зоны заголовок оказывался в разреженной части градиента).
   * Дальний край держит минимум 0.15, не 0 — на совсем тесной карточке
   * (заголовок в две строки съедает бо́льшую часть высоты) даёт хоть какой-то
   * контраст вместо полного его отсутствия. Полная гарантия читаемости «при
   * любой картинке» по всей высоте карточки потребовала бы сплошной плотной
   * заливки, что противоречило бы самой идее подложки — картинка должна
   * оставаться узнаваемой в верхней части, а не исчезать под текстом целиком.
   */
  protected readonly quiltScrimBackground = computed(() => {
    const rgb = isLightColor(this.cardStyle().textColor) ? '0, 0, 0' : '255, 255, 255';
    return `linear-gradient(to top, rgba(${rgb}, 0.85) 0%, rgba(${rgb}, 0.85) 35%, rgba(${rgb}, 0.15) 100%)`;
  });

  constructor() {
    effect((onCleanup) => {
      const el = this.elementRef.nativeElement;
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(([entry]) => {
        this.hostWidthPx.set(entry.contentRect.width);
        this.hostHeightPx.set(entry.contentRect.height);
      });
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

  protected onImageError(): void {
    this.failedImageUrl.set(this.item().imageUrl);
  }
}
