# Project Map

Живой реестр того, что реализовано в проекте. Цель — чтобы понять "что уже есть и где" можно было по этому файлу, а не обходом всего кода.

**Правило:** создал компонент/сервис/interceptor/роут/включил опцию окружения — добавь строку сюда в том же коммите/PR, где это появилось. Не оставляй это только в коде.

## Структура / конвенции

- Скелет создан `ng new` (Angular 22, standalone, без `NgModule`); тест-раннер — встроенный Vitest-based `@angular/build:unit-test` (дефолт Angular 22, Karma/Jasmine сознательно не используются).
- Папки: `src/app/core/`, `src/app/shared/`, `src/app/features/`, `src/environments/` — назначение и путь-алиасы (`@core/*`, `@shared/*`, `@features/*`, `@env/*`) см. `README.md`.
- `src/environments/environment.ts` — пока пустой плейсхолдер под алиас `@env/*`; наполнение (dev/prod-конфиги) — задача stream.Front#2.

## Компоненты

<!-- - `ComponentName` — `src/app/<путь>/` — краткое назначение -->

## Сервисы

<!-- - `ServiceName` — `src/app/<путь>/` — методы: `method1()`, `method2()` -->

## Interceptors / Guards

<!-- - `InterceptorName` — `src/app/<путь>/` — назначение -->

## Роуты

<!-- - `/path` — `src/app/<путь>/` — какая страница/компонент -->

## Design tokens / переменные

<!-- - `$variable-name` — назначение, файл -->

## Опции окружения

<!-- - `environment.<key>` — назначение -->
