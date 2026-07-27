import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthMethod, AuthMethodType } from '../models/auth-method.model';
import { ChangePasswordDto } from '../models/change-password.model';
import { ApiService } from './api.service';

/**
 * Управление способами входа (`stream.Front#82`, поверх `streamer.API#63`) —
 * один аккаунт может иметь несколько подключённых методов (`LOCAL`/`GOOGLE`).
 * Единственный потребитель — `ProfileSection` (блок «Способы входа»).
 */
@Injectable({ providedIn: 'root' })
export class AuthMethodsService {
  private readonly api = inject(ApiService);

  getMethods(): Observable<AuthMethod[]> {
    return this.api.get<AuthMethod[]>('/auth/methods', undefined, { withCredentials: true });
  }

  addLocal(login: string, password: string): Observable<{ success: true }> {
    return this.api.post<{ success: true }>(
      '/auth/methods/local',
      { login, password },
      { withCredentials: true },
    );
  }

  changeLocalPassword(dto: ChangePasswordDto): Observable<{ success: true }> {
    return this.api.patch<{ success: true }>('/auth/methods/local/password', dto, {
      withCredentials: true,
    });
  }

  connectGoogle(idToken: string): Observable<{ success: true }> {
    return this.api.post<{ success: true }>(
      '/auth/methods/google',
      { idToken },
      { withCredentials: true },
    );
  }

  disconnect(type: AuthMethodType): Observable<{ success: true }> {
    return this.api.delete<{ success: true }>(`/auth/methods/${type}`, undefined, {
      withCredentials: true,
    });
  }
}
