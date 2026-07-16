import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Проверяет только факт авторизации (без ролей — RBAC не входит,
 * см. stream.Front#20). Не даёт ложный редирект до завершения
 * AuthService.fetchCurrentUser(): initializeAuth (stream.Front#14)
 * зарегистрирован через provideAppInitializer, который блокирует
 * bootstrap приложения (и первую навигацию роутера) до завершения
 * запроса — так что currentUser уже определён к моменту работы guard'а.
 *
 * Редирект — на главную ('/'), а не на отдельный роут логина: окно
 * логина/регистрации реализовано как модалка без собственного URL.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() || router.createUrlTree(['/']);
};
