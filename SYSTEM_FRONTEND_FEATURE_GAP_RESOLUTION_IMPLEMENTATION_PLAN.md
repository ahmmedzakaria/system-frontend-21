# System Frontend 21 Feature Gap Resolution Implementation Plan

**Plan date:** 2026-08-14  
**Source analysis:** `SYSTEM_FRONTEND_FEATURE_IMPLEMENTATION_GAP_ANALYSIS.md`  
**Applications:** `system-frontend-21`, `frontend-libs-21`, and the supporting backend contracts  
**Security baseline:** access control defaults to `ENFORCE`; the backend remains authoritative

## 1. Objective

Resolve the production-safety and feature-completeness gaps identified in the system frontend audit without weakening tenant isolation, client/API enforcement, privilege composition, or object-level authorization.

The implementation must produce an administration console in which:

- each route and API family is loaded only for users with its exact effective privilege;
- every full-replacement workflow loads authoritative state before saving;
- authorization revocation updates mounted UI without logout;
- loading, empty, denied, unavailable, rate-limited, and failed states are distinct;
- high-impact operations are confirmed, non-duplicating, auditable, and traceable;
- `SYSTEM_ADMIN_WEB` grants and policies are verified automatically under `ENFORCE`;
- app-owned unit, component, integration, and authenticated browser tests enforce the contract.

## 2. Governing invariants

1. Never treat route guards or hidden buttons as backend authorization.
2. Never derive tenant/business/branch authority from a form, URL, JWT decoding, person membership, or local storage.
3. Use the live `ApplicationContextService` effective tenant/scopes and server-delivered route/UI policies.
4. A full replacement may execute only from a successfully loaded authoritative snapshot.
5. A failed read must never degrade into an empty replacement.
6. A tenant scope may cover authorized descendants; a business scope may cover its branches; a branch scope must not widen itself.
7. Direct-ID reads and writes must include scope in repository predicates and fail closed.
8. New protected endpoints require API metadata, client API/feature/tenant grants, privilege composition, and coverage tests.
9. Browser clients carry a public client code only. No confidential secret may enter an Angular bundle.
10. Do not edit deployed Flyway migrations. Add the next available migration and keep fresh-install seeding equivalent.

## 3. Scope and explicit deferrals

### In scope

- Cross-cutting reactive authorization and error/loading presentation.
- User/Role privilege separation and safe assignment replacement.
- Client and user hierarchical scope lookups.
- API Registry safety and privilege impact visibility.
- Tenant detail/domain administration.
- Layout policy and navigation integrity.
- License entitlement lifecycle and key revocation.
- Backup detail, polling, delivery visibility, and recovery evidence.
- Dashboard navigation and privilege-aware operational summaries.
- Complete app-owned automated authorization gates.

### Deferred until separately approved contracts exist

- Executing a database restore from the browser.
- Editing workflow decisions without a finalized subject/action authorization contract.
- Client-side license activation/validation flows that belong to consuming applications.
- Arbitrary cross-tenant switching through headers or local state.
- Destructive deletion of users, roles, privileges, tenants, layouts, or license records.

## 4. Target architecture

```text
ApplicationContextService (live server context)
  -> AuthorizationPolicyService
       -> routePrivilegeGuard
       -> AuthorizedUiDirective
       -> reactive page decisions and action columns
  -> Effective tenant/scope presentation

Domain page
  -> app-owned typed service
  -> authoritative read state
  -> safe editor/replacement state
  -> confirmation + change summary
  -> mutation with duplicate-submit prevention
  -> context/domain refresh
  -> stable denial/error/trace presentation

Backend
  -> trusted hostname tenant resolution
  -> client/API/feature/tenant intersection
  -> user privilege and scope intersection
  -> scoped repository predicate
  -> audit event and authorization trace
```

Common state and visual primitives remain in `frontend-libs-21`. Domain endpoints, DTOs, page orchestration, and system-specific action codes remain in `system-frontend-21`.

## 5. Phase 0 — Baseline and contract inventory

