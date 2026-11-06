# bedrock

The template every new web app starts from: a pnpm + Turborepo monorepo with a SolidJS client and a Hono API.

## Stack

- **pnpm workspaces** (`apps/*`, `shared/*`) and **Turborepo** for tasks (`build`, `dev`, `typecheck`, `test`).
- **apps/web**: SolidJS 2 (RC), `@solidjs/router` 2 (next), Vite with `@solidjs/vite-plugin`, and `yosegi-solid` for all UI.
- **apps/server**: Hono on Node via `@hono/node-server`; `tsx watch` in dev, bundled with `tsdown` for production. Tests with Vitest.
- **shared/types** (`@bedrock/types`), **shared/schemas** (`@bedrock/schemas`, Valibot), **shared/utils** (`@bedrock/utils`) and **shared/ui** (`@bedrock/ui`, Solid components): internal TypeScript-source packages, no build step.
- **Biome** for formatting and linting, **Lefthook** for git hooks, **commitlint** for commit messages.
- **Turborepo caching**: shared packages have no build step, so `turbo.json` has a script-less `transit` task (`dependsOn: ["^transit"]`) that `typecheck` and `build` depend on. It puts every workspace dependency's files into the task hash; without it, editing `shared/*` or `apps/server` leaves the web app's cached typecheck and build stale. Keep it.
- **Docker Compose**: `docker-compose.yml` runs the apps. Third-party services (postgres, redis, kafka, …) go in `infra/`, one file each; it's empty for now. "Adding a service" in `README.md` walks through adding one and connecting it to the server and the web app.

## Commands

Run from the repo root:

| Command                         | What it does                                                 |
| ------------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                      | Server on :3000, web on :5173 (proxies `/api` to the server) |
| `pnpm build`                    | Builds every app                                             |
| `pnpm typecheck`                | `tsc --noEmit` in every package                              |
| `pnpm test`                     | Vitest in every package that has tests                       |
| `pnpm check` / `pnpm check:fix` | Biome format + lint + import sorting, read-only / with fixes |
| `docker compose up --build`     | Server on :3000, web on :8080                                |

Before `pnpm dev` or `pnpm test` the first time, copy `apps/server/.env.example` to `apps/server/.env`.

Run `pnpm check:fix`, `pnpm typecheck` and `pnpm test` before saying a change is done.

## Naming: lowercase kebab-case everywhere

- **Every file and folder name is lowercase kebab-case**: `api-client.ts`, `root-layout.tsx`, `home-page.module.css`, `shared/utils`. Never `PascalCase.tsx`, `camelCase.ts` or `snake_case`. Dot-separated parts follow the same rule (`vite.config.ts`, `tsconfig.node.json`).
- The only exceptions are `README.md`, `LICENSE`, `CLAUDE.md` and `Dockerfile`.
- Enforced by Biome's `useFilenamingConvention` and by `scripts/check-file-names.ts` in the pre-commit hook.
- Components and types are still PascalCase _identifiers_ in code (`export function RootLayout`); only the file names are kebab-case.

## Styling: dashes

- CSS class names and custom properties are kebab-case: `.app-header`, `.stat-label`, `--app-sidebar-width`. No camelCase or BEM underscores.
- Component styles live in a sibling CSS module (`root-layout.module.css`). Read the classes with bracket access: `styles["app-header"]`.
- Use yosegi tokens (`var(--yosegi-space-400)`, `var(--yosegi-text-body)`, `var(--yosegi-color-fg-muted)`) instead of raw values.
- For conditional classes use Solid's array/object form, `class={[styles.card, { [styles["is-active"]]: active() }]}`, not string concatenation.

## UI: yosegi-solid first

