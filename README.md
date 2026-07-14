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
```

Path aliases (configured in `tsconfig.json`): `@core/*`, `@shared/*`, `@features/*`, `@env/*`.

This layout is produced by scaffolding the project with `ng new` and then manually creating the `core/`, `shared/`, `features/` and `environments/` folders plus the `paths` block in `tsconfig.json` — see git history of this commit for the exact reproducible steps rather than a custom schematic.

## Environments

`src/environments/environment.ts` (dev) and `environment.prod.ts` hold `apiUrl`, swapped via `fileReplacements` in the `production` build configuration (`angular.json`). No `environment.local.ts` — the only value is `apiUrl`, and the local backend always runs on the same port (`http://localhost:3000`), so there's nothing to override per-developer.

## Development server

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

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

## Running end-to-end tests

Angular CLI does not come with an end-to-end testing framework by default. Not set up yet — a choice of tool is a separate task.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
