# Obrador en Línea

Premium bakery single‑page application for browsing products and managing next‑day pick‑up reservations. Built with Vite + React + TypeScript, Tailwind CSS, shadcn‑ui, and Supabase. Deployed on Netlify.

## Overview

Obrador en Línea lets customers create and manage bakery reservations, while admins can review, accept, or cancel them either individually or in batch. The app includes opinionated UX rules for when reservations can be created or canceled, and a daily stock reset workflow.

## Features

- Public marketing pages with compact header/hero spacing and responsive navbar
- Product browsing and next‑day reservation flow
- Authentication via Supabase (email/password) with email verification support
- Profiles with role: admin or customer
- Mis Reservas: list, filter, and cancel reservations (within policy window)
- Admin panel:
  - Per‑reservation Accept and Cancel actions
  - Multi‑select checkboxes with batch Accept/Cancel
  - Polished confirmation dialog summarizing affected reservations
- Daily stock reset (SQL + function scaffolding) and utilities
- Modern UI components via shadcn‑ui and Tailwind

## Tech stack

- Frontend: Vite, React 18, TypeScript
- UI: Tailwind CSS, shadcn‑ui (Radix), Lucide icons
- State/Data: TanStack Query
- Routing: react‑router‑dom
- Charts: Recharts (optional)
- Backend: Supabase (Auth, Database, REST)
- Deployment: Netlify

Key packages are defined in `package.json` (scripts: `dev`, `build`, `preview`, `lint`).

## Business rules

- New reservations can only be created for the next calendar day (tomorrow).
- Creating new reservations is disabled daily between 00:00 and 07:00 local time.
- A reservation can only be canceled by the customer within 24 hours of its creation.
- Admins can accept or cancel any reservation. Batch actions operate only on eligible selections and show a confirmation dialog first.

These rules are enforced in the UI and validated on the backend where applicable.

## Roles and permissions

- Visitor
  - Browse public pages and products
  - Register/Login to create reservations
- Customer
  - Create reservations for tomorrow (not between 00:00–07:00)
  - See “Mis Reservas”, filter by status, and cancel within 24h of creation
- Admin
  - View all reservations
  - Accept/Cancel per reservation
  - Select multiple reservations and run batch Accept/Cancel with confirmation

Admin role is inferred at profile creation using `VITE_ADMIN_EMAIL` or can be set in the `profiles` table.

## Reservation flow

- Customer flow
  1. Sign up or log in (email verification supported)
  2. Choose products and create a reservation for tomorrow (UI restricts date and time window)
  3. Manage reservations in “Mis Reservas” and cancel within 24h

- Admin flow
  1. Open Admin panel to review incoming reservations
  2. Accept/Cancel individually or select several and use batch actions
  3. A confirmation dialog displays selected vs. eligible counts and a preview before applying changes

Status values include canceled (`CANCELADO`) and picked up (`RETIRADO`) in filters; accepted/confirmed is handled via the admin actions.

## Pages and navigation

- `Index` – marketing home with hero
- `Productos` – featured products
- `Reservas` – create reservation (tomorrow only; disabled 00:00–07:00)
- `MisReservas` – list and cancel personal reservations (24h window)
- `Admin` – manage reservations with per‑item and batch actions
- `Login`, `Register`, `CheckEmail`, `AuthConfirm`, `ResetPasswordRequest`, `UpdatePassword`
- `NotFound` – fallback route
- `Debug` – internal diagnostics (dev only)

## UI and spacing guidelines

- All page headers/heroes are compact and sit flush with the navbar
- Removed extra `pt-24`, `pt-20`, negative margins, etc.; replaced with `py-2` in control areas when appropriate
- Navbar container uses `px-4 sm:px-6` for improved mobile alignment

See components under `src/components` and pages under `src/pages` for implementation.

## Getting started

Prerequisites
- Node.js 18+ (20+ recommended)
- A Supabase project (URL and anon key)

Environment variables (create `.env.local`)

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=http://localhost:5173
VITE_ADMIN_EMAIL=admin@obradorencinas.com
```

Install and run (Windows PowerShell shown)

```
npm install
npm run dev
```

Build and preview

```
npm run build
npm run preview
```

Lint

```
npm run lint
```

## Supabase setup

- Auth and profiles
  - The app stores user profiles in the `profiles` table and infers role at first login using `VITE_ADMIN_EMAIL` (can be adjusted manually later).
- Database and functions
  - SQL migrations and function setup live under `supabase/migrations` and `supabase/functions/`
  - Daily stock reset: see `supabase/functions/daily-stock-reset` and SQL in the migrations
  - Additional helpers: check the root SQL files such as `EXECUTE_IN_SUPABASE_DASHBOARD.sql` and `APPLY_CANTIDAD_INICIAL_CHANGES.sql`

Refer to:
- `DAILY_STOCK_RESET_SETUP.md`
- `RESUMEN_ACTUALIZACION_STOCK.md`
- `DEBUG_ACCESS_GUIDE.md`

## Deployment (Netlify)

- Netlify config is in `netlify.toml` and redirects under `public/_redirects`
- Set the same environment variables used locally in your Netlify site
- Build command: `npm run build`
- Publish directory: `dist`

See `NETLIFY_DEPLOY.md` and `PRODUCTION_TESTING_GUIDE.md` for detailed steps.

## Project structure (high level)

```
src/
  components/
  contexts/
  hooks/
  integrations/
    supabase/
  lib/
  pages/
  types/
public/
supabase/
```

Notable files
- `src/contexts/AuthContext.tsx` – auth/session and role logic
- `src/pages/Reservas.tsx` – next‑day and time window logic for creation
- `src/pages/MisReservas.tsx` – 24h cancel policy and filters (`CANCELADO`, `RETIRADO`)
- `src/pages/Admin.tsx` – per‑reservation actions, multi‑select batch with AlertDialog
- `src/components/layout/Navbar.tsx` – mobile alignment and spacing

## Debugging and maintenance

- `Debug` page and `src/components/dev/DebugOverlay.tsx` help validate runtime config
- Utilities and guides:
  - `FIX_LOCALSTORAGE_CORRUPTION.md`
  - `DEBUG_ACCESS_GUIDE.md`
  - `PRODUCTION_TESTING_GUIDE.md`

## Roadmap / TODO

- Visual QA across breakpoints for header/hero consistency
- Optional: server‑side hard enforcement for reservation date/time rules

## License

Copyright © Obrador en Línea. All rights reserved.