**Status: Implemented on 2026-08-14.** The typed feature inventory, frontend inventory tests, backend metadata contract, V49 migration fixture, startup route/UI policy reconciliation, and module-reference reconciliation are in place. The inventory now uses stable semantic policy keys rather than duplicating backend-owned numeric privilege codes. Runtime route and action decisions remain dynamic: the authenticated application context supplies `routePolicies`, `uiPolicies`, current privilege codes, and `authorizationVersion`; missing policies fail closed.

Baseline recorded on 2026-08-14:

- `npm test`: 3 files and 7 tests passed;
- `npm run build`: passed, with the existing initial-bundle budget warning (553.31 kB against 500 kB);
- focused backend authorization/metadata suite: 18 tests passed;
- `SystemDatabaseMigrationTest`: compiled and completed with all 4 cases skipped because no Docker environment was available. The V49 grant assertion still requires execution in a Docker-enabled CI or developer environment.

### Deliverables

1. Freeze an inventory of every system frontend route, action code, endpoint, backend privilege, data scope, and required client grant.
2. Add a machine-readable app contract in the system frontend, for example:

```ts
interface SystemFeatureContract {
  feature: string;
  routes: Record<string, SystemPolicyKey>;
  actions: Record<string, SystemPolicyKey>;
  endpoints: Array<{ endpoint: SystemApiEndpointKey; policy: SystemPolicyKey | 'AUTHENTICATED' }>;
}
```

Numeric privilege codes are intentionally excluded from this frontend contract. Route paths and UI action codes are stable frontend/backend integration keys; the backend policy catalog resolves them to the active privilege set. Endpoint policy keys are diagnostic inventory only—the API registry and backend filter chain remain authoritative for API authorization.

3. Add a backend `SYSTEM_ADMIN_WEB` contract test that verifies:
   - the client is active and browser-compatible;
   - required lifecycle and feature API grants exist;
   - tenant assignment exists;
   - all protected route/UI policies resolve to active privileges;
   - no policy references an unknown action or privilege.
4. Reconcile `MODULES.md` with the actual route and endpoint inventory.
5. Record the current passing build/test baseline before behavior changes.

### Backend work

- Add a test fixture or migration-test dataset that contains annotation-synchronized API rows before asserting client grants.
- Add deterministic reconciliation for navigation/policies whose prior migrations may have run before privilege rows existed.
- Preserve V49 as the narrow session-lifecycle grant; add new migrations by feature family.

### Gate

The inventory test fails when a protected frontend endpoint, route policy, UI policy, or required grant is missing.

## 6. Phase 1 — Shared administration safety primitives

**Status: Implemented on 2026-08-14.** Platform now exposes normalized authorization failures, reactive decisions, revocation coordination, single-flight mutation execution, and optional context refresh without mutation replay. Shared now exposes fail-closed resource and mutation state, version-aware replacement summaries, grouped searchable assignments, accessible retry/trace feedback, and application-owned authorized hierarchy adapters.

Verification baseline: platform 34 tests and shared 29 tests pass; both Angular packages build successfully. Source inspection confirms `platform` has no dependency on the `@nexacore/shared` package.

### `frontend-libs-21/platform`

Add or complete:

- a typed `AuthorizationFailure` model carrying HTTP status, stable code, message, trace ID, retry-after, and recoverability;
- a reactive decision API suitable for computed signals;
- a page-level authorization revocation coordinator that can close unsafe open editors;
- mutation-state helpers that never retry POST/PUT/PATCH/DELETE automatically;
- optional authorization-context refresh after privilege/scope denial without replaying the mutation.

### `frontend-libs-21/shared`

Add or extend:

- `ResourceLoadState<T>` with `idle/loading/loaded/empty/denied/failed` states;
- `MutationState` with pending and duplicate-submit prevention;
- replacement confirmation that shows additions/removals and supports version metadata;
- searchable/grouped assignment checklist for large privilege/API sets;
- accessible error panel with trace ID and retry action;
- authorized hierarchical lookup/selector adapters without system-domain endpoints.

### Gate

- `platform` does not import `shared`.
- Unit tests prove failed reads cannot enable replacement saves.
- Unit tests prove revocation changes computed decisions and closes mutation state.
- Stable denial codes and `Retry-After` survive normalization.

## 7. Phase 2 — Split User and Role Administration

