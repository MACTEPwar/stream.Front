import { Injectable, inject } from '@angular/core';

import { ImageUrlService } from '@core/services/image-url.service';
import { AdminNews, AdminNewsTag, NewsCover } from '@features/admin/models/news.model';

import { NewsItem } from '../models/news.model';
import { NewsTag } from '../models/news-tag.model';
import { PinnedNewsSlot } from '../models/pinned-news-slot.model';

/**
 * Адаптирует реальные backend-модели админки (`AdminNews`/`AdminNewsTag`,
 * `features/admin/models/news.model.ts`) под модели, которые понимает
 * публичная страница «Новости» (`NewsItem`/`NewsTag`) — `toNewsItem()`
 * перенесён без изменений из `AdminNewsPinnedPage` (`stream.Front#118`), где
 * он появился первым; `toNewsTag()` — тот же приём для тегов
 * (`stream.Front#121`, перевод `NewsPage`/`NewsFilterSidebar` с
 * мок-`NewsService`/`NewsTagService` на реальный
 * `AdminNewsService`/`AdminNewsTagService`). Общий сервис вместо дублирования
 * в каждом потребителе (`AdminNewsPinnedPage`, `NewsPage`,
 * `createNewsTagFilterState()`).
 */
@Injectable({ providedIn: 'root' })
export class NewsItemAdapterService {
  private readonly imageUrlService = inject(ImageUrlService);

  toNewsItem(admin: AdminNews): NewsItem {
    const sortedImages = admin.images.slice().sort((a, b) => a.order - b.order);
    const images = sortedImages.map((image) => ({
      id: image.id,
      url: this.imageUrlService.resolve(image.url),
      focalX: image.focalX,
      focalY: image.focalY,
    }));
    const imageUrls = images.map((image) => image.url);
    // Картинка новости — её ОБЛОЖКА, а не первая картинка набора
    // (`stream.Front#137`, `ОБЛ-О-05`): «осознанно без обложки» — записанное
    // состояние, и подменять его первым изображением значит делать его
    // неотличимым от «ещё не выбрали».
    const cover: NewsCover = {
      ...admin.cover,
      url: admin.cover.url === null ? null : this.imageUrlService.resolve(admin.cover.url),
    };
    return {
      id: admin.id,
      title: admin.title,
      excerpt: admin.description,
      cover,
      imageUrl: cover.url,
      imageUrls,
      images,
      tagIds: admin.tags.map((tag) => tag.id),
      views: admin.viewCount,
      likes: admin.likeCount,
      publishedAt: new Date(admin.publishedAt),
      viewedByCurrentUser: admin.viewedByCurrentUser ?? false,
      likedByCurrentUser: admin.likedByCurrentUser ?? false,
    };
  }

  /**
   * Карточка витрины из слота раскладки (`stream.Front#133`, поверх
   * `streamer.API#76`) — содержимое приходит вместе с раскладкой, и клиенту
   * не нужно доискивать его в ленте. Раньше витрина собиралась окольным
   * путём: подгружалась сотня свежих новостей, и показывались те
   * закрепления, что в неё попали, — закреплённая новость старше сотни
   * молча исчезала у посетителя.
   *
   * `imageUrls`/`images` остаются пустыми намеренно: галерея витрине не
   * нужна, картинку даёт обложка, а тащить её на каждый слот значило бы
   * вернуть тот же лишний объём, ради которого задача и заведена.
   */
  toPinnedNewsItem(slot: PinnedNewsSlot): NewsItem {
    const cover: NewsCover = {
      ...slot.cover,
      url: slot.cover.url === null ? null : this.imageUrlService.resolve(slot.cover.url),
    };

    return {
      id: slot.newsId,
      title: slot.news.title,
      excerpt: slot.news.description,
      cover,
      imageUrl: cover.url,
      imageUrls: [],
      images: [],
      tagIds: slot.news.tags.map((tag) => tag.id),
      views: slot.news.viewCount,
      likes: slot.news.likeCount,
      publishedAt: new Date(slot.news.publishedAt),
      viewedByCurrentUser: slot.news.viewedByCurrentUser ?? false,
      likedByCurrentUser: slot.news.likedByCurrentUser ?? false,
    };
  }

  toNewsTag(tag: AdminNewsTag): NewsTag {
    return { id: tag.id, name: tag.name, color: tag.color, textColor: tag.textColor };
  }
}
