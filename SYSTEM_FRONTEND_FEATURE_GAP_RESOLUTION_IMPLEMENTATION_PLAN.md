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

**Status: Implemented on 2026-08-14.** UI policies now expose client identity, active state, and optimistic version. UI-policy and navigation-feature privilege links are validated full replacements: empty selections remove existing links and stale edits fail. `V55__version_and_deduplicate_layout_policy_links.sql` adds policy/feature versions, removes historical feature-link duplicates, and enforces `(layout_feature_id, privilege_id)` uniqueness.

The backend navigation tree now intersects user privileges with the selected active client's feature grants before pruning. Administrative preview accepts an explicit client/user pair and uses that same backend tree builder. Integrity diagnostics report active children beneath inactive parents, duplicate codes/routes, active feature routes without route policies, and active links to inactive privileges. Active feature writes reject unknown route policies and duplicate active routes; active child writes reject inactive parents. Category reorder remains audited and now rejects duplicates, unknown categories, and cross-parent batches.

The system frontend uses searchable catalog-backed privilege checklists for UI policies and navigation features, shows additions/removals/unchanged assignments and versions before save, provides effective-navigation preview and integrity warnings, exposes accessible move-up/down category controls, and previews the selected layout profile before client assignment.

Verification on 2026-08-14:

- system frontend: 4 files and 13 tests passed;
- system frontend production build passed with the pre-existing initial bundle budget warning (554.96 kB against 500 kB);
- `LayoutUiPolicyServiceImplTest`: 3 tests passed, including empty full-replacement removal;
- backend compilation passed;
- V55 executed successfully inside a rollback-only `system_db` transaction.

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

**Status:** Implemented (2026-08-14)

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

### Current implementation

- `TenantAdministrationController` and `TenantAdministrationService` now expose a tenant-scoped detail contract, domain mutation contracts, assignment counts, and the latest platform-administration audit events.
- Domain mutation resolves the domain through both domain ID and tenant ID. A primary domain must be active and verified, cannot be deactivated, and setting a new primary clears the previous primary atomically.
- Lifecycle mutations require the caller's current tenant version and reject stale writes before applying the existing transition rules. Successful registrations, domain changes, verification, and lifecycle changes are recorded with actor, reason, action, tenant target, and outcome.
- Sensitive domain and lifecycle endpoints use the existing token-freshness step-up guard. The frontend adds an explicit confirmation header only after the user confirms the operation; the backend remains authoritative.
- The detail page is available at `/access-control/tenants/:id`. It contains identity and lifecycle state, domain management, client/user/layout/license/branding assignment counts, lifecycle controls, and audit history.
- Lifecycle and domain controls are hidden when the current state makes the operation invalid. All mutations use the shared pending/error state so duplicate submission is prevented and backend errors remain visible.
- `V56__complete_tenant_administration_contract.sql` registers the detail route policy, associates it with `TENANT_VIEW`, grants the tenant-management APIs when present in the registry, and adds the audit-history lookup index. Runtime API synchronization remains responsible for registering concrete controller endpoints.

### Verification completed

- Backend test compilation completed successfully.
- `TenantAdministrationServiceTest` and `StepUpAuthenticationServiceTest`: 4 tests passed.
- System frontend Vitest suite: 13 tests passed.
- System frontend production build completed successfully; the existing initial-bundle budget warning remains.
- V56 executed successfully against the local `system_db` in a rollback-only transaction.

## 13. Phase 8 — License administration completion

**Status:** Implemented (2026-08-14)

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

### Current implementation

- Subscription and plan/subscription entitlement DTOs carry optimistic versions. Updates reject missing or stale versions, and V57 adds the corresponding non-null version columns.
- Entitlements support edit and deactivate operations. A shared backend validator rejects null types, multiple targets, incompatible type/target pairs, missing limit values, and negative limits. The frontend mirrors this validation, clears stale hidden targets when the type changes, and conditionally renders only the compatible target control.
- Entitlement deactivation includes an explicit dependency-impact warning. The existing license decision service remains the authority for the immediate effective result.
- License keys remain write-only credentials: the raw value is returned only from generation and list/renewal/usage/audit responses contain summaries only. Active keys have a state-aware revoke action requiring a reason; revocation sets `active=false` and `revokedAt` in the same transaction and writes a tenant-scoped license audit event with actor and safe reason context.
- Tenant-scoped administration endpoints now expose usage snapshots, the latest 100 license audit events, and expiry/grace/auto-renew/day-remaining summaries. The frontend adds Usage & Renewal and Audit tabs driven by an authorized subscription selector.
- Plan, subscription, entitlement, key, usage, and audit views use the shared paginated list presentation. Existing list contracts are retained for compatibility; page slicing currently occurs in the frontend after the backend applies tenant scope.
- License activation and validation remain absent from the administration UI. Existing authenticated runtime endpoints are retained for integration diagnostics and license consumers.
- V57 adds optimistic-version columns, usage/audit lookup indexes, and conditional system-frontend API grants. Runtime API synchronization registers concrete controller endpoints before the conditional grants can take effect on new installations.