**Status: Implemented on 2026-08-14.** User and Role Administration now have independent routes, components, live policies, and navigation. Direct user/role and assignment reads are tenant-scoped; user-role and role-privilege replacements carry deterministic version tokens and reject stale writes. Replacement editors use shared fail-closed state/change summaries, load supporting catalogs only after their exact privileges are effective, and close when authorization is revoked. V50 seeds Role routes/navigation, `roles.manage`, and exact client API grants for the four authoritative reads.

Verification baseline: system frontend 7 tests and production build pass; focused backend metadata, versioning, and scoped-object tests pass. The four PostgreSQL migration tests compile but remain skipped locally because Docker is unavailable, so V50 execution must still run in Docker-enabled CI.

### Routing and UI ownership

Replace the mixed screen with:

- `/access-control/users` — user list, create/edit, roles, scopes;
- `/access-control/roles` — global templates and tenant roles;
- `/access-control/roles/:id/privileges` — role privilege assignment and usage.

Use separate route policies:

- User route: `USER_ADMINISTRATION_VIEW`.
- Role route/detail: `ROLE_ADMINISTRATION_VIEW`.
- User mutations: `users.manage` and `users.assign`.
- Role mutations: new `roles.manage` action policy.
- Role privilege replacement: exact privilege-catalog assignment policy plus role-management requirements.
- Global-template mutations: `ROLE_SYSTEM_ADMIN` and the role-management privilege.

### Backend contracts

Add authoritative reads:

```text
POST /api/v1/system/user/detail
POST /api/v1/system/user/role-assignments
POST /api/v1/system/role/detail
POST /api/v1/system/role/privilege-assignments
```

Return assignment version tokens on reads and require them on replacements where concurrent administration is possible:

```ts
interface VersionedAssignment<T> {
  version: string;
  items: T[];
}
```

Use scoped direct-ID repository predicates. Reject unknown, inactive, cross-tenant, or stale assignments.

### Frontend changes

- Move role logic out of `UserListComponent`.
- Load supporting APIs only when the exact view privilege is effective.
- Use `ReplacementSelectionState` for user roles and role privileges.
- Replace native `confirm()` with shared confirmation/change summary.
- Make columns, tabs, and buttons computed from live policies.
- Close editors immediately when a required privilege is revoked.
- Add distinct load/error state per tab and modal.

### Migration/seeding

- Seed `/access-control/roles` and parameterized role-detail route policies.
- Seed `roles.manage` and role-privilege assignment UI policies.
- Grant the new read endpoints to `SYSTEM_ADMIN_WEB` without broad wildcard permissions.
- Update the navigation feature for separate Users and Roles entries.

### Gate

- A user-view-only account never calls role or privilege APIs.
- A role-view-only account cannot create/edit roles.
- Failed role/privilege reads cannot produce empty replacements.
- Cross-tenant user/role IDs fail closed.
- Active-session revocation removes actions without navigation.

## 8. Phase 3 — Authoritative hierarchical scope administration

Status: **Implemented (2026-08-14)**.

Current implementation:

- System migration `V51__add_authoritative_scope_hierarchy.sql` introduces audited tenant-owned business and branch catalogs with database-enforced tenant/business parent relationships, supporting indexes, and SYSTEM_ADMIN_WEB grants for the three lookup APIs.
- `AuthorizedScopeLookupService` and the tenant controller expose effective-scope-filtered tenant, business, and branch choices. Tenant authority expands to descendants; business and branch authority remains bounded and sibling access fails closed.
- Client and user assignment reads return deterministic `AssignmentVersion` values. Replacements require the version at the HTTP boundary, reject stale writes, duplicates, inactive tuples, invalid parents, and unauthorized additions.
- Existing assignments outside the administrator's effective authority remain in the replacement payload as locked diagnostic rows and cannot be removed through a narrower session.
- User and Client Administration use the shared `HierarchicalScopeSelectorComponent`; parent changes clear dependent IDs, labels include display names and IDs, and only normalized IDs are submitted.
- License subscription ownership reuses the same authorized selector at its supported tenant/business depth; branch ownership is deliberately unavailable because it is not part of the license subscription backend contract.
- `AuthorizedScopeLookupServiceTest`, API-contract checks, and the system migration fixture cover tenant expansion, business/branch restriction, sibling denial, invalid parents, endpoint discovery, and client grants.

