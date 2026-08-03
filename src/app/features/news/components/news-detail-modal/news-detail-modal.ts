import { formatDate } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';

import { ImageUrlService } from '@core/services/image-url.service';
import { AdminNews } from '@features/admin/models/news.model';
import { Badge } from '@shared/components/badge/badge';

import { formatCompactCount } from '../../utils/format-compact-count';
import { NewsArchiveService } from '../../services/news-archive.service';

export interface NewsDetailModalData {
  item: AdminNews;
  /** Патч (`viewCount`/`viewedByCurrentUser` из ответа `markViewed()`) — прокидывается наружу, чтобы список/сетка, откуда открыта модалка, обновились ещё ДО закрытия модалки. */
  onViewed?: (patch: Partial<AdminNews>) => void;
}

/**
 * Модалка полной новости (`docs/figma/news4_detail_modal.json`, `News_modal`)
 * — открывается через `ModalService.open<NewsDetailModalData>(NewsDetailModal,
 * { item, onViewed })` (клик по строке `NewsArchiveItem`, см. `NewsPage`),
 * рендерится `ModalHost` тем же паттерном, что `ConfirmModal`/`ChangePasswordModal`.
 *
 * При открытии (`ngOnInit`) — если `item.viewedByCurrentUser` ещё не `true`,
 * зовёт `NewsArchiveService.markViewed(item.id)` (идемпотентно, не toggle):
 * на успехе патчит локальный `item` (актуальные `viewCount`/
 * `viewedByCurrentUser` из ответа) И зовёт `data.onViewed?.(patch)` — так
 * `NewsPage` узнаёт об изменении и патчит свой `archiveItems`, чтобы чекбокс
 * глазика в списке отражал реальное состояние уже ПОСЛЕ закрытия модалки, без
 * повторного похода за списком. Ошибку (401 без сессии, 5xx) — просто
 * логирует в консоль, не блокирует показ новости и не откатывает (откатывать
 * нечего — `viewCount` на фронте до ответа не менялся).
 */
@Component({
  selector: 'app-news-detail-modal',
  imports: [Badge],
  templateUrl: './news-detail-modal.html',
  styleUrl: './news-detail-modal.scss',
})
export class NewsDetailModal implements OnInit {
  readonly data = input<NewsDetailModalData>();

  private readonly imageUrlService = inject(ImageUrlService);
  private readonly newsArchiveService = inject(NewsArchiveService);

  protected readonly item = signal<AdminNews | null>(null);

  protected readonly imageUrl = computed(() => {
    const images = this.item()?.images ?? [];
    if (images.length === 0) {
      return null;
    }
    const first = images.slice().sort((a, b) => a.order - b.order)[0];
    return this.imageUrlService.resolve(first.url);
  });

  protected readonly viewsLabel = computed(() => formatCompactCount(this.item()?.viewCount ?? 0));
  protected readonly likesLabel = computed(() => formatCompactCount(this.item()?.likeCount ?? 0));
  protected readonly likeIconClass = computed(() => (this.item()?.likedByCurrentUser ? 'pi pi-heart-fill' : 'pi pi-heart'));
  protected readonly dateLabel = computed(() => {
    const publishedAt = this.item()?.publishedAt;
    return publishedAt ? formatDate(publishedAt, 'dd.MM.yyyy', 'en-US') : '';
  });

  ngOnInit(): void {
    const data = this.data();
    if (!data) {
      return;
    }
    this.item.set(data.item);

    if (data.item.viewedByCurrentUser) {
      return;
    }
    this.newsArchiveService.markViewed(data.item.id).subscribe({
      next: (response) => {
        const patch: Partial<AdminNews> = {
          viewCount: response.viewCount,
          viewedByCurrentUser: response.viewedByCurrentUser,
        };
        this.item.update((current) => (current ? { ...current, ...patch } : current));
        data.onViewed?.(patch);
      },
      error: (error) => console.error('Не удалось отметить новость как просмотренную', error),
    });
  }
}
