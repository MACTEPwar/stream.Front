import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export type Weekday =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface ScheduleDay {
  id: string;
  weekday: Weekday;
  isOnline: boolean;
  eventTitle: string | null;
  time: string | null;
}

export interface UpdateScheduleDto {
  isOnline: boolean;
  eventTitle?: string;
  time?: string;
}

/**
 * Расписание стримов — `GET /schedule` (публичный, отдаёт все 7 дней недели
 * в порядке Пн→Вс), `update()` (`PATCH /schedule/:weekday`, `stream.Front#76`
 * — защищён `JwtAuthGuard`+`RolesGuard(ADMIN)` на backend, единственный
 * потребитель — `AdminSchedulePage`).
 */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly api = inject(ApiService);

  getSchedule(): Observable<ScheduleDay[]> {
    return this.api.get<ScheduleDay[]>('/schedule');
  }

  update(weekday: Weekday, dto: UpdateScheduleDto): Observable<ScheduleDay> {
    return this.api.patch<ScheduleDay>(`/schedule/${weekday}`, dto);
  }
}
