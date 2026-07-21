import { Component, inject, signal } from '@angular/core';

import { ErrorMessage } from '../../../../shared/components/error-message/error-message';
import { List, ListItemData } from '../../../../shared/components/list/list';
import { SectionTitle } from '../../../../shared/components/section-title/section-title';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { Donator, DonatorsService } from '../../services/donators.service';

/** Число skeleton-строк на время загрузки — верхняя граница ответа backend (`TOP_DONATORS_LIMIT`). */
const SKELETON_ROWS = Array.from({ length: 5 }, (_, i) => i);

function formatAmount(amount: number): string {
  return `${amount.toLocaleString('en-US')}₴`;
}

function toListItemData(donator: Donator, index: number): ListItemData {
  return {
    id: `${index}-${donator.nickname}`,
    segments: [
      { text: donator.nickname, width: 1, align: 'center' },
      { text: formatAmount(donator.amount), width: '90px', align: 'right' },
    ],
    direction: 'right',
  };
}

/**
 * Виджет топ-донатеров (stream.Front#31) — заголовок `SectionTitle`
 * («Топ донатеров») + список `List`/`ListItem` (в отличие от `SocialLinksBlock`,
 * здесь декоративная «пилюля» `ListItem` уместна — по мокапу строки той же
 * формы, что и у `ScheduleWidget`), данные — `DonatorsService`
 * (`GET /donators/top`). Loading/error — конвенция `stream.Front#9`
 * (`Skeleton`×5/`ErrorMessage`); empty (0 донатеров) — собственный текст,
 * решается индивидуально по фиче.
 */
@Component({
  selector: 'app-donators-widget',
  imports: [SectionTitle, List, Skeleton, ErrorMessage],
  templateUrl: './donators-widget.html',
  styleUrl: './donators-widget.scss',
})
export class DonatorsWidget {
  private readonly donatorsService = inject(DonatorsService);

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly items = signal<ListItemData[]>([]);

  constructor() {
    this.donatorsService.getTop().subscribe({
      next: (donators) => {
        this.items.set(donators.map(toListItemData));
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
