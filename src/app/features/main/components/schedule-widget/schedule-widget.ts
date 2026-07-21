import { Component, inject, signal } from '@angular/core';

import { ErrorMessage } from '../../../../shared/components/error-message/error-message';
import { List, ListItemData } from '../../../../shared/components/list/list';
import { SectionTitle } from '../../../../shared/components/section-title/section-title';
import { ScheduleDay, ScheduleService, Weekday } from '../../services/schedule.service';

const OFFLINE_COLOR = '#CF1717';

const WEEKDAY_LABEL: Record<Weekday, string> = {
  MONDAY: 'Пн',
  TUESDAY: 'Вт',
  WEDNESDAY: 'Ср',
  THURSDAY: 'Чт',
  FRIDAY: 'Пт',
  SATURDAY: 'Сб',
  SUNDAY: 'Вс',
};

/** Число дней недели — размер скелетон-прелоадера `List` (`loaderSettings().itemsCount`) на время загрузки. */
const SCHEDULE_DAYS_COUNT = 7;

function toListItemData(day: ScheduleDay): ListItemData {
  const color = day.isOnline ? undefined : OFFLINE_COLOR;
  return {
    id: day.id,
    segments: [
      { text: WEEKDAY_LABEL[day.weekday], width: '48px', align: 'right' },
      { text: day.isOnline ? (day.eventTitle ?? '') : 'Оффлайн', width: 1, align: 'center', color },
      { text: day.isOnline ? (day.time ?? '') : '--:--', width: '56px', align: 'right', color },
    ],
    dividers: ['left', 'right'],
  };
}

/**
 * Виджет расписания стримов (stream.Front#30) — заголовок `SectionTitle`
 * («Расписание») + список `List`/`ListItem` (по одной строке на день
 * недели), данные — `ScheduleService` (`GET /schedule`). Loading —
 * встроенный скелетон-прелоадер `List` (`loading()`/`loaderSettings()`,
 * stream.Front#52) вместо отдельного `Skeleton`×N (stream.Front#9) — по
 * прямому запросу пользователя; error — по-прежнему `ErrorMessage`; empty
 * не нужен — backend всегда отдаёт все 7 дней.
 */
@Component({
  selector: 'app-schedule-widget',
  imports: [SectionTitle, List, ErrorMessage],
  templateUrl: './schedule-widget.html',
  styleUrl: './schedule-widget.scss',
})
export class ScheduleWidget {
  private readonly scheduleService = inject(ScheduleService);

  protected readonly skeletonRowsCount = SCHEDULE_DAYS_COUNT;
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly items = signal<ListItemData[]>([]);

  constructor() {
    this.scheduleService.getSchedule().subscribe({
      next: (days) => {
        this.items.set(days.map(toListItemData));
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
