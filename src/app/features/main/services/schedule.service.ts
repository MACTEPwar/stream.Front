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

/** Расписание стримов (`GET /schedule`, публичный, отдаёт все 7 дней недели в порядке Пн→Вс). */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly api = inject(ApiService);

  getSchedule(): Observable<ScheduleDay[]> {
    return this.api.get<ScheduleDay[]>('/schedule');
  }
}
