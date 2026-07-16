import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * На 401 от бэка сбрасывает состояние авторизации через AuthService.logout()
 * (stream.Front#5). Запросы к /auth/* исключены из этой логики:
 * - /auth/me — 401 там означает «гость» при старте (см. #14), это норма,
 *   а не разлогинивание посреди работы;
 * - /auth/login, /auth/google — 401 означает неверные креды, обрабатывается
 *   вызывающим кодом (форма логина), а не глобальным logout;
 * - /auth/logout — сам может ответить 401 (сессия на бэке уже невалидна);
 *   не реагировать на него, иначе получится бесконечный цикл logout → 401 → logout → ...
 *
 * Редиректа на отдельный роут логина нет — окно логина/регистрации в этом
 * приложении реализовано как модалка, без собственного URL, поэтому вместо
 * редиректа — уведомление через NotificationService.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        authService.logout().subscribe({ error: () => undefined });
        notificationService.show('Сессия истекла — войдите снова', 'info');
      }
      return throwError(() => error);
    }),
  );
};
