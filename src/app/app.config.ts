import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { withCredentialsInterceptor } from '@core/interceptors/with-credentials.interceptor';
import { initializeAuth } from '@core/initializers/auth.initializer';
import { AdminPreset } from '@core/primeng/admin-preset';
import { ruTranslation } from '@core/primeng/ru-translation';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([withCredentialsInterceptor, authInterceptor])),
    provideAppInitializer(initializeAuth),
    // stream.Front#75 — тема используется только компонентами админ-панели,
    // остальной сайт PrimeNG-компоненты не подключает (см. admin-preset.ts).
    // `license` — Community license key (environment.primengLicenseKey, TODO
    // до реального деплоя, см. environment.prod.ts); без валидного ключа
    // PrimeNG сам показывает баннер «Invalid PrimeUI License» ПОВЕРХ ЛЮБОЙ
    // страницы сайта, не только там, где используются PrimeNG-компоненты —
    // это встроенное поведение самого providePrimeNG(), не то, что можно
    // ограничить только админкой.
    providePrimeNG({
      theme: {
        preset: AdminPreset,
        // Дефолт PrimeNG — 'system' (следует prefers-color-scheme ОС), сайт
        // же всегда тёмный без переключателя — форсируем через класс `p-dark`
        // на <html> (src/index.html), не зависим от системной темы браузера.
        options: { darkModeSelector: '.p-dark' },
      },
      // Русская локализация (stream.Front#109) — dayNames/monthNames/dateFormat
      // и т.п. для всех PrimeNG-компонентов, в т.ч. Datepicker.
      translation: ruTranslation,
      license: environment.primengLicenseKey,
    }),
  ],
};
