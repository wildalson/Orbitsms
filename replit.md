# SMS Gateway

A full-stack SMS Gateway management platform (similar to Chinese SMS aggregator platforms) with SMPP/HTTP channel management, SMS task sending, delivery records, billing, and a professional dark-themed dashboard UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/sms-gateway run dev` — run the frontend (port 22372, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

Demo credentials: username `langdemo` / password `123456`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Wouter, React Query, Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — generated React Query hooks and types (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)
- `lib/db/src/schema/` — Drizzle schema: users, products, channels, tasks, message_records, billing_records
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/sms-gateway/src/` — React frontend
  - `pages/` — login, dashboard, tasks, create-task, task-detail, records, channels, billing
  - `components/Layout.tsx` — top nav with auth menu
  - `hooks/useAuth.tsx` — auth context with localStorage token

## Architecture decisions

- Auth uses simple Base64 token: `userId:timestamp:randomHex`. Token stored in localStorage and attached via `setAuthTokenGetter` from `@workspace/api-client-react`.
- All mutations use `{ data: Body }` wrapper (Orval convention).
- React Query hooks take `(params, options)` — params first, options second.
- The codegen script patches `lib/api-zod/src/index.ts` after orval to fix duplicate export conflict.
- App defaults to dark mode via `.dark` class on root container in Layout.tsx and login page.

## Product

- Login/Register with demo seeded data
- Dashboard with stats cards and traffic line chart per product
- SMS Tasks: list, create, view detail with per-recipient delivery records
- SMS Records: filterable delivery history with stats summary
- Channels: SMPP/HTTP channel management (CRUD modal)
- Billing: expense history with summary stats
- Top nav with product selector dropdown and user menu with balance display

## User preferences

- Dark command-center theme with cyber cyan primary (`--primary: 180 100% 40%`)
- Professional look similar to Chinese SMS aggregator platforms
- Compact data-dense tables preferred

## Gotchas

- Do not run `pnpm dev` at workspace root — run individual artifact workflows instead
- Orval mutations wrap body in `{ data: ... }` — always pass `{ data: myBody }` to `mutateAsync`
- After codegen, index.ts is overwritten by the patch step — do not manually edit generated files
- Channels and records use `useListChannels(options?)` (no params) vs `useListRecords(params?, options?)`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the full API contract
