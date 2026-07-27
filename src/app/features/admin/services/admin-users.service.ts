import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import { AuthMethodType } from '@core/models/auth-method.model';
import { GameAccount } from '@core/models/game-account.model';
import { SocialLink } from '@core/models/social-link.model';

export type AdminUserRole = 'USER' | 'ADMIN';
export type AdminUserAnyRole = 'USER' | 'ADMIN' | 'MODERATOR';

export interface AdminUser {
  id: string;
  name: string | null;
  role: AdminUserAnyRole;
  authMethods: AuthMethodType[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUser {
  avatarUrl: string | null;
  gameAccounts: GameAccount[];
  socialLinks: SocialLink[];
}

export interface AdminUsersFilter {
  search?: string;
  role?: AdminUserAnyRole;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Справочник «Пользователи» в админ-панели (`stream.Front#77`, поверх
 * `streamer.API#59`/`#61`/`#63`) — `getUsers()` (`GET /admin/users`,
 * пагинация + опциональные фильтры `search`/`role`, `#63`: `search` матчит
 * `Profile.name` ИЛИ `AuthMethod.identifier` — заменил `login`-фильтр из
 * `#61`, т.к. `login` ушёл с `User` в справочник методов), `getUser(id)`
 * (`GET /admin/users/:id`, полная карточка — профиль + игровые аккаунты +
 * соц-сети + `authMethods`), `updateRole()` (`PATCH /admin/users/:id/role`,
 * только `USER`/`ADMIN` — `MODERATOR` backend отклоняет `400`), `remove()`
 * (`DELETE /admin/users/:id`). Все защищены `JwtAuthGuard`+`RolesGuard(ADMIN)`
 * на backend; единственный потребитель — `AdminUsersPage`.
 */
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly api = inject(ApiService);

  getUsers(
    page: number,
    limit: number,
    filter?: AdminUsersFilter,
  ): Observable<PaginatedResponse<AdminUser>> {
    return this.api.get<PaginatedResponse<AdminUser>>('/admin/users', {
      page,
      limit,
      ...(filter?.search && { search: filter.search }),
      ...(filter?.role && { role: filter.role }),
    });
  }

  getUser(id: string): Observable<AdminUserDetail> {
    return this.api.get<AdminUserDetail>(`/admin/users/${id}`);
  }

  updateRole(id: string, role: AdminUserRole): Observable<AdminUser> {
    return this.api.patch<AdminUser>(`/admin/users/${id}/role`, { role });
  }

  remove(id: string): Observable<AdminUser> {
    return this.api.delete<AdminUser>(`/admin/users/${id}`);
  }
}
