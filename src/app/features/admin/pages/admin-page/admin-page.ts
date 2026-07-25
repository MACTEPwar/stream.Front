import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { BreadcrumbService } from '@core/services/breadcrumb.service';

interface AdminMenuItem {
  path: string;
  label: string;
}

/**
 * Пункты сайдбар-меню (`stream.Front#74`) — только layout, содержимое
 * разделов идёт отдельными задачами поверх этих же путей: `schedule` →
 * `stream.Front#76`, `users` → `stream.Front#77`. Пока рендерят
 * заглушки (`AdminSchedulePage`/`AdminUsersPage`, см. `app.routes.ts`).
 */
const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { path: 'schedule', label: 'Расписание' },
  { path: 'users', label: 'Пользователи' },
];

/**
 * Layout админ-панели (`stream.Front#74`) — сайдбар-меню слева,
 * breadcrumbs сверху (`BreadcrumbService`, собирает `data.breadcrumb`
 * активной цепочки роутов), content area справа через `<router-outlet>`.
 */
@Component({
  selector: 'app-admin-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage {
  protected readonly breadcrumbService = inject(BreadcrumbService);
  protected readonly menuItems = ADMIN_MENU_ITEMS;
}
