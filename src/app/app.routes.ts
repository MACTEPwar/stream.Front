import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'main' },
  {
    path: 'main',
    loadComponent: () =>
      import('./features/main/pages/main-page/main-page').then((m) => m.MainPage),
  },
  // Заглушки (stream.Front#49) — для ручной проверки роутинга/активного
  // пункта nav, реальные страницы «Новости»/«Турниры» не входят в задачу.
  {
    path: 'news',
    loadComponent: () => import('./features/news/pages/news-page/news-page').then((m) => m.NewsPage),
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
    loadComponent: () => import('./features/video/pages/video-page/video-page').then((m) => m.VideoPage),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/pages/about-page/about-page').then((m) => m.AboutPage),
  },
  {
    path: 'kit',
    loadComponent: () => import('./features/kit/pages/kit-page/kit-page').then((m) => m.KitPage),
  },
  // Любой нераспознанный роут — тоже на main (по прямому запросу пользователя).
  { path: '**', redirectTo: 'main' },
];
