# Project Map

Живой реестр того, что реализовано в проекте. Цель — чтобы понять "что уже есть и где" можно было по этому файлу, а не обходом всего кода.

**Правило:** создал компонент/сервис/interceptor/роут/включил опцию окружения — добавь строку сюда в том же коммите/PR, где это появилось. Не оставляй это только в коде.

## Структура / конвенции

- Скелет создан `ng new` (Angular 22, standalone, без `NgModule`); тест-раннер — встроенный Vitest-based `@angular/build:unit-test` (дефолт Angular 22, Karma/Jasmine сознательно не используются).
- Папки: `src/app/core/`, `src/app/shared/`, `src/app/features/`, `src/environments/` — назначение и путь-алиасы (`@core/*`, `@shared/*`, `@features/*`, `@env/*`) см. `README.md`.
- `src/environments/environment.ts` (dev) / `environment.prod.ts` — конфиги под алиас `@env/*`, `fileReplacements` в `angular.json` подставляет prod-версию при production-сборке.
- `ApiService` (`stream.Front#3`) проверен юнит-тестом на `HttpTestingController`, а не реальным вызовом к живому backend — на момент реализации у бэка не было ни `/health` (`streamer.API#7`), ни CORS (`streamer.API#5`). Реальная end-to-end проверка — когда обе появятся.
- ESLint (`@angular-eslint`) + Prettier настроены (`eslint.config.js`, `.prettierrc`, `.prettierignore`); `eslint-config-prettier` отключает конфликтующие с Prettier правила форматирования. Команды — см. `README.md`. Git-хуки сознательно не подключены.
- Конвенция loading/error/empty (`stream.Front#9`): loading — `Skeleton`, error — `ErrorMessage` (см. «Компоненты»). Empty-состояние **не** унифицировано намеренно — решается индивидуально по фиче.
- `initializeAuth` (`stream.Front#14`, `src/app/core/initializers/auth.initializer.ts`) — `provideAppInitializer` в `app.config.ts`: вызывает `AuthService.fetchCurrentUser()` до рендера маршрутов, любую ошибку (`401`/сеть) гасит, бутстрап не блокирует. Backend `/auth/me` (`streamer.API#16`) и CORS credentials-режим (`#19`) ещё не реализованы — проверено юнит-тестами на `HttpTestingController`, реальная e2e-проверка отложена (та же ситуация, что у `ApiService`/`AuthService`).

## Компоненты

- `NotificationList` — `src/app/shared/components/notification-list/` — toast-компонент, рендерит очередь `NotificationService.notifications`, крестик → `dismiss()`; подключён один раз в `app.html` (корневой layout)
- `Skeleton` — `src/app/shared/components/skeleton/` — loading-плейсхолдер с shimmer-анимацией, форма/размер под конкретный элемент через inputs `width`/`height`/`radius` (дефолты `100%`/`16px`/`4px`)
- `ErrorMessage` — `src/app/shared/components/error-message/` — единый текст ошибки уровня элемента, дефолт «Ошибка загрузки» (`message` input для редких переопределений)
- `Shell` (`stream.Front#19`) — `src/app/shared/components/shell/` — header/nav по мокапу `main-nav`, контент через `<ng-content>`; подключён один раз в `app.html` вокруг `<router-outlet>`, поэтому переиспользуется на всех страницах автоматически. Nav-пункты (Главная/Новости/Турниры) и кнопка входа (статичный гостевой вид, без `AuthService`) — временные: реальное содержимое `main-nav` (лого, точные пункты меню) не выгружено из Figma API из-за rate limit (см. `figma.md`), требует доуточнения повторным `get_figma_data`, когда лимит снимется.

## Сервисы

- `ApiService` — `src/app/core/services/` — методы: `get()`, `post()`, `put()`, `delete()` (принимают опциональный `{ withCredentials }`); собирает URL из `environment.apiUrl` + путь, единая точка `catchError` для generic сетевых ошибок (без завязки на доменные ошибки)
- `NotificationService` — `src/app/core/services/` — методы: `show(message, type, durationMs?)` (типы `success`/`error`/`info`; `durationMs: null` — persistent-уведомление, не скрывается само), `dismiss(id)`, `dismissAll()` — очередь на `signal`, поддерживает несколько одновременных уведомлений
- `AuthService` (`stream.Front#4`) — `src/app/core/services/` — `currentUser` (readonly signal `CurrentUser | null`), `isAuthenticated` (computed); методы `login(login, password)`, `loginWithGoogle(googleIdToken)`, `fetchCurrentUser()` — `POST/GET` через `ApiService` с `withCredentials: true` (JWT в `httpOnly`-cookie, фронт токен не хранит); `logout()` — `POST /auth/logout`, сбрасывает `currentUser` в `null` через `finalize()` независимо от результата запроса. Backend-эндпоинты (`streamer.API#16-18`) и CORS credentials-режим (`#19`) ещё не реализованы — проверено юнит-тестами на `HttpTestingController`, реальная e2e-проверка отложена.

## Interceptors / Guards

- `withCredentialsInterceptor` (`stream.Front#14`) — `src/app/core/interceptors/` — форсит `withCredentials: true` на всех HTTP-запросах приложения (не только через `AuthService`/`ApiService`), чтобы httpOnly auth-cookie уходила глобально; подключён в `app.config.ts` через `provideHttpClient(withInterceptors([...]))`
- `authInterceptor` (`stream.Front#5`) — `src/app/core/interceptors/` — на `401` вызывает `AuthService.logout()` и показывает уведомление через `NotificationService` (без редиректа — окно логина/регистрации реализовано как модалка, без отдельного роута). Исключение — запросы к `/auth/*`: `401` от `/auth/me` (гость, см. `#14`) и `/auth/login`/`/auth/google` (неверные креды) не триггерят logout, а `/auth/logout` явно исключён из собственной же логики, иначе получился бы бесконечный цикл. Ошибка не глотается — пробрасывается дальше вызывающему коду. Backend-эндпоинты и CORS credentials-режим (`streamer.API#16-19`) ещё не реализованы — проверено юнит-тестами на `HttpTestingController`.

## Роуты

<!-- - `/path` — `src/app/<путь>/` — какая страница/компонент -->

## Design tokens / переменные

- `src/styles/_variables.scss` — 18 цветовых переменных (`$color-<hex>`, литеральные имена, без выдуманных ролей типа `$primary`) и типографика (`$font-family-montserrat`/`$font-family-nunito-sans`, `$font-size-14..28`, `$font-weight-400..700`), выведены из `docs/figma/*.json` (`designTokens`, умбрелла-репо). Подключаются через `@use 'variables' as vars;` — `includePaths` настроен в `angular.json`.
- `src/styles/_reset.scss` — global reset (box-sizing, обнуление margin/list/link-стилей), применяется один раз через `src/styles.scss`.

## Опции окружения

- `environment.apiUrl` — базовый URL backend API (dev: `http://localhost:3000`, prod: плейсхолдер, требует реального значения перед деплоем)
