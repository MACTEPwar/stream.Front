import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Settings, UpdateSettingsDto } from '../models/settings.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ApiService);

  getSettings(): Observable<Settings> {
    return this.api.get<Settings>('/settings');
  }

  updateSettings(dto: UpdateSettingsDto): Observable<Settings> {
    return this.api.patch<Settings>('/settings', dto);
  }
}
