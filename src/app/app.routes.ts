import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'main',
    loadComponent: () =>
      import('./features/main/pages/main-page/main-page').then((m) => m.MainPage),
  },
];
