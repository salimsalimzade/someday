# bedrock

The foundation for every web app I build.

pnpm workspaces + Turborepo, a SolidJS 2 client with `yosegi-solid`, a Hono API on Node, Vitest, Biome, Lefthook, commitlint and Docker Compose.

```
apps/
  web/        solid 2 + @solidjs/router + vite + yosegi-solid  (Dockerfile)
  server/     hono on node + vitest                             (Dockerfile)
shared/
  types/      @bedrock/types
  schemas/    @bedrock/schemas  (valibot schemas shared by server and web)
  utils/      @bedrock/utils
  ui/         @bedrock/ui  (shared solid components)
infra/        third-party services (postgres, redis, kafka, …), one compose file each; empty for now
docker-compose.yml
.github/
  workflows/ci.yml   lint, typecheck, test and build on every PR and push to main
```

## Getting started

Requires Node 26 and pnpm 11. Docker is optional, for `docker compose up` and the services in [infra/](#infra).

```sh
pnpm install                                   # also installs the git hooks
cp apps/server/.env.example apps/server/.env
pnpm dev                                       # web on http://localhost:5173, api on http://localhost:3000
```

| Command                         | What it does                                |
| ------------------------------- | ------------------------------------------- |
| `pnpm build`                    | Build every app                             |
| `pnpm typecheck`                | Type-check every package                    |
| `pnpm test`                     | Run the tests                               |
| `pnpm check` / `pnpm check:fix` | Biome format + lint                         |
| `docker compose up --build`     | Run everything in containers (web on :8080) |

## Infra

`infra/` holds the third-party services the apps depend on: databases, caches, queues. Postgres, Redis and Kafka are typical examples. It's empty until an app needs one.

Each service gets one Docker Compose file, `infra/<service>.yml`, with:

- the service, its pinned image and its port on `localhost`
- a named volume, so data survives restarts
- a healthcheck, so `--wait` and `depends_on` know when it's ready

## Adding a service

How the pieces connect once a service is in:

```
browser ── typed client ──▶ /api/... ──▶ route ──▶ NotesRepository (an interface)
 apps/web  lib/api-client.ts            apps/server          ▲
                                                             │ implemented by
                                                db/notes-repository.ts ──▶ postgres
                                                             ▲               (infra/postgres.yml)
                                         index.ts creates the client and passes it into createApp
```

- **The web app never talks to the service.** It only calls server routes, through the typed client. In dev Vite proxies `/api` to the server; in Docker nginx does.
- **Routes never import the driver.** A route declares the interface it needs. A file in `db/` implements it with the driver, and `index.ts` passes that in. That keeps drivers out of the web app's type graph (it typechecks `app.ts` and the routes) and lets tests pass a fake.

The steps below add Postgres and a `notes` table, from container to page. Other services follow the same steps; see [Other services](#other-services).

### 1. Run the service

`infra/postgres.yml`:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: bedrock
      POSTGRES_PASSWORD: bedrock
      POSTGRES_DB: bedrock
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql
      # Runs once, when the volume is empty. Paths here are relative to this file.
      - ./postgres-init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "bedrock", "-d", "bedrock"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped

volumes:
  postgres-data:
```

`infra/postgres-init.sql` creates the first tables. It runs only on an empty volume, so once the schema starts changing, move to a migration tool.

```sql
CREATE TABLE notes (
  id         serial PRIMARY KEY,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Include it from the root `docker-compose.yml`, and make the server wait for it:

```yaml
include:
  - infra/postgres.yml

services:
  server:
    environment:
      PORT: 3000
      # Inside Compose the host is the service name, not localhost.
      DATABASE_URL: postgres://bedrock:bedrock@postgres:5432/bedrock
    depends_on:
      postgres:
        condition: service_healthy
    # …the rest stays as it is
```

For `pnpm dev`, add a root script that starts only the service, and run it before `pnpm dev`:

```json
"db:up": "docker compose up --detach --wait postgres"
```

### 2. Pass the connection URL to the server

A variable goes in four places:

1. `apps/server/.env.example`, with `localhost` as the host: `DATABASE_URL=postgres://bedrock:bedrock@localhost:5432/bedrock`. Copy it to your `.env`.
2. The schema in `apps/server/src/env.ts`, so a missing or malformed value stops the server at startup: `DATABASE_URL: v.pipe(v.string(), v.url())`.
3. The server's `environment` in `docker-compose.yml` (step 1).
4. `passThroughEnv` of the `dev` task in `turbo.json`. Turborepo drops variables it isn't told about.

### 3. Share the type and the input schema

The response type goes in `shared/types/src/note.ts`, and the input schema in `shared/schemas/src/create-note-body.ts`. Export both from their package's `src/index.ts`.

```ts
export interface Note {
  id: number;
  text: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}
```

```ts
export const createNoteBodySchema = v.object({
  text: v.pipe(v.string(), v.trim(), v.nonEmpty("Write something first."), v.maxLength(280)),
});
```

### 4. Write the route against an interface

`apps/server/src/routes/notes.ts` declares what it needs and takes it as an argument:

```ts
export interface NotesRepository {
  list(): Promise<Note[]>;
  create(text: string): Promise<Note>;
}

export function createNotesRoutes(notes: NotesRepository) {
  return new Hono()
    .get("/", async (c) => c.json(await notes.list(), 200))
    .post("/", validate("json", createNoteBodySchema), async (c) => {
      const { text } = c.req.valid("json");
      return c.json(await notes.create(text), 201);
    });
}
```

`createApp` takes the implementations as arguments. Keep `AppDeps` to interfaces: the web app typechecks this file.

```ts
export interface AppDeps {
  notes: NotesRepository;
}

export function createApp(deps: AppDeps) {
  return (
    new Hono()
      .basePath("/api")
      // …
      .route("/notes", createNotesRoutes(deps.notes))
  );
  // …
}
```

### 5. Implement it with the driver

Install the driver in the server only: `pnpm --filter @bedrock/server add postgres`.

`apps/server/src/db/notes-repository.ts` uses the driver's tagged templates (every `${value}` becomes a bound parameter) and converts rows to the shared type:

```ts
import type { Note } from "@bedrock/types";
import type postgres from "postgres";
import type { NotesRepository } from "../routes/notes";

interface NoteRow {
  id: number;
  text: string;
  created_at: Date;
}

const toNote = (row: NoteRow): Note => ({
  id: row.id,
  text: row.text,
  createdAt: row.created_at.toISOString(),
});

export function createPostgresNotesRepository(sql: postgres.Sql): NotesRepository {
  return {
    async list() {
      const rows = await sql<NoteRow[]>`SELECT id, text, created_at FROM notes ORDER BY id DESC`;
      return rows.map(toNote);
    },
    async create(text) {
      const [row] = await sql<NoteRow[]>`
        INSERT INTO notes (text) VALUES (${text}) RETURNING id, text, created_at
      `;
      if (!row) throw new Error("INSERT … RETURNING gave no row");
      return toNote(row);
    },
  };
}
```

`apps/server/src/index.ts` is the only file that creates the client:

```ts
const env = loadEnv(process.env);
const sql = postgres(env.DATABASE_URL);
const app = createApp({ notes: createPostgresNotesRepository(sql) });

// In the shutdown handler, close the pool after the server:
server.close(async () => {
  await sql.end();
  process.exit(0);
});
```

### 6. Test the route with a fake

Route tests pass an in-memory version of the interface, so `pnpm test` and CI don't need Postgres running. Once `createApp` takes `deps`, the existing tests pass one too.

```ts
function createFakeNotes(): NotesRepository {
  const notes: Note[] = [];
  return {
    async list() {
      return notes.toReversed();
    },
    async create(text) {
      const note = { id: notes.length + 1, text, createdAt: new Date().toISOString() };
      notes.push(note);
      return note;
    },
  };
}

const client = testClient(createApp({ notes: createFakeNotes() }));

it("creates a note", async () => {
  const response = await client.api.notes.$post({ json: { text: "  buy milk " } });
  expect(response.status).toBe(201);
});
```

To test `db/notes-repository.ts` itself against a real database, follow the rules in the Tests section of [CLAUDE.md](.claude/CLAUDE.md): read only seed data, and clean up anything you write. For CI, add a `postgres` entry under `services:` in the job in `ci.yml`.

### 7. Call it from the web app

One function per endpoint in `apps/web/src/lib/api-client.ts`. The paths and types come from the server's `AppType`, so they update on their own:

```ts
export function fetchNotes() {
  return parseResponse(client.api.notes.$get());
}

export function createNote(text: string) {
  return parseResponse(client.api.notes.$post({ json: { text } }));
}
```

A page then:

- reads in a memo, inside `<Errored>` and `<Loading>`, like `home-page.tsx`
- writes in an event handler, like `greetings-page.tsx`
- calls `refresh(notes)` after the write, to read the list again

```ts
const notes = createMemo(() => fetchNotes());

const submit = async (event: SubmitEvent) => {
  event.preventDefault();
  await createNote(text());
  refresh(notes);
};
```

Add the page to `router.ts` and a link in `root-layout.tsx`.

### Checklist

- [ ] `infra/<service>.yml` with a pinned image, a volume and a healthcheck, under `include:` in `docker-compose.yml`
- [ ] the server's `environment` and `depends_on` in `docker-compose.yml`
- [ ] the variable in `.env.example`, `env.ts` and `turbo.json`'s `passThroughEnv`
- [ ] shared type and schema in `shared/types` and `shared/schemas`
- [ ] the route declares an interface; `AppDeps` and `createApp(deps)` carry it
- [ ] the implementation in `db/` and the client created in `index.ts` (and closed on shutdown)
- [ ] route tests with a fake, existing tests updated for `createApp(deps)`
- [ ] a client function in `api-client.ts`, a page, a route and a nav link

### Other services

Redis, Kafka and the rest follow the same steps. What changes:

- **The interface.** Name it after what the route needs, not after the product: `SessionStore` or `RateLimiter` rather than `Redis`, and `EventPublisher` rather than `Kafka`. The route stays the same if the product changes.
- **Where the implementation lives.** Use a folder named for its role: `cache/` or `queue/`, next to `db/`.
- **Consumers.** Work that isn't a response to a request belongs outside `createApp`, such as a Kafka consumer or a scheduled job. Start it from `index.ts` with its own dependencies, or give it its own app under `apps/` if it should run and scale separately.

## Conventions

The conventions live in [.claude/CLAUDE.md](.claude/CLAUDE.md): kebab-case file names, yosegi-solid for UI, typed Hono RPC calls, Valibot validation, repositories for database access, and lowercase commits such as `feature(web): add settings page`.
