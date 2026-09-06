import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { SMALL_QUERY } from '@shared/utils/breakpoints';

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

/**
 * Ширина колонок дня/времени — на широкой раскладке совпадает с "базовыми"
 * значениями декора пилюли (`FIRST_SEGMENT_BASELINE_WIDTH_PX`/
 * `LAST_SEGMENT_BASELINE_WIDTH_PX`, `list-item.ts`), на компактной — уже
 * (по прямому запросу пользователя: "Пн"/"21:00" не нуждаются в 48/56px,
 * а среднему сегменту-событию каждый освобождённый px критичен). Сдвиг
 * декора-«колпачков» под новую ширину уже умеет `list-item.ts`
 * (`firstSegmentShiftPx()`/`lastSegmentShiftPx()`) — он считается от
 * ФАКТИЧЕСКОЙ ширины сегмента, а не хардкодит 48/56, так что здесь
 * достаточно просто передать другое число.
 */
const DAY_COLUMN_WIDTH_WIDE_PX = 48;
const DAY_COLUMN_WIDTH_COMPACT_PX = 32;
const TIME_COLUMN_WIDTH_WIDE_PX = 56;
const TIME_COLUMN_WIDTH_COMPACT_PX = 48;

function toListItemData(day: ScheduleDay, isCompact: boolean): ListItemData {
  const color = day.isOnline ? undefined : OFFLINE_COLOR;
  const dayWidth = isCompact ? DAY_COLUMN_WIDTH_COMPACT_PX : DAY_COLUMN_WIDTH_WIDE_PX;
  const timeWidth = isCompact ? TIME_COLUMN_WIDTH_COMPACT_PX : TIME_COLUMN_WIDTH_WIDE_PX;
  return {
    id: day.id,
    segments: [
      { text: WEEKDAY_LABEL[day.weekday], width: `${dayWidth}px`, align: 'right' },
      { text: day.isOnline ? (day.eventTitle ?? '') : 'Оффлайн', width: 1, align: 'center', color },
      {
        text: day.isOnline ? (day.time ?? '') : '--:--',
        width: `${timeWidth}px`,
        align: 'right',
        color,
      },
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
  private readonly breakpointObserver = inject(BreakpointObserver);

  // Тот же приём, что `MainCarousel.isCompact`/`Shell` — ширина колонок
  // дня/времени должна поменяться живьём при пересечении порога, не только
  // при следующей загрузке данных.
  protected readonly isCompact = toSignal(
    this.breakpointObserver.observe(SMALL_QUERY).pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly skeletonRowsCount = SCHEDULE_DAYS_COUNT;
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  private readonly days = signal<ScheduleDay[]>([]);
  protected readonly items = computed(() =>
    this.days().map((day) => toListItemData(day, this.isCompact())),
  );

  constructor() {
    this.scheduleService.getSchedule().subscribe({
      next: (days) => {
        this.days.set(days);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