### Backend contracts

Provide authorized lookup endpoints or reuse existing protected tenant control-plane contracts:

```text
POST /api/v1/system/tenants/authorized
POST /api/v1/system/tenants/businesses
POST /api/v1/system/tenants/branches
```

Every lookup must be restricted by the caller's effective scope. A tenant-level assignment may return descendants; business and branch callers receive only covered descendants.

Normalize client and user replacements to:

```ts
interface ScopeAssignment {
  tenantId: number;
  businessId: number | null;
  branchId: number | null;
  active: true;
}
```

Validate duplicates and parent-child relationships server-side.

### Frontend changes

- Replace derived/manual scope choices in Client and User Administration with the shared hierarchical selector.
- Clear business when tenant changes and branch when business changes.
- Display names plus IDs; submit IDs only.
- Keep current out-of-authority assignments visible as locked diagnostic rows, never editable choices.
- Add load-before-replace, change summary, and concurrency version.
- Reuse authorized owner selection in License Administration.

### Gate

- Tenant, business, branch, sibling-branch, and invalid-parent tests pass.
- No caller-controlled header or local selection widens authority.
- Client/user/license owner forms share one structural tuple contract.

## 9. Phase 4 — Reactive authorization and consistent page state

Status: **Implemented (2026-08-14)**.

Current implementation:

- The shared `DynamicListComponent` now owns an explicit `ResourceLoadState` and renders loading, empty, denied, and failed outcomes consistently. Denials retain their stable backend code and `X-Trace-Id`; failed reads expose an explicit retry that replays only the read.
- `PageOperationService` normalizes authorization and non-authorization API failures for page-level editors, replacements, lifecycle actions, and downloads without retrying rejected mutations.
- `MutationState` now retains stable error code and trace metadata in addition to its pending/succeeded/failed/revoked lifecycle. Its `begin()` guard prevents duplicate submissions.
- User Administration conditionally loads only with its effective view privilege, uses structured initial-read/editor/replacement failures, and closes editors or assignment dialogs when live authorization is revoked.
- Tenant Administration uses computed live action decisions and computed action columns. Registration and lifecycle editors close on revocation, and registration, verification, and lifecycle mutations are guarded by one pending state.
- Backup Administration uses computed execute/download decisions and action columns. Backup execution and binary download have independent pending guards and preserve API code and trace information on failure.
- API Registry synchronization and editing are guarded mutations; its editor closes when manage authorization is revoked and errors remain supportable.
- Client Applications, API Registry, Privilege Catalog, Tenants, Layout Profiles/Policies, Navigation Tree, License Administration, and Backup Administration inherit the shared list-state behavior. Dashboard currently has no remote initial read to classify.
- License and Layout supporting client-application lookups execute only when the effective context includes Client Application view access.
- Shared component tests cover denial rendering with a stable code and trace. System frontend tests cover all stable authorization denial classes plus structured non-denial replacement conflicts.

Apply the Phase 1 primitives across all pages:

- Client Applications
- API Registry
- Privilege Catalog
- Users
- Roles
- Tenants
- Layout Profiles/Policies
- Navigation Tree
- License Administration
- Backup Administration
- Dashboard

### Required behavior

- Permission decisions and action columns are computed signals.
- Supporting data loads are conditional on effective view privileges.
- Every initial read distinguishes loading/empty/denied/failed.
- Every mutation exposes pending state and disables duplicate submission.
- Every error preserves stable code and trace ID.
- A privilege/scope denial refreshes context once but does not replay mutation requests.
- Revocation closes unauthorized editors and removes actions.

### Gate

Component tests cover revocation and all stable denial classes on representative list, editor, replacement, and binary-download pages.

## 10. Phase 5 — API Registry and Privilege Catalog safety

Status: **Implemented (2026-08-14)**.

Current implementation:

