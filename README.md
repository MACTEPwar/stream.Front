# stream.Front

Frontend for the steramer.io project (web, and later desktop/mobile via Electron).

## Stack

- Angular 22 (standalone components, no `NgModule`)
- Unit tests: [Vitest](https://vitest.dev/) via Angular's built-in `@angular/build:unit-test` builder (Angular 22's default — no Karma/Jasmine)

## Requirements

- Node.js **v25.8.2** (or newer). This is currently the only locally verified version that Angular CLI 22 runs under — note that Node 25 is an **odd-numbered, non-LTS** release; Angular itself warns it's unsupported until Node 27. Prefer switching to a Node 24/26 LTS line once available in this environment.
- npm 11.x (bundled with the Node install above)
- Angular CLI 22.0.6 (installed as a project dependency — invoke via `npx ng ...` or `npm run ng -- ...`, no global install required)

## Project structure

```
src/
  app/
    core/       # singleton services, app-wide providers, guards/interceptors
    shared/     # reusable components/pipes/directives with no feature ownership
    features/   # one folder per feature area (routed screens)
  environments/  # environment.ts and friends (see @env/* alias)
  styles/       # SCSS partials — variables, reset (see "Styles" below)
```

Path aliases (configured in `tsconfig.json`): `@core/*`, `@shared/*`, `@features/*`, `@env/*`.

This layout is produced by scaffolding the project with `ng new` and then manually creating the `core/`, `shared/`, `features/` and `environments/` folders plus the `paths` block in `tsconfig.json` — see git history of this commit for the exact reproducible steps rather than a custom schematic.

## Environments

`src/environments/environment.ts` (dev) and `environment.prod.ts` hold `apiUrl`, swapped via `fileReplacements` in the `production` build configuration (`angular.json`). No `environment.local.ts` — the only value is `apiUrl`, and the local backend always runs on the same port (`http://localhost:3000`), so there's nothing to override per-developer.

## HTTP client

`ApiService` (`src/app/core/services/api.service.ts`) is the single entry point for backend calls — it builds the full URL from `environment.apiUrl` plus the given path and centralizes generic network-error handling (e.g. connection loss). Covered by a unit test against `HttpTestingController` rather than a live backend call, since neither a `/health` endpoint nor CORS existed on the backend yet when this was built.

## Styles

`src/styles/_variables.scss` holds the SCSS color/typography variables sourced from `docs/figma/*.json` (umbrella repo, `designTokens`) — literal names by value (`$color-19a2e6`, `$font-size-16`, ...), not invented semantic roles like `$primary`; component tasks assign meaning as they consume these. `src/styles/_reset.scss` is the global reset (box-sizing, margin/list/link resets), applied once via `@use 'reset';` in `src/styles.scss`.

`stylePreprocessorOptions.includePaths` (`angular.json`) points at `src/styles`, so any component can do `@use 'variables' as vars;` without a relative path.

## Loading / error / empty state convention

- **Loading** — `<app-skeleton>` (`src/app/shared/components/skeleton/`), a shimmer placeholder whose shape adapts to the element it replaces via `width`/`height`/`radius` inputs.
- **Error** — `<app-error-message>` (`src/app/shared/components/error-message/`), a single shared "Ошибка загрузки" text at the element level (overridable via `message` input for edge cases, but the point is one consistent default).
- **Empty** — deliberately **not** a shared component. Each feature decides its own empty-state presentation when it's built (e.g. "no news yet" looks nothing like "no scheduled streams") — see `stream.Front#9`.

## Development server

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4210/` (dev-server port is fixed via `angular.json`'s `serve.options.port`, not the Angular CLI default `4200` — must match `CORS_ORIGIN` on the backend). The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
npx ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
npx ng generate --help
```

## Building

To build the project run:

```bash
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

```bash
npm test
```

## Linting and formatting

```bash
npm run lint        # ESLint (@angular-eslint) — errors only, no auto-fix
npm run lint:fix     # ESLint with --fix
npm run format       # Prettier --write across the repo
npm run format:check # Prettier --check (used to verify formatting is clean)
```

`eslint-config-prettier` disables ESLint rules that would conflict with Prettier's formatting, so the two never fight over the same concern. `.claude/skills/` is excluded from Prettier (`.prettierignore`) — it's community-synced content, not ours to reformat. No git hooks (husky/lint-staged) — running these commands is left as a manual/CI convention for now.

## Running end-to-end tests

Angular CLI does not come with an end-to-end testing framework by default. Not set up yet — a choice of tool is a separate task.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
