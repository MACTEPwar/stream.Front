import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { AUTH_METHOD_TYPE_LABELS } from '@core/models/auth-method.model';
import { UserRole } from '@core/models/current-user.model';
import { AuthService } from '@core/services/auth.service';
import { ModalService } from '@core/services/modal.service';
import { NotificationService } from '@core/services/notification.service';
import { Badge, BadgeSeverity } from '@shared/components/badge/badge';
import { Button } from '@shared/components/button/button';
import { ConfirmModal } from '@shared/components/confirm-modal/confirm-modal';
import { ErrorMessage } from '@shared/components/error-message/error-message';
import { TextField } from '@shared/components/text-field/text-field';
import {
  AdminUser,
  AdminUserAnyRole,
  AdminUserDetail,
  AdminUserRole,
  AdminUsersService,
} from '../../services/admin-users.service';

const ROLE_BADGE_SEVERITY: Record<UserRole, BadgeSeverity> = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
};

const PAGE_SIZE = 20;

const ROLE_OPTIONS: { label: string; value: AdminUserRole }[] = [
  { label: 'USER', value: 'USER' },
  { label: 'ADMIN', value: 'ADMIN' },
];

const ROLE_FILTER_OPTIONS: { label: string; value: AdminUserAnyRole | null }[] = [
  { label: 'Все', value: null },
  { label: 'USER', value: 'USER' },
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'MODERATOR', value: 'MODERATOR' },
];

/**
 * Справочник «Пользователи» в админ-панели (`stream.Front#77`, поверх
 * `streamer.API#59`/`#61`/`#63`) — `p-table` в lazy-режиме пагинации (сервер
 * отдаёт страницами, `AdminUsersService.getUsers()`), фильтр `search`
 * (матчит `Profile.name` ИЛИ `AuthMethod.identifier`, `#63`) и роль — сбрасывают
 * на страницу 1. «Изменить роль» — `p-drawer` + `p-select` (только
 * `USER`/`ADMIN`, `MODERATOR` backend отклоняет `400`), «удалить» —
 * переиспользованный `ConfirmModal`, «просмотр» — отдельный `p-drawer` с
 * полной карточкой (`getUser(id)`: профиль + игровые аккаунты + соц-сети +
 * способы входа, read-only) с теми же кнопками действий, что и в таблице.
 * Своя строка (`row.id === currentUser.id`) — все три кнопки скрыты на UI,
 * backend `403` не единственная защита (AC).
 */
@Component({
  selector: 'app-admin-users-page',
  imports: [
    TableModule,
    DrawerModule,
    Button,
    Badge,
    SelectModule,
    TextField,
    FormsModule,
    ErrorMessage,
    DatePipe,
  ],
  templateUrl: './admin-users-page.html',
  styleUrl: './admin-users-page.scss',
})
export class AdminUsersPage {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly totalRecords = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly roleFilterOptions = ROLE_FILTER_OPTIONS;
  protected readonly authMethodLabel = AUTH_METHOD_TYPE_LABELS;

  protected readonly searchFilter = signal('');
  protected readonly roleFilter = signal<AdminUserAnyRole | null>(null);

  protected readonly drawerVisible = signal(false);
  protected readonly editingUserId = signal<string | null>(null);
  protected readonly editingRole = signal<AdminUserRole>('USER');
  protected readonly isSaving = signal(false);

  protected readonly detailDrawerVisible = signal(false);
  protected readonly detailUser = signal<AdminUserDetail | null>(null);
  protected readonly isDetailLoading = signal(false);

  protected isOwnRow(user: AdminUser): boolean {
    return user.id === this.authService.currentUser()?.id;
  }

  protected badgeSeverity(role: UserRole): BadgeSeverity {
    return ROLE_BADGE_SEVERITY[role];
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? PAGE_SIZE;
    const page = Math.floor(first / rows) + 1;
    this.loadPage(page);
  }

  protected onFilterChange(): void {
    this.loadPage(1);
  }

  private loadPage(page: number): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    const filter = {
      search: this.searchFilter().trim() || undefined,
      role: this.roleFilter() ?? undefined,
    };
    this.adminUsersService.getUsers(page, PAGE_SIZE, filter).subscribe({
      next: (response) => {
        this.users.set(response.items);
        this.totalRecords.set(response.meta.total);
        this.page.set(response.meta.page);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  protected onViewClick(user: AdminUser): void {
    this.detailUser.set(null);
    this.isDetailLoading.set(true);
    this.detailDrawerVisible.set(true);
    this.adminUsersService.getUser(user.id).subscribe({
      next: (detail) => {
        this.detailUser.set(detail);
        this.isDetailLoading.set(false);
      },
      error: () => {
        this.isDetailLoading.set(false);
        this.detailDrawerVisible.set(false);
        this.notificationService.show('Не удалось загрузить карточку пользователя', 'error');
      },
    });
  }

  protected onEditRoleClick(user: AdminUser): void {
    this.detailDrawerVisible.set(false);
    this.editingUserId.set(user.id);
    this.editingRole.set(user.role === 'ADMIN' ? 'ADMIN' : 'USER');
    this.drawerVisible.set(true);
  }

  protected onSaveRoleClick(): void {
    const id = this.editingUserId();
    if (!id) {
      return;
    }

    this.isSaving.set(true);
    this.adminUsersService.updateRole(id, this.editingRole()).subscribe({
      next: (updated) => {
        this.users.update((users) => users.map((user) => (user.id === id ? updated : user)));
        this.isSaving.set(false);
        this.drawerVisible.set(false);
      },
      error: () => {
        this.isSaving.set(false);
        this.notificationService.show('Не удалось изменить роль', 'error');
      },
    });
  }

  protected onDeleteClick(user: AdminUser): void {
    this.detailDrawerVisible.set(false);
    this.modalService.open(ConfirmModal, {
      message: `Удалить пользователя «${user.name ?? user.id}»?`,
      confirmText: 'Удалить',
      onConfirm: () => {
        this.adminUsersService.remove(user.id).subscribe({
          next: () => this.loadPage(this.page()),
          error: () => this.notificationService.show('Не удалось удалить пользователя', 'error'),
        });
      },
    });
  }
}
