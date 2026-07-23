import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

import { ApiService } from './api.service';
import { ChangePasswordDto } from '../models/change-password.model';
import { CurrentUser } from '../models/current-user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly currentUserSignal = signal<CurrentUser | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  login(login: string, password: string): Observable<CurrentUser> {
    return this.api
      .post<CurrentUser>('/auth/login', { login, password }, { withCredentials: true })
      .pipe(tap((user) => this.currentUserSignal.set(user)));
  }

  register(login: string, password: string): Observable<CurrentUser> {
    return this.api
      .post<CurrentUser>('/auth/register', { login, password }, { withCredentials: true })
      .pipe(tap((user) => this.currentUserSignal.set(user)));
  }

  loginWithGoogle(googleIdToken: string): Observable<CurrentUser> {
    return this.api
      .post<CurrentUser>('/auth/google', { googleIdToken }, { withCredentials: true })
      .pipe(tap((user) => this.currentUserSignal.set(user)));
  }

  logout(): Observable<void> {
    return this.api
      .post<void>('/auth/logout', undefined, { withCredentials: true })
      .pipe(finalize(() => this.currentUserSignal.set(null)));
  }

  changePassword(dto: ChangePasswordDto): Observable<{ success: true }> {
    return this.api.post<{ success: true }>('/auth/change-password', dto, { withCredentials: true });
  }

  fetchCurrentUser(): Observable<CurrentUser> {
    return this.api.get<CurrentUser>('/auth/me', undefined, { withCredentials: true }).pipe(
      tap({
        next: (user) => this.currentUserSignal.set(user),
        error: () => this.currentUserSignal.set(null),
      }),
    );
  }
}
