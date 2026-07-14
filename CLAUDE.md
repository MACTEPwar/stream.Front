# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository (`stream.Front`).

## Architecture

- SPA (single-page application) — no SSR, no server-rendered pages.
- Angular, latest stable major version. When scaffolding or upgrading dependencies, target the current latest release rather than pinning to an older major.
- Desktop/mobile builds wrap this same app with Electron — avoid platform-specific forks; keep one codebase.

## Design source

UI is driven from Figma exports in the umbrella repo (`steramer.io/docs/figma/*.json`, indexed in `steramer.io/figma.md`), not from guessing layout/spacing/colors.

## Available skills

`.claude/skills/` in this repo carries the official Angular team skills (from [github.com/angular/skills](https://github.com/angular/skills), synced manually — not auto-updating):

- `angular-developer` — architectural guidance and idiomatic code for components, services, reactivity (signals, linkedSignal, resource), forms, DI, routing, SSR, accessibility (ARIA), animations, styling, testing, CLI tooling. Prefer this over ad-hoc Angular patterns.
- `angular-new-app` — guidelines for scaffolding a new Angular app via the Angular CLI. Use when initializing the project (see the "подготовка к разработке" task list in the umbrella repo's memory).

## Параллельная работа (git worktree)

Нужен только когда две сессии Claude Code работают в **этом же** репозитории одновременно (например, две задачи `stream.Front` параллельно) — не нужен, если параллельная сессия работает в `backend/` или в умбрелла-репо, это уже отдельные git-репозитории.

`.claude/settings.json` уже настроен: `symlinkDirectories: ["node_modules"]` — новый worktree не тянет отдельный `npm install`, а симлинкает существующий `node_modules`.

Создание: `git worktree add -b <type>/<issue>-<описание> ../stream.Front-wt-<issue>`, затем открыть эту папку отдельным окном VS Code.

Уборка после мержа ветки: `git worktree remove ../stream.Front-wt-<issue>` (и удалить ветку, если не удалилась автоматически при мерже PR).