### Verification completed

- Backend test compilation completed successfully.
- Entitlement validation, key generation/revocation, and license decision tests: 7 tests passed.
- System frontend Vitest suite: 13 tests passed.
- Shared Angular library and system frontend production builds completed successfully; the existing initial-bundle budget warning remains.
- V57 executed successfully against the local `system_db` in a rollback-only transaction.

## 14. Phase 9 — Backup operations and recovery evidence

**Status:** Implemented (2026-08-14)

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

### Current implementation

- The existing server-paged backup list and detail contract now drive an operational detail modal containing aggregate state, sanitized job and per-database failure diagnostics, artifact/database checksums, retention expiry, and encrypted artifact size.
- Detail polling is bounded to 60 two-second requests. It starts only for `QUEUED`/`RUNNING` jobs and terminates on the first terminal state, modal close, component destruction, request failure, or the request limit.
- Delivery retry and delivery-history endpoints require `backup.deliver`. Each attempt persists channel, outcome, actor, time, and sanitized failure information. Disabled delivery or invalid job state is distinguishable from a failed provider attempt.
- The `backup.manage` contract exposes a safe configuration projection and recovery-readiness aggregate. It includes schedule, retention, storage type, timeout, encryption-key identifier/configured state, and delivery counts without exposing filesystem paths, recipient addresses, encryption material, or database credentials.
- Restore-verification evidence is persisted separately with the artifact checksum, isolated verifier identity, verification status/time, and off-site replication status/reference. The browser has a read-only list endpoint; no restore or verification-write endpoint exists.
- The frontend shows privilege-gated configuration, readiness, restore verification, delivery history, and retry operations. `PARTIAL`, `FAILED`, configuration-disabled, unverified-restore, and unverified-off-site states remain distinct.
- Binary download uses a tested helper that creates a blob URL, triggers the filename-preserving download, and revokes the URL after the browser consumes the click. Missing artifacts retain `DATABASE_BACKUP_ARTIFACT_MISSING`; structured API failures continue to display stable code and trace ID.
- V58 creates append-only delivery-attempt and restore-verification evidence tables, indexes their operational lookup paths, and conditionally grants the new APIs to the system frontend. Runtime API synchronization covers the `/api/v1/system/backup` controller family.

### Verification completed

- Backend compilation and test compilation completed successfully.
- Backup encryption, disabled-configuration, and missing-artifact tests: 4 tests passed.
- System frontend Vitest suite, including blob lifecycle and bounded polling/teardown tests: 16 tests passed.
- System frontend production build completed successfully; the existing initial-bundle budget warning remains.
- V58 executed successfully against the local `system_db` in a rollback-only transaction.

## 15. Phase 10 — Privilege-aware dashboard and diagnostics

**Status:** Implemented (2026-08-14)

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

### Current implementation

- `/api/v1/system/dashboard/aggregate` is an authenticated, client-registered endpoint and is the dashboard's only data request. It returns a generated timestamp, a sparse metric map, and optional safe diagnostics.
- Each metric is independently guarded with the same backend privilege authorizer used by administration endpoints. Unauthorized metric keys are omitted entirely and their repositories/services are not queried; they are never represented as zero, null, disabled cards, or frontend-only hiding.
- The aggregate includes active platform clients, pending tenant onboarding, tenant-scoped licenses expiring within 30 days, queued/running backups, failed/partial backups, and current annotation/API metadata conflicts when the matching view privilege is effective.
- Enforcement mode, access-control enabled state, and latest persisted API-registry synchronization time are returned only with API Registry view privilege. Configuration secrets, registry contents, and inaccessible module names/counts are not returned.
- Metrics carry backend-provided warning severity, stable warning code, and an authorized destination route. The aggregate remains informational: neither frontend nor downstream backend authorization consumes its values.
- The dashboard renders only returned metrics. Every card is a semantic router link with keyboard focus styling; warning and critical cards link to the relevant authorized administration page.
- Loading and structured error states replace placeholder counts. A failed aggregate request exposes no partial or cached inaccessible counts.
- `V59__grant_system_dashboard_aggregate_api.sql` conditionally grants the endpoint to `SYSTEM_ADMIN_WEB`; runtime synchronization includes the dashboard controller family for fresh installations.

