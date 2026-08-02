import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { BreadcrumbService } from '@core/services/breadcrumb.service';

interface AdminMenuItem {
  path: string;
  label: string;
}

interface AdminMenuGroup {
  label: string;
  items: AdminMenuItem[];
}

/**
 * Сайдбар-меню (`stream.Front#74`) сгруппировано по разделам — единственная
 * группа «Справочники» (`schedule` → `stream.Front#76`, `users` →
 * `stream.Front#77`, `news`/`news-tags` → `stream.Front#115`, `news-pinned` →
 * `stream.Front#118`) сворачиваемая
 * (по прямому запросу пользователя при расширении #77). Отдельная группа
 * «Новости» из первой итерации `#115` объединена сюда же — «Новости» это
 * такой же справочник, как «Расписание»/«Пользователи», отдельная группа
 * ради двух пунктов была избыточна.
 */
const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  {
    label: 'Справочники',
    items: [
      { path: 'schedule', label: 'Расписание' },
      { path: 'users', label: 'Пользователи' },
      { path: 'news', label: 'Новости' },
      { path: 'news-tags', label: 'Теги' },
      { path: 'news-pinned', label: 'Закреплённые новости' },
    ],
  },
];

/**
 * Layout админ-панели (`stream.Front#74`) — сайдбар-меню слева (сгруппировано,
 * сворачиваемо, `stream.Front#77`), breadcrumbs сверху (`BreadcrumbService`,
 * собирает `data.breadcrumb` активной цепочки роутов), content area справа
 * через `<router-outlet>`.
 */
@Component({
  selector: 'app-admin-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage {
  protected readonly breadcrumbService = inject(BreadcrumbService);
  protected readonly menuGroups = ADMIN_MENU_GROUPS;

  // Все группы развёрнуты по умолчанию — единственная группа сейчас
  // содержит оба существующих раздела, сворачивать сразу нечего смысла нет.
  private readonly expandedGroups = signal(new Set(ADMIN_MENU_GROUPS.map((group) => group.label)));

  protected isGroupExpanded(label: string): boolean {
    return this.expandedGroups().has(label);
  }

  protected toggleGroup(label: string): void {
    this.expandedGroups.update((expanded) => {
      const next = new Set(expanded);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }
}