- API Registry synchronization is now a two-step `sync/preview` → `sync/apply` protocol. Preview returns added, changed, deactivated, and conflicted records, structured conflict candidates/reasons, and a deterministic preview version.
- Apply recomputes the preview, rejects stale versions, and refuses to activate any synchronization while ambiguous mappings remain. The legacy `/sync` route is non-mutating and returns the preview.
- API registry rows use JPA optimistic versions backed by system migration `V52__add_api_registry_optimistic_version.sql`; stale manual saves fail instead of overwriting current metadata.
- Registry save requires recent step-up authentication. The frontend explicitly confirms changes to public, client-authentication, user-authorization, or data-scope metadata and sends the step-up marker; the backend also validates token age.
- API Registry and live inventory have server-side searchable, paged endpoints and the system frontend loaders use them directly.
- Privilege impact reports active role, direct-user, client, API-route, route-policy, UI-policy, navigation-feature, and license-entitlement dependencies with a deterministic version.
- Safe privilege deactivation requires that exact impact version and an explicit `dependenciesPresented` confirmation. Ordinary privilege save no longer exposes active-state deactivation.
- Privilege creation/editing composes and validates the 11-digit `2+2+2+3+2` code, blocks client-visible collisions, and the backend independently rejects collisions rather than updating another privilege implicitly.
- The Privilege Catalog provides an impact drawer and a destructive confirmation containing every dependency category. No hard-delete path is exposed.
- Privilege Catalog search is server paged. V52 conditionally grants every new Phase 5 endpoint to `SYSTEM_ADMIN_WEB`, and API metadata coverage includes the new contracts.

### API Registry

Backend additions:

- dry-run synchronization/diff endpoint;
- conflict detail with candidate handlers and matching reasons;
- versioned save or optimistic-lock field;
- paged/searchable registry and inventory endpoints.

Frontend additions:

- preview added/changed/deactivated/conflicted records before apply;
- guided conflict resolution without allowing ambiguous protected routes;
- step-up confirmation for changes to public/authentication/authorization/data-scope metadata;
- structured sync/save errors and trace display.

### Privilege Catalog

Backend additions:

- privilege usage/impact endpoint covering roles, clients, routes, UI policies, navigation features, and license entitlements;
- safe deactivate endpoint with version and dependency response;
- paged/searchable catalog.

Frontend additions:

- dependency/impact drawer;
- code-composition preview and collision validation;
- explicit deactivation confirmation showing affected access paths;
- no hard deletion.

### Gate

- Ambiguous registry mappings cannot be activated.
- Deactivation cannot proceed without presenting active dependencies.
- Metadata and privilege coverage tests pass after synchronization.

## 11. Phase 6 — Layout and navigation integrity

### Backend changes

- Include client identity and version in UI policy DTOs.
- Make UI policy privilege links versioned full replacements.
- Change feature privilege synchronization from append-only to deterministic replacement with uniqueness enforced in the database.
- Add navigation integrity diagnostics for invalid parents, duplicates, orphan nodes, routes, and privilege references.
- Preserve existing reorder endpoint and audit mutations.

### Frontend changes

- Replace comma-separated privilege codes with searchable validated assignments.
- Show change summary before policy/feature privilege replacement.
- Add client/user effective-navigation preview.
- Add route-policy comparison and unknown-route warnings.
- Add accessible reorder controls; drag/drop is optional if keyboard move-up/down controls exist.
- Add profile preview before assignment.

### Data migration

- Add a new Flyway migration that removes duplicate feature-privilege links and creates the necessary uniqueness constraint.
- Do not reinterpret earlier layout migrations.

### Gate

- Repeated saves do not create duplicates.
- Removing a privilege produces a real removal.
- Effective navigation preview matches the backend pruned tree.
- Invalid hierarchy and unknown policy references fail closed.

## 12. Phase 7 — Tenant administration completion

### Backend additions

- scoped tenant detail;
- domain list/add/verify/set-primary/deactivate;
- tenant assignment summary for clients, users, layouts, licenses, and branding;
- lifecycle history and platform audit events;
- step-up challenge requirement for suspend/cancel and sensitive domain changes.

### Frontend additions

- direct tenant detail route;
- domain management panel;
- assignment and audit summaries;
- state-aware lifecycle actions that are hidden/disabled when invalid;
- loading/error state and duplicate-submit prevention;
- step-up flow before high-impact transitions.

### Gate

