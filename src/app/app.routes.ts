import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'main',
    loadComponent: () =>
      import('./features/main/pages/main-page/main-page').then((m) => m.MainPage),
  },
  {
    path: 'kit',
    loadComponent: () => import('./features/kit/pages/kit-page/kit-page').then((m) => m.KitPage),
  },
];
