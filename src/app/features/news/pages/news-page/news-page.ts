import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { Button } from '@shared/components/button/button';
import { ButtonGroup } from '@shared/components/button-group/button-group';
import { Checkbox } from '@shared/components/checkbox/checkbox';

import { NewsArchiveItem } from '../../components/news-archive-item/news-archive-item';
import { NewsCard, NewsCardVariant } from '../../components/news-card/news-card';
import { NewsFilterSidebar } from '../../components/news-filter-sidebar/news-filter-sidebar';
import { NewsFilter } from '../../models/news-filter.model';
import { NewsItem } from '../../models/news.model';
import { NewsTag } from '../../models/news-tag.model';
import { NewsService } from '../../services/news.service';
import { NewsTagService } from '../../services/news-tag.service';

/**
 * Раскладка карточек сетки. Экспорт плагина Figma отдаёт только размеры (без
 * координат), поэтому конкретное расположение карточек из макета однозначно не
 * восстанавливается — взят паттерн, дающий валидную укладку в трёх колонках по
 * 330px: широкая карточка (680 = 330 + 20 + 330) занимает две колонки.
 * Реальный признак "какая новость крупная" появится вместе с backend'ом —
 * тогда вариант должен приходить с данными, а не из позиции в списке.
 */
const GRID_VARIANTS: readonly NewsCardVariant[] = [
  'featured',
  'compact',
  'compact',
  'wide',
  'compact',
  'compact',
  'wide',
];

interface NewsEntry {
  readonly item: NewsItem;
  readonly tags: NewsTag[];
}

interface NewsGridEntry extends NewsEntry {
  readonly variant: NewsCardVariant;
}

const EMPTY_FILTER: NewsFilter = { dateFrom: null, dateTo: null, tags: [] };

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Страница «Новости» — вариант 1 макета (`docs/figma/news1.json`, node-id
 * `491:3585`): слева сетка карточек (`NewsCard`, три формы), справа панель
 * архива (`NewsArchiveItem`) с тулбаром — группа иконок-тогглов
 * (`ButtonGroup` + `Checkbox` в `buttonMode`) и триггер фильтра
 * (`NewsFilterSidebar`, stream.Front#111, подключён как есть).
 *
 * Шапка сайта здесь не рендерится — она уже есть глобально (`Shell` в
 * `app.html`, stream.Front#48/#49), включая лого, меню с `NavActiveIndicator`
 * и кнопку «Поддержать».
 *
 * Иконки тулбара архива (`minus`/`eyes`/`like` в макете — группа 120×40 с
 * подсвеченной "активной" ячейкой): фильтры архива по личным флагам текущего
 * пользователя — «глаз» показывает только просмотренные им новости
 * (`viewedByCurrentUser`), «сердце» — только лайкнутые (`likedByCurrentUser`),
 * оба независимы и комбинируются через AND; `minus` сбрасывает оба.
 *
 * Фильтр (`filterChange`) применяется и к сетке, и к архиву: сайдбар физически
 * стоит в тулбаре архива, но фильтрует раздел «Новости» целиком.
 */
@Component({
  selector: 'app-news-page',
  imports: [Button, ButtonGroup, Checkbox, NewsArchiveItem, NewsCard, NewsFilterSidebar],
  templateUrl: './news-page.html',
  styleUrl: './news-page.scss',
})
export class NewsPage implements OnInit {
  private readonly newsService = inject(NewsService);
  private readonly newsTagService = inject(NewsTagService);

  private readonly news = signal<NewsItem[]>([]);
  private readonly archive = signal<NewsItem[]>([]);
  private readonly tags = signal<NewsTag[]>([]);

  protected readonly filter = signal<NewsFilter>(EMPTY_FILTER);
  protected readonly showOnlyViewed = signal(false);
  protected readonly showOnlyLiked = signal(false);

  private readonly tagsById = computed(() => new Map(this.tags().map((tag) => [tag.id, tag])));

  protected readonly gridEntries = computed<NewsGridEntry[]>(() =>
    this.matching(this.news()).map((item, index) => ({
      item,
      tags: this.resolveTags(item),
      variant: GRID_VARIANTS[index % GRID_VARIANTS.length],
    })),
  );

  protected readonly archiveEntries = computed<NewsEntry[]>(() => {
    const onlyViewed = this.showOnlyViewed();
    const onlyLiked = this.showOnlyLiked();
    const items = this.matching(this.archive()).filter(
      (item) => (!onlyViewed || item.viewedByCurrentUser) && (!onlyLiked || item.likedByCurrentUser),
    );
    return items.map((item) => ({ item, tags: this.resolveTags(item) }));
  });

  ngOnInit(): void {
    this.newsTagService.getTags().subscribe((tags) => this.tags.set(tags));
    this.newsService.getNews().subscribe((news) => this.news.set(news));
    this.newsService.getArchive().subscribe((archive) => this.archive.set(archive));
  }

  protected resetArchiveFilters(): void {
    this.showOnlyViewed.set(false);
    this.showOnlyLiked.set(false);
  }

  private matching(items: NewsItem[]): NewsItem[] {
    const { dateFrom, dateTo, tags } = this.filter();
    if (!dateFrom && !dateTo && tags.length === 0) {
      return items;
    }

    return items.filter((item) => {
      if (dateFrom && item.publishedAt < startOfDay(dateFrom)) return false;
      if (dateTo && item.publishedAt > endOfDay(dateTo)) return false;
      return tags.length === 0 || item.tagIds.some((tagId) => tags.includes(tagId));
    });
  }

  private resolveTags(item: NewsItem): NewsTag[] {
    const byId = this.tagsById();
    return item.tagIds.map((tagId) => byId.get(tagId)).filter((tag): tag is NewsTag => !!tag);
  }
}