### Verification completed

- Backend compilation and test compilation completed successfully.
- Dashboard omission/query-isolation tests: 2 tests passed.
- System frontend authorization-contract, single-request service, and component test suite: 17 tests passed.
- V59 executed successfully against the local `system_db` in a rollback-only transaction.
- System frontend production build completed successfully; the existing initial-bundle budget warning remains.

## 16. Phase 11 — Audit and user-session administration

**Status:** Planned. Existing log-query and logout-token primitives are not sufficient for this phase: audit queries do not yet force effective tenant scope into their repository predicates, and login state is held in process-local account/tenant maps rather than persistent, individually addressable sessions.

### Security and ownership decisions

- `logmodule` owns technical/API/authorization audit search and redaction. Domain histories such as license and tenant lifecycle events remain owned by their domain modules.
- `authmodule` owns user sessions, refresh-token families, account lock state, and local credential operations.
- `systemmodule` supplies the validated client, user, privilege, and effective tenant/scope context. Cross-database calls use module gateways; no module directly joins another module's datasource.
- Every audit and session read, count, export, revoke, lock, unlock, or password-reset predicate includes the server-resolved tenant. A request DTO, route parameter, username, JWT-decoded frontend value, or caller-controlled header never establishes tenant authority.
- A session belongs to exactly one auth account and tenant. Account-wide revocation means all sessions for that `(accountId, tenantId)` only; it must not revoke an account with the same username or person in another tenant.
- Session identifiers returned to the browser are opaque random identifiers. Access tokens, refresh tokens, token hashes, API keys, cookies, authorization headers, request/response bodies, stack traces, and raw identity-provider assertions are never returned.
- `PASSWORD_RESET`, `LOCK`, `UNLOCK`, `SESSION_REVOKE`, `SESSION_REVOKE_ALL`, and audit export are high-impact operations. They require exact privileges, step-up authentication where specified, a reason, duplicate-submit prevention, and an append-only audit result.
- External SSO identities do not expose local password controls. Mixed/federated accounts expose only operations supported by the account's server-resolved credential ownership.

### Backend foundation: persistent session registry

Replace `LogoutSessionService` and `RefreshTokenSessionService` as authoritative process-local maps with a persistent Auth-owned session registry. In-memory state may remain only as a bounded cache whose entries are invalidated by a shared revocation version/event.

Add the next immutable Auth Flyway migration with an `auth_user_sessions` table containing at least:

```text
id                    uuid or opaque varchar primary key
tenant_id             bigint not null
account_id            bigint not null
user_id               bigint not null
client_code           varchar(100) not null
auth_method           varchar(30) not null
refresh_token_hash    varchar(128) null
refresh_token_family  uuid null
issued_at              timestamp not null
last_seen_at           timestamp not null
expires_at             timestamp not null
revoked_at             timestamp null
revoked_by             bigint null
revocation_reason      varchar(500) null
ip_address_masked      varchar(100) null
user_agent_summary     varchar(255) null
created_by             bigint not null
updated_by             bigint not null
created_at             timestamp not null
updated_at             timestamp not null
```

Indexes must support `(tenant_id, account_id, revoked_at, expires_at)`, opaque session-ID lookup, refresh-token-family lookup, and bounded expiry cleanup. Store only a one-way refresh-token hash. Normalize or mask network/device information before persistence.

JWT access tokens must carry an opaque `sessionId`. `JwtAuthenticationFilter` must verify that the session matches token account, tenant, and client and is active. Revocation therefore takes effect on the next authenticated request on every application instance. Refresh rotation updates the same token family atomically and rejects replay of a replaced token. A scheduled cleanup may remove expired sessions only after the configured audit/retention window.

Migration must not invent active sessions from the current maps. Deploying the persistent registry invalidates legacy process-local sessions and requires reauthentication, or uses an explicitly time-boxed compatibility verifier until their existing access tokens expire. Document the chosen rollout behavior.

