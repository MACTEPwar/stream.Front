import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export interface Donator {
  nickname: string;
  amount: number;
}

/** Топ донатеров (`GET /donators/top`, публичный, отдаёт до 5 записей по убыванию суммы). */
@Injectable({ providedIn: 'root' })
export class DonatorsService {
  private readonly api = inject(ApiService);

  getTop(): Observable<Donator[]> {
    return this.api.get<Donator[]>('/donators/top');
  }
}
