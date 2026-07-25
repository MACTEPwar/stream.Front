import { Routes } from '@angular/router';

import { adminGuard } from '@core/guards/admin.guard';
import { authGuard } from '@core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'main' },
  {
    path: 'main',
    loadComponent: () =>
      import('./features/main/pages/main-page/main-page').then((m) => m.MainPage),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/pages/account-page/account-page').then((m) => m.AccountPage),
  },
  // RBAC (stream.Front#74): доступен только роли ADMIN, adminGuard сам не
  // проверяет факт авторизации — идёт после authGuard в цепочке. Дочерние
  // роуты — заглушки, реальное содержимое разделов идёт отдельными задачами
  // поверх этих же путей (schedule → #76, users → #77).
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    data: { breadcrumb: 'Панель управления' },
    loadComponent: () =>
      import('./features/admin/pages/admin-page/admin-page').then((m) => m.AdminPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'schedule' },
      {
        path: 'schedule',
        data: { breadcrumb: 'Расписание' },
        loadComponent: () =>
          import('./features/admin/pages/admin-schedule-page/admin-schedule-page').then(
            (m) => m.AdminSchedulePage,
          ),
      },
      {
        path: 'users',
        data: { breadcrumb: 'Пользователи' },
        loadComponent: () =>
          import('./features/admin/pages/admin-users-page/admin-users-page').then(
            (m) => m.AdminUsersPage,
          ),
      },
    ],
  },
  // Заглушки (stream.Front#49) — для ручной проверки роутинга/активного
  // пункта nav, реальные страницы «Новости»/«Турниры» не входят в задачу.
  {
    path: 'news',
    loadComponent: () =>
      import('./features/news/pages/news-page/news-page').then((m) => m.NewsPage),
  },
  {
    path: 'tournaments',
    loadComponent: () =>
      import('./features/tournaments/pages/tournaments-page/tournaments-page').then(
        (m) => m.TournamentsPage,
      ),
  },
  {
    path: 'video',
    loadComponent: () =>
      import('./features/video/pages/video-page/video-page').then((m) => m.VideoPage),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/pages/about-page/about-page').then((m) => m.AboutPage),
  },
  {
    path: 'kit',
    loadComponent: () => import('./features/kit/pages/kit-page/kit-page').then((m) => m.KitPage),
  },
  // Любой нераспознанный роут — тоже на main (по прямому запросу пользователя).
  { path: '**', redirectTo: 'main' },
];
