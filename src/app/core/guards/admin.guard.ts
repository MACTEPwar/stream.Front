import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * RBAC-проверка роли `ADMIN` (`stream.Front#74`). Не дублирует проверку
 * факта авторизации — используется на роуте вместе с `authGuard`
 * (`canActivate: [authGuard, adminGuard]`), сам полагается на то, что
 * `currentUser` уже определён к моменту своей работы (см. `authGuard`).
 *
 * Редирект — на главную ('/'), тот же паттерн, что у `authGuard`.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser()?.role === 'ADMIN' || router.createUrlTree(['/']);
};
