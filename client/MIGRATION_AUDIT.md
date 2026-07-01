# Frontend Audit & Migration Plan

## Current Snapshot

- Framework: React 18 + Vite
- Styling: Tailwind CSS v4 + DaisyUI v5
- State: Redux Toolkit + React Context
- Routing: React Router v6 with route-level `lazy()`
- API: Axios instance with refresh-token retry queue
- UI Status: no active Stitch UI, ShadCN UI, Radix UI, `cva`, `cmdk`, or `embla` usage in `src/`

## Folder Structure

```text
src/
├── api/
│   ├── axios.js
│   └── models/
├── app/
│   ├── providers/
│   └── router/
├── components/
│   └── ui/
├── context/
├── hooks/
├── layouts/
├── pages/
│   ├── analytics/
│   ├── audit/
│   ├── auth/
│   ├── customers/
│   ├── dashboard/
│   ├── integrations/
│   ├── inventory/
│   ├── menu/
│   ├── notifications/
│   ├── orders/
│   ├── outlets/
│   ├── payments/
│   ├── profile/
│   ├── restaurants/
│   ├── subscriptions/
│   ├── users/
│   └── website/
├── store/
└── utils/
```

## Component Hierarchy

- App shell: `src/App.jsx`
- Providers: Redux, theme, toast
- Layouts: auth, protected, dashboard
- Shared shell components: sidebar, topbar, UI primitives
- Feature pages: domain-oriented under `src/pages/*`

## Shared Components

- Navigation: `src/components/Sidebar.jsx`, `src/components/Topbar.jsx`
- UI primitives: `src/components/ui/*`
- Reusable display: `src/components/StatCard.jsx`

## Routes

- Auth: `/login`, `/register`
- Dashboard domains: `/dashboard`, `/orders`, `/notifications`, `/profile`
- Admin domains: restaurants, audit logs, subscriptions
- Owner/admin domains: users, outlets, analytics, payments
- Manager domains: menu, customers, integrations
- Public commerce: `/public/w/:outletSlug/*`

## State Management

- Redux slices:
  - `src/store/authSlice.js`
  - `src/store/orderSlice.js`
  - `src/store/notificationSlice.js`
- Context:
  - `src/context/ThemeContext.jsx`

## API Layer

- Shared client: `src/api/axios.js`
- Domain APIs grouped in `src/api/models/*.api.js`

## Performance Findings

- Positive:
  - Route-level lazy loading already exists.
  - Axios refresh queue avoids duplicate refresh calls.
  - Shared UI primitives reduce repeated markup.
- Bottlenecks:
  - `src/pages/integrations/DeveloperCockpit.jsx:1` is very large.
  - `src/pages/integrations/IntegrationsDashboard.jsx:1` is very large.
  - App routing, titles, and sidebar metadata were duplicated in multiple files.
  - Sidebar had no route-intent preloading.

## Duplicate / Dead Code Findings

- Duplicated page-title and navigation metadata existed across `src/App.jsx`, `src/layouts/DashboardLayout.jsx`, and `src/components/Sidebar.jsx`.
- Commented debug code existed in `src/store/notificationSlice.js:7`.
- Unused Stitch UI design artifacts were removed from the client workspace.

## Circular Dependency Check

- No circular dependency evidence found in the audited shell files.
- A deeper cycle scan can be added with tooling if you want a stricter check.

## Migration Plan

1. Centralize route metadata and lazy imports in `src/app/router/`.
2. Centralize providers in `src/app/providers/`.
3. Derive sidebar and page titles from one registry.
4. Add route-intent preloading on navigation hover/focus.
5. Incrementally move shared UI and domain logic into `shared/` and `modules/`.
6. Split very large integration pages into smaller widgets/services without changing behavior.
7. Add lint/build verification and remove any unused runtime artifacts once confirmed safe.

## Recommended Next Refactor Targets

- `src/pages/integrations/DeveloperCockpit.jsx:1`
- `src/pages/integrations/IntegrationsDashboard.jsx:1`
- `src/pages/users/UsersPage.jsx:1`
- `src/pages/orders/OrdersPage.jsx:1`

## Notes

- The project is currently JavaScript, not TypeScript.
- DaisyUI is already installed and integrated.
- Full React 19 / TypeScript migration should be a separate controlled phase to avoid changing runtime behavior during the architecture refactor.
