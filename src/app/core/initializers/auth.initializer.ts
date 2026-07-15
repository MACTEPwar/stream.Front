import { inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Узнаёт, авторизован ли пользователь, до рендера маршрутов
 * (stream.Front#14). 401 (гость) и любая другая ошибка (сеть недоступна
 * и т.п.) не должны блокировать запуск приложения — AuthService уже сам
 * сбрасывает currentUser в null при ошибке fetchCurrentUser(), здесь
 * только гасим саму ошибку, чтобы инициализация завершилась успешно.
 */
export function initializeAuth(): Observable<unknown> {
  const authService = inject(AuthService);
  return authService.fetchCurrentUser().pipe(catchError(() => of(undefined)));
}
