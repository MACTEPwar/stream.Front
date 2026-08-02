import { Injectable, inject } from '@angular/core';

import { ImageUrlService } from '@core/services/image-url.service';
import { AdminNews, AdminNewsTag } from '@features/admin/models/news.model';

import { NewsItem } from '../models/news.model';
import { NewsTag } from '../models/news-tag.model';

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
    const imageUrls = admin.images
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((image) => this.imageUrlService.resolve(image.url));
    return {
      id: admin.id,
      title: admin.title,
      excerpt: admin.description,
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
      tagIds: admin.tags.map((tag) => tag.id),
      views: admin.viewCount,
      likes: admin.likeCount,
      publishedAt: new Date(admin.publishedAt),
      viewedByCurrentUser: false,
      likedByCurrentUser: admin.likedByCurrentUser ?? false,
    };
  }

  toNewsTag(tag: AdminNewsTag): NewsTag {
    return { id: tag.id, name: tag.name, color: tag.color, textColor: tag.textColor };
  }
}