### Backend contracts

Add typed, server-paged contracts:

```text
POST /api/v1/system/audit/search
POST /api/v1/system/audit/export
POST /api/v1/system/user/security-detail
POST /api/v1/system/user/session/search
POST /api/v1/system/user/session/revoke
POST /api/v1/system/user/session/revoke-all
POST /api/v1/system/user/account/lock
POST /api/v1/system/user/account/unlock
POST /api/v1/system/user/password/reset-required
```

`audit/search` accepts bounded page, page size, date range, event category, outcome, actor, target type/reference, client code, and trace ID. The service always adds effective tenant/scope predicates before executing the Log-database query. Reject unsupported sort fields and cap page size. `details` is a safe structured projection or redacted summary, not an arbitrary persisted payload.

`audit/export` is a separate privilege and asynchronous/bounded export contract. It applies exactly the same scoped predicate and redaction projection as on-screen search, records requested filters and result count, and never exports inaccessible columns. Prefer a short-lived authenticated download reference rather than returning large files inline.

`user/security-detail` resolves the target with a tenant-scoped direct-ID Auth repository predicate and returns:

```text
userId, accountId, username/display label
account enabled/locked state
credential ownership: LOCAL | EXTERNAL | HYBRID
last successful authentication time
last failed authentication time (when safe)
active session count
availableActions[] calculated by the backend
```

Do not return password hashes, reset tokens, provider subject identifiers, full IP addresses, or existence information for cross-tenant IDs.

`user/session/search` requires a target user/account ID, never username alone. It returns active, non-expired tenant/account sessions with opaque ID, client label, authentication method, issued/last-seen/expiry timestamps, masked network/device summary, and `currentSession`. The current administrator session is identified server-side.

Session revocation requests contain opaque session ID, nonblank reason, step-up proof/reference, and an idempotency key. `revoke-all` contains target user/account ID, reason, step-up proof/reference, idempotency key, and an explicit `includeCurrentSession` decision. Both mutations lock/recheck the target session rows, remain idempotent, revoke refresh-token families, publish cache invalidation, and append success/failure audit events.

Account lock/unlock and reset-required operations are conditional on server-resolved `availableActions`. Locking an account revokes all of its tenant-bound sessions in the same Auth transaction. `reset-required` never returns or assigns an administrator-chosen password; it marks a local credential for a secure reset flow. External-only accounts return `ACCOUNT_CREDENTIAL_EXTERNALLY_MANAGED`.

Introduce exact privilege/action policies rather than sharing general user edit authority:

```text
audit.view
audit.export
user-security.view
user-sessions.view
user-sessions.revoke
user-account.lock
user-account.unlock
user-password.reset-required
```

Register all endpoints in API metadata, grant only required APIs/features to `SYSTEM_ADMIN_WEB`, seed route/UI policies, and add the next System migration without editing prior migrations.

### Step-up authentication

- Use a short-lived, single-purpose server-issued step-up grant bound to administrator user/account, tenant, client, action, target, authentication method, and expiry.
- Require recent password reauthentication for locally managed administrators and an IdP `auth_time`/`acr` flow for SSO administrators. Do not accept a boolean header as proof.
- Consume or replay-protect the grant for the mutation and reject target/action mismatch.
- Never log the proof/token. Audit only the proof type, assurance level, grant identifier hash/reference, and outcome.
- Return `STEP_UP_REQUIRED` with safe challenge metadata when assurance is absent or stale.

### Audit redaction and retention

- Add tenant ID to every applicable Log repository predicate, including direct trace/entity searches and export.
- Treat absent tenant ownership on legacy log rows as inaccessible until reconciled; never infer it from username or client code.
- Apply a field allowlist to audit DTOs. Redact secrets and sensitive personal data before persistence where possible and again at projection/export boundaries.
- Viewing/exporting audit data is itself audited without recursively logging response contents.
- Define retention separately for security audit, access logs, and session records. Cleanup uses a system actor and records aggregate evidence, not deleted sensitive contents.

### Frontend