- Direct cross-tenant IDs fail closed.
- Invalid lifecycle transitions cannot be invoked from UI or API.
- Domain ownership and primary-domain invariants are tested.
- Lifecycle reasons and actor identity appear in audit history.

## 13. Phase 8 — License administration completion

### Backend additions

- versioned entitlement detail/update/deactivate contracts;
- license key revoke endpoint with reason and audit event;
- usage snapshot and license audit list endpoints;
- expiry/renewal summary endpoint;
- paged plans/subscriptions/keys/entitlements.

### Frontend additions

- conditionally render entitlement targets by entitlement type;
- validate exactly one compatible target;
- edit/deactivate entitlement flow with dependency preview;
- key revocation confirmation and status refresh;
- usage, limit consumption, audit, expiry, and renewal views;
- authorized hierarchical owner selector.

Activation and validation stay outside the administration console except for read-only diagnostic history.

### Gate

- Invalid target combinations are rejected client- and server-side.
- Raw license keys are never returned after initial generation.
- Revocation is immediate, audited, and covered by decision-service tests.

## 14. Phase 9 — Backup operations and recovery evidence

### Backend additions

- expose safe job detail and sanitized failure diagnostics;
- job status polling or event stream;
- retry-delivery endpoint and delivery history;
- retention/storage configuration read endpoints, with writes added only if safe operational ownership is defined;
- restore-verification records produced by an isolated automated process;
- checksum and off-host replication status.

Do not expose a general browser-triggered production restore. Any future restore request requires step-up authentication, four-eyes approval, immutable audit, and a separately reviewed recovery design.

### Frontend additions

- job detail route/drawer;
- bounded polling for queued/running jobs with teardown;
- delivery retry/history gated by `backup.deliver`;
- configuration and recovery-readiness status gated by `backup.manage`;
- restore verification and replication evidence views;
- tested blob URL creation/revocation and missing-artifact errors.

### Gate

- Partial/failed/configuration-disabled jobs are distinguishable.
- Polling stops after terminal state or component destruction.
- Download and delivery denials preserve stable code and trace ID.
- Recovery evidence is read-only and cannot be forged by browser input.

## 15. Phase 10 — Privilege-aware dashboard and diagnostics

### Backend

Add a single scoped aggregate endpoint instead of loading every administration list. Include only authorized metrics such as:

- active clients;
- unresolved API metadata conflicts;
- pending tenant onboarding;
- licenses nearing expiry;
- failed/running backups;
- enforcement mode and registry synchronization freshness where safe to expose.

### Frontend

- Hide cards without their view privilege.
- Make visible cards keyboard-accessible links.
- Display loading/error states without leaking inaccessible counts.
- Add actionable warnings linked to authorized destinations.

### Gate

The dashboard makes one aggregate request, reveals no unauthorized module existence/counts, and never becomes an authorization source.

## 16. Phase 11 — Audit and user-session administration

### Backend contracts

- paged authorization/platform audit events with scoped filters;
- active user sessions by tenant/account;
- revoke one session and revoke all sessions for an account;
- forced password-reset/lock/unlock contracts if consistent with the selected local/SSO authentication mode;
- step-up authentication for session/account security changes.

### Frontend

- audit-event viewer with trace correlation;
- user detail security panel;
- active-session list and revocation confirmation;
- authentication-mode-aware controls (do not offer local password actions for externally managed SSO identities).

### Gate

- Session revocation is effective on the next request.
- Cross-tenant sessions are never listed or mutable.
- Sensitive audit fields are redacted and export is privilege-gated.

## 17. Phase 12 — Scalability, accessibility, and operational polish

- Convert large collections to server paging/filtering/sorting.
- Virtualize large API/privilege assignment lists where needed.
- Add focus trap/return tests for every modal and confirmation.
- Ensure keyboard-only selection and reordering.
- Announce errors, pending operations, and successful saves accessibly.
- Replace raw IDs with resolved labels while retaining IDs for support context.
- Add translations for all new stable UI text.
- Enforce bundle and component-style budgets rather than accepting indefinite growth.

### Gate

Accessibility checks, production build budgets, and representative large-dataset tests pass.

## 18. Automated verification strategy

