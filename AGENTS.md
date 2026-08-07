# System Frontend 21 Agent Guide

## Scope

This guide applies to the Angular 21 system-administration frontend application under
`frontendApplications/system-frontend-21/`. It is the admin console for the backend's
`com.nexacore.systemmodule` — `accesscontrol`, `privilege`, `layout`, and `license` submodules
(`workflow` is out of scope for now — see `/home/zahmmed/.claude/plans/dreamy-swimming-bubble.md`
for the full implementation plan and phasing).

## Project Shape

- Angular 21 standalone application
- TypeScript with strict compiler and strict template checks
- Zoneless change detection
- RxJS reserved for asynchronous streams such as HTTP
- Transloco is provided for the shared layout shell
- Vitest is configured through the Angular 21 unit-test builder
- Playwright is configured for browser-level smoke tests
- Shared libraries are consumed from `../frontend-libs-21` as two `file:`
  dependencies: `@nexacore/platform` (API infra, layout shell, auth) and
  `@nexacore/shared` (reusable UI components) — identical to
  `kyc-frontend-21`'s setup, see that app's `AGENTS.md` for the general
  pattern this app follows.
- Application package: `nexacore-system-frontend-21`
- Dev server port: **5301** (kyc-frontend-21 owns 5300 — keep both running
  side by side without a port clash)
- `environment.clientCode` is `SYSTEM_ADMIN_WEB`, distinct from
  kyc-frontend-21's `WEB` — this app registers as its own backend client
  application so its nav tree/layout profile/privilege scoping can be
  managed independently of the KYC app.

Useful commands:

```bash
npm install
npm run build
npm test
npm run test:e2e
npm start
```

## Ownership Rules

- Keep this app's own pages (access-control, privilege, layout, license) and
  app-specific API endpoint definitions in this application.
- Keep reusable auth, API, layout, i18n, validation, and shared UI behavior in
  `../frontend-libs-21`.
- Prefer app-specific API endpoint definitions in
  `src/app/core/api/api-endpoints.ts` — note that login/session/privilege-context
  endpoints are already self-contained inside `@nexacore/platform`'s
  `AuthService`/`ApplicationContextService`; do not redeclare them here.
- Prefer app-specific API services in `src/app/core/services` when the service
  belongs only to this frontend.

## Shared Library Usage

Two packages, two import specifiers — pick the one matching the concern, do
not guess `@nexacore/platform` for everything:

- `@nexacore/platform` (`../frontend-libs-21/projects/platform`), organized
  internally by concern under `lib/<concern>/`:
  - `lib/auth/` for login, token handling, route guards
    (`authGuard`/`routePrivilegeGuard`), and `AuthorizedUiDirective`.
  - `lib/layout/` for the Angular 21 authenticated shell, header, rail
    navigation, mega panel, layout state, theme state, and direction state.
  - `lib/api-common/` for API response handling, JWT/language interceptors,
    response models, and notification abstraction.
- `@nexacore/shared` (`../frontend-libs-21/projects/shared`) for reusable
  form controls (`DynamicForm`, `DynamicWizard`), list/data composites
  (`DynamicList`, `DataTable`, `FilterBar`, `SearchToolbar`, `Pagination`,
  `ExportButton`), feedback primitives (`Pill`, `StatusBadge`, `Modal`,
  `ConfirmDialog`), and validation UI. This app is expected to be a heavy
  consumer of `DynamicListComponent`/`DynamicFormComponent`/
  `DynamicWizardComponent` — nearly every admin page here is a
  list-of-resource + create/edit-form pair, exactly the shape those
  components generalize (see `component-demo` in `kyc-frontend-21` for a
  live reference of each).
- If a new component is genuinely needed for this app and looks reusable
  beyond it, it belongs in `@nexacore/shared`, not duplicated here — follow
  the same Plan-Mode-first workflow used to build `DynamicForm`/
  `DynamicWizard`/`DynamicList` this session before adding one.

## Routing And Auth

- Keep public authentication routes sourced from `AUTH_ROUTES`.
- Keep authenticated app routes under the shared `LayoutComponent` route,
  protected by `authGuard` (canActivate) and `routePrivilegeGuard`
  (canActivateChild) — every admin-mutation route in this app maps to a
  `*_MANAGE` privilege code already seeded in the backend
  (`BootstrapAdministrationPrivileges`); every read/list route maps to the
  matching `*_VIEW` code. Do not invent new privilege codes on the frontend —
  they must already exist server-side.
- Do not rely on frontend route guards alone for authorization; backend APIs
  independently enforce the same `@PrivilegeApi` codes.
- Preserve the default redirect to `dashboard` unless changing the main user
  journey intentionally.
- The backend nav tree that drives this app's own sidebar must be seeded
  server-side (Flyway migration) for the `SYSTEM_ADMIN_WEB` client — see the
  "Backend prerequisite" note in the implementation plan. A route added here
  with no matching backend nav node will still work by direct URL, it just
  won't appear in the sidebar until the backend catches up.

## UI And Styling

- New shell work should follow `@nexacore/platform`'s existing `lib/layout/`
  shell components: custom SCSS tokens, CDK overlays, the shared SVG icon
  registry, and dense operational UI.
- Do not add Angular Material, Bootstrap, or Font Awesome anywhere in this
  app.
- Never use emoji in this app; use the shared icon registry via `<app-icon>`.
- Keep app-level translations under `src/assets/i18n`.
- Keep generated output such as `dist/`, `.angular/`, coverage, and
  `node_modules/` out of commits.

## Testing And Verification

- Run the narrowest meaningful check before completing frontend work:

```bash
npm run build
```

- Run `npm test` when changing services, guards, shared behavior, or component
  logic with meaningful branches.
- Run Playwright checks when changing shell interactions, routing, overlays,
  language selection, or responsive layout behavior.
- Live-verify against the real backend on port 5301 — every list/CRUD screen
  in this app talks to real `/api/v1/system/...` endpoints with no mock data
  path, unlike `kyc-frontend-21`'s `component-demo` page.
- If browser, dependency, network, or environment issues prevent a check, report
  the exact command and failure clearly.