- Build UI from `yosegi-solid` components (`Button`, `TextField`, `Select`, `Dialog`, `Toast`, `ErrorState`, `NotFound`, …) before writing custom ones.
- `yosegi-solid/styles.css` is imported once in `apps/web/src/index.tsx`; `<Toaster />` lives in the root layout, so call `toast(...)` anywhere.
- Reusable components live in `shared/ui` and are imported from `@bedrock/ui`. Only app-specific layouts and pages stay in `apps/web`.
- Theme it by overriding `--yosegi-*` custom properties in CSS, not by forking components.
- Its API reference is in `node_modules/yosegi-solid/README.md` and the `.d.ts` files under `node_modules/yosegi-solid/dist/source/components/`.

## SolidJS 2 (not 1.x, not React)

Solid 2 is a release candidate and differs a lot from 1.x. Before writing Solid code, read `node_modules/solid-js/skills/solid-2.0-cheatsheet/SKILL.md` (in `apps/web`). The points people get wrong most:

- Imports: `render` comes from `@solidjs/web`; stores are in `solid-js`; `jsxImportSource` is `@solidjs/web`.
- `Suspense` → `Loading`, `ErrorBoundary` → `Errored`, `onMount` → `onSettled`, `createResource` → `createMemo(() => fetchX())`.
- `createEffect(compute, apply)` always takes two functions.
- No signal writes inside memos or component bodies; write in event handlers or `onSettled`.
- Pass values, not accessors, as props (`<X value={count()} />`), and never destructure props.

The router is `@solidjs/router` 2: routes are config objects passed to `createRouter` in `apps/web/src/router.ts`, links are plain `<a href={paths.foo}>`, and active links get `aria-current="page"`. Its README is in `node_modules/@solidjs/router/README.md`.

## Server and API calls

- Routes live in `apps/server/src/routes/<name>.ts` as sub-apps, mounted in `apps/server/src/app.ts` under `/api`.
- **Chain every route** (`new Hono().get(...).post(...)`, `.route(...)`) so `AppType` keeps its types; separate `app.get(...)` statements produce an untyped client.
- The web app calls the server only through the typed client in `apps/web/src/lib/api-client.ts` (`hc<AppType>`). Add one small function per endpoint there and use `parseResponse`. Never call `fetch("/api/...")` directly.
- Error responses use the shared `ApiError` shape (`{ error: string }`); `getErrorMessage` turns them into readable text.
- Validate every input (`param`, `query`, `json`, `form`) with a Valibot schema from `@bedrock/schemas` through `validate(target, schema)` in `apps/server/src/lib/validate.ts`, then read it with `c.req.valid(target)`. A failed check answers 400 with the first issue's message as `ApiError`. Forms in the web app check input with the same schema (`v.safeParse`), as `greetings-page.tsx` does, so both sides reject the same things.
- Annotate error bodies (`const error: ApiError = …; return c.json(error, 400)`) instead of `c.json<ApiError>(…, 400)`: an explicit type argument stops Hono inferring the status, and the error then leaks into the typed client's success type.
- Keep `apps/server/src/app.ts` and its routes free of Node-only code; the web app typechecks them. Node specifics belong outside that graph: `serve` and wiring in `index.ts`, environment parsing in `env.ts`, service clients in `db/` (or `cache/`, `queue/`, …). Not even `import type` from those in a route or in `app.ts`.

## Environment variables

- `apps/server/src/env.ts` parses `process.env` with a Valibot schema once at startup and exits with a readable list of problems. Read config from its result, never from `process.env` elsewhere.
- A new variable goes in four places: the schema in `env.ts`, `apps/server/.env.example`, the server's `environment` in `docker-compose.yml`, and `passThroughEnv` of the `dev` task in `turbo.json`. Turborepo runs tasks in strict env mode and drops any variable it isn't told about, so `FOO=bar pnpm dev` would silently ignore it.

## Databases and other services

There are none yet. When a route needs one (postgres, redis, kafka, …), follow "Adding a service" in `README.md`; it walks through Postgres end to end. The rules:

- Run the service from `infra/<service>.yml`, included from `docker-compose.yml`.
- The web app never talks to a service. It calls a server route through the typed client, and the route talks to the service.
- Routes never import the client. Each route declares the interface it needs (e.g. `UsersRepository` in `routes/users.ts`), a file such as `db/users-repository.ts` implements it, and `index.ts` creates the client and passes the implementation into `createApp(deps)`, typed by an `AppDeps` interface in `app.ts`. That keeps drivers out of the web app's type graph and lets tests pass in whatever they need.
- Route tests pass an in-memory fake of the interface, so `pnpm test` and CI need no running service. Test the real implementation separately, against the service.
- Convert rows to the shared types before returning them, e.g. `Date` → ISO string.
- With SQL, use the driver's tagged templates (`` db`select … where id = ${id}` ``), never string concatenation.

## Tests

- Vitest; tests sit next to the code as `<name>.test.ts`.
- Call routes through Hono's typed `testClient(createApp())`, not raw URLs (`routes/health.test.ts`).
- Tests that hit a real service read only seed data, and any test that writes data cleans up after itself.
- `vitest.config.ts` loads `apps/server/.env`, the same file `pnpm dev` uses.

## Shared packages

- Types used on both sides go in `shared/types`, Valibot schemas for API inputs in `shared/schemas` (`greetingParamsSchema` in `greeting-params.ts`, with its type from `v.InferOutput`), and pure helpers in `shared/utils`. One concept per file, re-exported from `src/index.ts`. All three must run in the browser and in Node: no DOM and no Node APIs.
- `shared/ui` is browser-only Solid code. Put each component in its own folder: `src/<name>/<name>.tsx`, plus `src/<name>/<name>.module.css` if it needs styles. Export it from `src/index.ts`.
  - Build components on yosegi-solid and style them with yosegi tokens.
  - Keep them free of app concerns: no API client, router or app state. Pass data in as props, e.g. `LoadError` takes a `description` string, and the page turns the error into text with `getErrorMessage`.
  - `solid-js`, `@solidjs/web` and `yosegi-solid` are peer dependencies pinned to the same versions as `apps/web`, so there is one copy of Solid. Update them in both places together.
- A new shared package goes in `shared/<name>` with the name `@bedrock/<name>` and `"exports": { ".": "./src/index.ts" }`.

## Docker

```
apps/web/Dockerfile
apps/server/Dockerfile
infra/<service>.yml       one compose file per third-party service (none yet)
docker-compose.yml        the apps + include: [infra/*.yml]
```

- Each app's `Dockerfile` sits next to it and is built from the repo root with `turbo prune`.
- To add a third-party service (postgres, redis, kafka, …), follow the Infra section of `README.md`.
- A new app needs its own `Dockerfile`, a service in `docker-compose.yml` and a workspace under `apps/`.

## CI

`.github/workflows/ci.yml` runs one job on pull requests and pushes to `main`: lint (`biome ci`), `pnpm typecheck`, `pnpm test` and `pnpm build`, on a pinned `ubuntu-24.04` runner. Commit messages and file names are checked only locally, by the Lefthook hooks.

There's no CD yet. It will go in `.github/workflows/deploy.yml`, which calls `ci.yml` (it has a `workflow_call` trigger) before deploying. The comment at the top of `ci.yml` covers the details.

## Commits

Lefthook runs the hooks:

- **pre-commit** checks staged file names and runs `biome check --write` on staged files. Fixes are re-staged automatically, and anything Biome can't fix blocks the commit.
- **commit-msg** runs commitlint.
- **pre-push** runs `biome ci` and `pnpm typecheck`.

Commit messages are `type(scope): subject`, **all lowercase**, with the type one of `feature`, `bugfix`, `refactor`, `chore` or `docs`. The scope is optional and kebab-case:

```
feature(web): add settings page
bugfix(server): return 404 for unknown greetings
refactor(shared): move date helpers into utils
chore: bump hono
docs(readme): explain docker setup
```
