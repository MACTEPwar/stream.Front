import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { NotificationService } from '@core/services/notification.service';
import { Button } from '@shared/components/button/button';
import { ErrorMessage } from '@shared/components/error-message/error-message';
import { TextField } from '@shared/components/text-field/text-field';
import { ScheduleDay, ScheduleService, Weekday } from '../../../main/services/schedule.service';

const WEEKDAY_ORDER: Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const WEEKDAY_LABEL: Record<Weekday, string> = {
  MONDAY: 'Понедельник',
  TUESDAY: 'Вторник',
  WEDNESDAY: 'Среда',
  THURSDAY: 'Четверг',
  FRIDAY: 'Пятница',
  SATURDAY: 'Суббота',
  SUNDAY: 'Воскресенье',
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EVENT_TITLE_MAX_LENGTH = 200;

/**
 * Справочник «Расписание» в админ-панели (`stream.Front#76`, поверх
 * `streamer.API#39`) — ровно 7 строк (`WEEKDAY_ORDER`, как в `ScheduleWidget`),
 * без create/delete (расписание — фиксированные дни недели), только «изменить»
 * на строку. Форма редактирования — `p-drawer`, валидация 1:1 с backend
 * `UpdateScheduleDto` (`isOnline` обязателен — гарантирован тумблером,
 * `time` — формат `HH:MM`, `eventTitle` — максимум 200 символов).
 */
@Component({
  selector: 'app-admin-schedule-page',
  imports: [
    TableModule,
    DrawerModule,
    Button,
    ToggleSwitchModule,
    TextField,
    FormsModule,
    ErrorMessage,
  ],
  templateUrl: './admin-schedule-page.html',
  styleUrl: './admin-schedule-page.scss',
})
export class AdminSchedulePage {
  private readonly scheduleService = inject(ScheduleService);
  private readonly notificationService = inject(NotificationService);

  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly days = signal<ScheduleDay[]>([]);

  protected readonly drawerVisible = signal(false);
  protected readonly editingWeekday = signal<Weekday | null>(null);
  protected readonly isOnline = signal(false);
  protected readonly eventTitle = signal('');
  protected readonly time = signal('');
  protected readonly isSaving = signal(false);

  constructor() {
    this.scheduleService.getSchedule().subscribe({
      next: (days) => {
        this.days.set(
          WEEKDAY_ORDER.map((weekday) => days.find((day) => day.weekday === weekday)).filter(
            (day): day is ScheduleDay => day !== undefined,
          ),
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  protected weekdayLabelFor(day: ScheduleDay): string {
    return WEEKDAY_LABEL[day.weekday];
  }

  protected onEditClick(day: ScheduleDay): void {
    this.editingWeekday.set(day.weekday);
    this.isOnline.set(day.isOnline);
    this.eventTitle.set(day.eventTitle ?? '');
    this.time.set(day.time ?? '');
    this.drawerVisible.set(true);
  }

  protected onSaveClick(): void {
    const weekday = this.editingWeekday();
    if (!weekday) {
      return;
    }

    const eventTitle = this.eventTitle().trim();
    if (eventTitle.length > EVENT_TITLE_MAX_LENGTH) {
      this.notificationService.show(
        `Название события — не больше ${EVENT_TITLE_MAX_LENGTH} символов`,
        'error',
      );
      return;
    }

    const time = this.time().trim();
    if (time.length > 0 && !TIME_PATTERN.test(time)) {
      this.notificationService.show('Время должно быть в формате ЧЧ:ММ', 'error');
      return;
    }

    this.isSaving.set(true);
    this.scheduleService
      .update(weekday, {
        isOnline: this.isOnline(),
        eventTitle: eventTitle || undefined,
        time: time || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.days.update((days) =>
            days.map((day) => (day.weekday === updated.weekday ? updated : day)),
          );
          this.isSaving.set(false);
          this.drawerVisible.set(false);
        },
        error: () => {
          this.isSaving.set(false);
          this.notificationService.show('Не удалось сохранить расписание', 'error');
        },
      });
  }
}
