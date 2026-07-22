# nest-rms-learn

NestJS + Prisma restaurant management system (learning project).

## Quick start

```bash
pnpm install
pnpm run start:dev
```

Env: copy/use `.env.development` (see `src/config`). Requires Postgres + `DATABASE_URL`.

## Docs map

| Doc | For |
|-----|-----|
| [docs/README.md](docs/README.md) | New developers — start here |
| [docs/guidelines/](docs/guidelines/) | Coding conventions (grows over time) |
| [docs/architecture/](docs/architecture/) | App shape (grows over time) |
| [.cursor/rules/](.cursor/rules/) | Cursor agent rules |
| [.cursor/skills/](.cursor/skills/) | Cursor skills (e.g. create module) |

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm start:dev` | Watch mode (`NODE_ENV=development`) |
| `pnpm build` | Build + path alias rewrite |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | E2E tests |
| `pnpm lint` | ESLint |

## Stack

- NestJS 11
- Prisma 7 (PostgreSQL)
- `class-validator` / `class-transformer`
- Path aliases: `@/*` → `src/*`, `@generated/*` → `generated/*`
