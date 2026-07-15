# Project Map

Живой реестр того, что реализовано в проекте. Цель — чтобы понять "что уже есть и где" можно было по этому файлу, а не обходом всего кода.

**Правило:** создал компонент/сервис/interceptor/роут/включил опцию окружения — добавь строку сюда в том же коммите/PR, где это появилось. Не оставляй это только в коде.

## Структура / конвенции

- Скелет создан `ng new` (Angular 22, standalone, без `NgModule`); тест-раннер — встроенный Vitest-based `@angular/build:unit-test` (дефолт Angular 22, Karma/Jasmine сознательно не используются).
- Папки: `src/app/core/`, `src/app/shared/`, `src/app/features/`, `src/environments/` — назначение и путь-алиасы (`@core/*`, `@shared/*`, `@features/*`, `@env/*`) см. `README.md`.
- `src/environments/environment.ts` (dev) / `environment.prod.ts` — конфиги под алиас `@env/*`, `fileReplacements` в `angular.json` подставляет prod-версию при production-сборке.
- `ApiService` (`stream.Front#3`) проверен юнит-тестом на `HttpTestingController`, а не реальным вызовом к живому backend — на момент реализации у бэка не было ни `/health` (`streamer.API#7`), ни CORS (`streamer.API#5`). Реальная end-to-end проверка — когда обе появятся.
- ESLint (`@angular-eslint`) + Prettier настроены (`eslint.config.js`, `.prettierrc`, `.prettierignore`); `eslint-config-prettier` отключает конфликтующие с Prettier правила форматирования. Команды — см. `README.md`. Git-хуки сознательно не подключены.

## Компоненты

<!-- - `ComponentName` — `src/app/<путь>/` — краткое назначение -->

## Сервисы

- `ApiService` — `src/app/core/services/` — методы: `get()`, `post()`, `put()`, `delete()`; собирает URL из `environment.apiUrl` + путь, единая точка `catchError` для generic сетевых ошибок (без завязки на доменные ошибки — см. `stream.Front#5` для auth-заголовков/401)

## Interceptors / Guards

<!-- - `InterceptorName` — `src/app/<путь>/` — назначение -->

## Роуты

<!-- - `/path` — `src/app/<путь>/` — какая страница/компонент -->

## Design tokens / переменные

- `src/styles/_variables.scss` — 18 цветовых переменных (`$color-<hex>`, литеральные имена, без выдуманных ролей типа `$primary`) и типографика (`$font-family-montserrat`/`$font-family-nunito-sans`, `$font-size-14..28`, `$font-weight-400..700`), выведены из `docs/figma/*.json` (`designTokens`, умбрелла-репо). Подключаются через `@use 'variables' as vars;` — `includePaths` настроен в `angular.json`.
- `src/styles/_reset.scss` — global reset (box-sizing, обнуление margin/list/link-стилей), применяется один раз через `src/styles.scss`.

## Опции окружения

- `environment.apiUrl` — базовый URL backend API (dev: `http://localhost:3000`, prod: плейсхолдер, требует реального значения перед деплоем)