### Shared libraries

- authorization decision reactivity;
- revocation/editor-close behavior;
- typed denial and retry-after normalization;
- replacement version/load/failure invariants;
- hierarchical selector validation;
- accessibility behavior of shared state/confirmation controls;
- `platform -> shared` dependency prohibition.

### System frontend unit/component tests

For each feature:

- exact endpoint and request DTO serialization;
- view/manage/specialized action visibility;
- conditional supporting API loads;
- initial read and mutation failures;
- duplicate-submit prevention;
- context refresh after successful authorization mutation;
- revocation while mounted;
- direct-route initialization.

### Backend tests

- API metadata coverage;
- `SYSTEM_ADMIN_WEB` required-grant contract;
- route/UI policy referential integrity;
- filter-chain decisions under `ENFORCE`;
- tenant/business/branch and cross-tenant direct-ID denial;
- optimistic concurrency for replacements;
- object authorization for tenant, layout, license, backup, audit, and sessions;
- Flyway fresh-install and upgrade paths.

### Authenticated Playwright matrix

Run against seeded backend identities:

| Identity | Expected behavior |
|---|---|
| Unauthenticated | Redirect to login; render no protected data |
| VIEW-only | View permitted lists/details; no mutation controls or mutation API calls |
| Specialized action | See and execute only the granted specialized action |
| Tenant admin | Operate only within effective tenant and descendants |
| Branch admin | Cannot widen to business/tenant or sibling branch |
| Full system admin | Complete authorized workflows |
| Revoked active session | Next request denied and mounted UI updates after context refresh |

## 19. CI/CD enforcement gate

Required pipeline order:

```bash
cd frontendApplications/frontend-libs-21
npx ng build platform
npx ng build shared
npm test -- --watch=false

cd ../system-frontend-21
npm test
npm run build
npm run test:e2e

cd ../../backend
mvn test
```

Deployment promotion additionally requires:

- Flyway migrations successful with no checksum drift;
- API registry synchronization has zero unresolved conflicts;
- `SYSTEM_ADMIN_WEB` contract verification passes;
- registered tenant hostname resolves correctly;
- enforcement mode is `ENFORCE`;
- authenticated browser smoke matrix passes in the target environment;
- no confidential client secret exists in browser bundles;
- rollback is configuration/data safe and does not require disabling enforcement.

## 20. Delivery and migration rules

1. Deliver each phase as a vertically complete frontend/backend/test slice.
2. Add migrations using the next unused system migration version at implementation time; do not reserve version numbers in this plan.
3. Keep migrations idempotent where possible and preserve audit columns.
4. Mirror upgraded-database grants with fresh-install synchronization/seeding.
5. Add route/UI policies and API/client grants in the same release as the feature that consumes them.
6. Do not enable a control before its authoritative read and backend authorization contract exist.
7. Preserve existing user changes and nested repository boundaries.
8. Update `MODULES.md`, the gap analysis status, and the cross-frontend architecture plan after each completed phase.

## 21. Completion checklist

- [x] Machine-readable semantic feature contract and `SYSTEM_ADMIN_WEB` grant test exist; numeric privilege resolution remains backend-owned.
- [ ] User and Role Administration are privilege-separated.
- [ ] All replacement workflows enforce authoritative load-before-save and version checks.
- [ ] Hierarchical scopes use authorized dependent lookups.
- [ ] All page authorization decisions are reactive.
- [ ] All reads distinguish empty from denied/failed.
- [ ] All mutations prevent duplicates and preserve stable errors/trace IDs.
- [ ] API registry supports safe diff/conflict workflows.
- [ ] Privilege deactivation shows dependency impact.
- [ ] Layout/navigation privilege links are deterministic and deduplicated.
- [ ] Tenant domain/detail/lifecycle workflows are complete and audited.
- [ ] License entitlements and key revocation are manageable and audited.
- [ ] Backup detail, polling, delivery, and recovery evidence are available.
- [ ] Dashboard is privilege-aware and operationally useful.
- [ ] Audit and session revocation administration are implemented.
- [ ] Server paging and accessibility gates pass.
- [ ] Unit, component, backend, and authenticated Playwright matrices pass under `ENFORCE`.