- Add `/audit` as a lazy route protected by the server-delivered audit route policy. Add navigation only when `audit.view` is effective.
- Implement a typed `AuditAdministrationService`; do not reuse raw log entities or call Log endpoints directly from components.
- Render a server-paged audit table with date/category/outcome/actor/target/client/trace filters. Debounce text filters, cancel stale searches, reset to page one when filters change, and distinguish loading, empty, denied, rate-limited, and failed states.
- Make trace IDs copyable and linkable to a same-scope correlation view. Details open in an accessible modal using redacted labeled fields; never render arbitrary JSON as HTML.
- Show Export only for `audit.export`. Confirm the effective filter/date range and explain redaction before starting an export. Prevent duplicate export submissions and display traceable asynchronous status.
- Extend User Administration with a lazy-loaded Security panel. Load it only after `user-security.view` becomes effective and close it immediately if authorization is revoked.
- Load the active-session tab independently under `user-sessions.view`. Clearly mark the current administrator session, session client/auth method, masked device/network summary, last activity, and expiry.
- Revoke-one and revoke-all use the shared confirmation/change-summary workflow, require a reason and completed step-up challenge, and disable duplicate submission. Revoking the administrator's current session warns that the UI will return to login.
- Render lock, unlock, and reset-required controls only from the intersection of live UI policy and backend `availableActions`. Never infer local credential ownership from the configured application login method.
- After a successful security mutation, reload security detail and sessions. If the current session was revoked, clear local authentication state and navigate to login without replaying API calls.
- Add typed stable-code handling for `STEP_UP_REQUIRED`, `SESSION_ALREADY_REVOKED`, `ACCOUNT_CREDENTIAL_EXTERNALLY_MANAGED`, `AUTHORIZATION_VERSION_STALE`, and generic non-enumerating target denial.

### Delivery sequence

1. Add tenant predicates and redaction tests to existing audit queries before exposing a frontend route.
2. Add persistent Auth session schema, registry, JWT session binding, refresh rotation, and cleanup.
3. Add module-gateway DTOs for tenant-scoped user security/session administration.
4. Add exact privileges, controllers, API metadata, System grants, route/UI policies, and navigation migration.
5. Add step-up grant issuance/validation for high-impact mutations.
6. Add the audit route/viewer and User Security panel.
7. Enable export only after scoped search/redaction equivalence tests pass.
8. Remove process-local session state after the compatibility window and validate multi-instance revocation.

### Automated verification

Backend tests must prove:

- audit list and export always include effective tenant/scope predicates;
- cross-tenant target IDs, session IDs, trace IDs, and export filters return no data and cannot mutate state;
- legacy audit rows with null ownership remain inaccessible;
- sensitive values are absent from list, detail, export, logs, and audit mutation events;
- multiple sessions for one account are independently listed and revocable;
- revoke-one leaves sibling sessions active and revoke-all affects only the target tenant/account;
- revoked access and refresh tokens fail on the next request across two application instances/cache views;
- refresh-token replay fails after rotation;
- current-session revocation and account lock invalidate access immediately;
- external-only identities reject local-password actions;
- step-up grants expire, are action/target bound, and cannot be replayed;
- mutation idempotency prevents duplicate revocation/audit events;
- `SYSTEM_ADMIN_WEB` has exactly the required API/feature grants under `ENFORCE`;
- fresh-install and upgrade migrations preserve constraints, indexes, and audit actors.

Frontend tests must prove:

- audit and security APIs are not called without their exact live privileges;
- paging/filter serialization and stale-request cancellation are correct;
- denied, empty, failed, rate-limited, and loading states remain distinct;
- revocation closes an open security editor when privilege is removed;
- externally managed identities show no local password action;
- confirmations require reason and step-up completion;
- duplicate mutations are blocked;
- current-session revocation clears authentication and redirects to login;
- keyboard focus returns correctly after detail, confirmation, and step-up dialogs.

### Gate

- Audit list and export are server-paged, tenant/scope constrained in database predicates, redacted through the same projection, and independently privilege-gated.
- Persistent sessions support multiple devices/clients, refresh-token rotation, individual and tenant/account-wide revocation, and multi-instance invalidation.
- Session revocation and account lock are effective on the next request; no access-token TTL grace period remains.
- Cross-tenant audit events, users, and sessions are never listed, counted, exported, or mutable, including by direct opaque ID.
- High-impact mutations require exact privilege, reason, valid target-bound step-up grant, idempotency, and append-only audit outcome.
- Authentication-mode-aware controls come from backend credential ownership and available actions, not frontend inference.
- Focused backend, frontend, authenticated browser, migration, and multi-instance revocation tests pass under `ENFORCE`.

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
