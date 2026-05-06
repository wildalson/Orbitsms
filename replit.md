# OrbitSMS

A full-stack SMS Gateway management platform for the Philippines (Chinese SMS aggregator style) with SMPP/HTTP channel management, SMS task sending, delivery records, billing, a professional dark-themed dashboard UI, and a full Super Admin panel for client management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/sms-gateway run dev` — run the frontend (port 22372, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

Demo credentials:
- Clients: `demo1`–`demo5` / `123456`
- Super Admin: `admin` / `admin123`

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
  - `auth.ts` — login, register, /auth/me, plus profile CRUD + OTP verification
  - `admin.ts` — admin endpoints including admin channels CRUD
- `artifacts/sms-gateway/src/` — React frontend
  - `pages/` — login, dashboard, tasks, create-task, task-detail, records, channels, billing, stats, workspaces
  - `pages/admin/` — admin-dashboard, admin-clients, admin-client-detail, admin-channels, admin-logs, admin-settings
  - `components/Layout.tsx` — client top nav with Workspace nav item, profile modal trigger, verification badges
  - `components/AdminLayout.tsx` — admin sidebar layout (Channels nav item added)
  - `components/ProfileModal.tsx` — 5-tab profile modal (Profile/Email/Mobile/Security/Connection)
  - `hooks/useAuth.tsx` — auth context with role (admin/client), localStorage token, updateUser()

## Architecture decisions

- Auth uses simple Base64 token: `userId:timestamp:randomHex`. Token stored in localStorage and attached via `setAuthTokenGetter` from `@workspace/api-client-react`.
- All mutations use `{ data: Body }` wrapper (Orval convention).
- React Query hooks take `(params, options)` — params first, options second.
- Admin routes at `/api/admin/*` are guarded by inline `requireAdmin()` that decodes Bearer token and checks `user.role === "admin"`.
- Admin frontend routes at `/admin/*` use `AdminRoute` component that checks `user.role === "admin"`.
- Profile routes at `/api/profile`, `/api/profile/send-otp`, `/api/profile/verify-otp` (in auth.ts router).
- OTP stored in-memory Map keyed `userId:type`, 10-min expiry. `devOtp` returned in API response for demo mode.
- App defaults to dark mode via `.dark` class on root container in Layout.tsx and AdminLayout.tsx.
- Channels table `productId` is now nullable — admin-created channels have no workspace assignment.

## Product

- Login/Register with demo seeded data; role-based redirect (admin → /admin, client → /)
- Dashboard with stats cards and traffic line chart per workspace (no fake verified badges)
- Workspace page: create/view/delete workspaces (SPID-based)
- SMS Tasks: list with "All Workspaces" filter, create, view detail with per-recipient delivery records
- SMS Records: filterable delivery history with Sender ID + SMS Content columns, real CSV export
- Channels: clients see read-only list; admin manages via admin panel (no operator/workspace in form)
- Billing: expense history with ₱ PHP balance display and CSV export
- **Profile Settings Modal** (accessible from user menu → Account Settings):
  - Profile tab: change display/company name
  - Email tab: change email, verify via OTP (devOtp shown in response for demo)
  - Mobile tab: PH number only (63XXXXXXXXXX), change + verify via OTP
  - Security tab: change password (current + new + confirm)
  - Connection tab: read-only SMPP/HTTP credentials set by admin
- **Admin Panel** (Super Admin only at `/admin`):
  - Dashboard: system-wide stats
  - Client Management: create, edit, suspend, delete + SMPP/HTTP connection config per client
  - Balance Adjustment: add or deduct ₱ balance per client
  - Permission Settings: per-client toggles
  - Channels: full CRUD (no operator/workspace field) — admin-managed shared infrastructure
  - SMS Logs: all delivery records with CSV export
  - System Settings: currency, default SMS rate, etc.

## User preferences

- Dark command-center theme with cyber cyan primary (`--primary: 180 100% 40%`)
- Professional look similar to Chinese SMS aggregator platforms
- Compact data-dense tables preferred
- Currency: PHP (₱) throughout all balance displays
- "Product" renamed to "Workspace" everywhere in UI
- Channel type defaults to "transmitter"
- Demo account section removed from login page (production-ready)
- Language switcher (EN / 中文) in top nav — persists to localStorage, translates nav items + user menu
- Workspace creation auto-generates SPID (no user input required)
- Sender ID is optional in Create Task (blank = use default)
- Excel/CSV upload in Create Task reads first column for phone numbers (xlsx library)
- Currency fixed to ₱ throughout Statistics page
- Admin Clients: connection status badge (Connected / Pending Setup) based on whether smppHost/httpApiKey is set
- Admin Clients: "Set Channel" (plug icon) action per client — modal with API Key (smppSystemId), API Secret (smppPassword), SMPP Host/Port, HTTP API Key
- Admin Settings: Provider/API Settings section removed

## Gotchas

- Do not run `pnpm dev` at workspace root — run individual artifact workflows instead
- Orval mutations wrap body in `{ data: ... }` — always pass `{ data: myBody }` to `mutateAsync`
- After codegen, index.ts is overwritten by the patch step — do not manually edit generated files
- Channels and records use `useListChannels(options?)` (no params) vs `useListRecords(params?, options?)`
- Admin pages use direct `fetch()` calls (not React Query hooks) since admin routes are not in the OpenAPI spec
- Profile routes are in `auth.ts` router (not a separate file) — registered under `/api/profile`
- OTP is returned as `devOtp` in API response for demo mode (production: wire up email/SMS service)
- SMPP connection fields per-client (smppHost, smppPort, smppSystemId, smppPassword, httpApiKey) are stored in users table and shown in admin client detail + client profile Connection tab

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the full API contract
