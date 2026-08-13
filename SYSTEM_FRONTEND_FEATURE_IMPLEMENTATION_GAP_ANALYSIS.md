# System Frontend 21 Feature Implementation Gap Analysis

**Assessment date:** 2026-08-14  
**Scope:** `frontendApplications/system-frontend-21`, its shared authorization dependencies, and the backend contracts used by the application.  
**Reference migration:** `backend/src/main/resources/db/migration/system/V49__grant_system_admin_session_lifecycle_apis.sql`

## 1. Executive summary

The system frontend has working foundations for authentication, server-delivered route and UI policy enforcement, client administration, API registry, privilege catalog, user/role administration, tenant administration, layout administration, license administration, and database backup. The application builds and its current unit and unauthenticated Playwright gates pass.

It is not yet feature-complete as a production administration console. The main remaining risks are:

1. User, role, and privilege administration are combined even though they require different privileges. The page eagerly calls all three API families and exposes some role mutations without the exact role policy.
2. Role and role-privilege full replacements do not consistently enforce load-before-save, so stale or failed reads can become destructive writes.
3. Several administration pages evaluate UI permissions once rather than reactively, so active-session revocation may leave controls visible until navigation or reload.
4. Error/loading/denial handling is inconsistent. Several failed reads appear as empty lists and many mutation failures are not surfaced with stable backend codes and trace IDs.
5. Automated feature coverage is very small: only route metadata, one client-service test, and unauthenticated browser route denial are app-owned tests.
6. Several backend-supported operational workflows remain deliberately absent: license activation/validation/revocation/usage/audit, backup delivery/restore/recovery verification, and workflow/audit administration.

The backend remains authoritative, so most UI gaps do not directly bypass server authorization. They do, however, create misleading UI, repeated 403 responses, unsafe replacement workflows, and incomplete operational capability.

## 2. What V49 covers

`V49__grant_system_admin_session_lifecycle_apis.sql` grants `SYSTEM_ADMIN_WEB` these shared authenticated lifecycle endpoints:

- `POST /api/v1/auth/application-context`
- `POST /api/v1/auth/session-status`
- `POST /api/v1/auth/logout`

This closes the `CLIENT_API_NOT_ALLOWED` failure in shared context loading, the 15-second session monitor, and logout while enforcement mode is `ENFORCE`.

V49 does **not** grant or prove completeness for User, Role, Tenant, Layout, License, Backup, API Registry, or Privilege Administration. Those features depend on their own API grants, feature privileges, route/UI policies, tenant assignments, and object/data-scope checks. V49 should remain narrowly scoped and must not become a catch-all administration grant migration.

## 3. Cross-cutting gaps

### P0 — Unsafe full-replacement paths

Some APIs replace an entire assignment set. Every such editor must load the authoritative current state, enter an explicit `loaded` state, show the change summary, and disable saving after a failed or unresolved read.

Current gaps:

- User role assignment initializes from the user-list row instead of a dedicated current-assignment read or versioned snapshot.
- Role privilege assignment clears selection before its read completes and leaves Save enabled. A fast save or failed read can replace all privileges with an empty set.
- Layout UI policy editing uses comma-separated privilege codes rather than an authoritative searchable assignment control. It round-trips current data but remains fragile and cannot validate codes locally.
- Navigation feature privilege synchronization is append-only rather than replacement-based, allowing duplicate links or an inability to remove an obsolete privilege through this UI.

Required outcome:

- Adopt `ReplacementSelectionState` for user roles and role privileges.
- Add authoritative current-role reads or an assignment version/ETag.
- Reject stale replacement writes server-side where concurrent administrators are possible.
- Make navigation feature privilege editing a well-defined replacement contract with deduplication.

### P0 — Mixed privilege domains on one route

`/access-control/users` contains Users, Global Role Templates, Tenant Roles, and Role Privilege Assignment. Entry to the route is governed by the user route policy, but the component always loads User, Role, and Privilege APIs.

Consequences:

- A user with `USER_ADMINISTRATION_VIEW` but without `ROLE_ADMINISTRATION_VIEW` or privilege-catalog view receives avoidable 403 responses.
- Tenant role create/edit controls are not gated with `ROLE_ADMINISTRATION_MANAGE`.
- Global role UI relies partly on `ROLE_SYSTEM_ADMIN` instead of composing that role requirement with the exact role-management UI policy.

Required outcome:

- Prefer separate `/access-control/users` and `/access-control/roles` routes.
- Conditionally create tabs and issue API requests only when the corresponding view privilege is effective.
- Seed and use exact `roles.view`, `roles.manage`, and role-privilege assignment UI policies.

### P1 — Authorization decisions are not consistently reactive

Client detail correctly uses computed permission decisions. User and Tenant Administration store policy results as plain values during component construction. Column actions and tabs are also constructed once.

Required outcome:

- Express every permission decision as a computed signal.
- Derive tabs and action columns reactively.
- Close or disable an open mutation modal when authorization is revoked.
- Add a browser or component test for active-session revocation while a page remains mounted.

### P1 — Inconsistent denial, loading, and error states

Several subscriptions have success handlers only. Failed reads can therefore render the same empty state used for a legitimate empty dataset. Mutation errors often expose only `error.message`, discard the stable backend code, and do not show the trace ID.

Required outcome:

- Use shared assignment/load/error presentation for every authoritative read.
- Distinguish empty, loading, forbidden, unavailable, and failed states.
- Preserve `CLIENT_API_NOT_ALLOWED`, `CLIENT_FEATURE_NOT_ALLOWED`, `USER_PRIVILEGE_NOT_ALLOWED`, `DATA_SCOPE_NOT_ALLOWED`, rate-limit codes, `Retry-After`, and trace IDs.
- Prevent duplicate submissions consistently.

### P1 — Insufficient automated coverage

Current app-owned tests cover:

- route-policy metadata;
- normalized client-scope request serialization;
- unauthenticated denial on three protected routes.

Missing coverage includes all page components and most services.

Minimum required matrix:

- VIEW-only, specialized-action, and full-admin presentation for every route;
- exact API endpoint/request DTO tests for every service;
- failed-read cannot become empty replacement;
- revocation while the component is active;
- cross-tenant direct-ID and replacement denial;
- duplicate-submit prevention;
- direct-route refresh for client detail/edit;
- binary download cleanup and errors;
- authenticated Playwright flows against registered `SYSTEM_ADMIN_WEB` test data.

### P2 — Scalability and accessibility consistency

Several pages download complete datasets and paginate/filter in memory. This will degrade for users, roles, privileges, API registry, tenants, layouts, plans, and subscriptions. Modal focus, keyboard operation, confirmation semantics, and screen-reader announcements also lack app-level automated coverage.

Required outcome:

- Add server-side paging/search contracts for potentially large collections.
- Verify focus trapping, focus return, keyboard-only assignment, accessible error announcements, and table action labels.

## 4. Feature-by-feature findings

### 4.1 Dashboard

**Implemented:** authenticated shell and five summary cards.

**Gaps:**

- Every value is a static em dash; there are no live operational counts.
- Cards have no links or click behavior.
- Card visibility is not filtered by effective feature privilege.
- Users landing on the public-within-authenticated-shell dashboard may see labels for modules they cannot access.
- No health, enforcement-mode, metadata-sync, backup, license-expiry, or tenant-onboarding alerts.

**Priority:** P2. Convert cards to privilege-aware links and add aggregate endpoints only where counts provide operational value.

### 4.2 Client Applications

**Implemented:** list, create/edit, direct detail, one-time credential rotation, and safe API/feature/scope replacement state.

**Gaps:**

- Scope choices are derived from existing/context data rather than a complete authorized tenant/business/branch lookup experience.
- No optimistic concurrency/version protects assignments from simultaneous administrators.
- API and feature selection can become unwieldy without server search, grouping, or virtualization.
- Rotation reveals a credential once, but there is no tested copy confirmation, expiry policy presentation, or explicit acknowledgement before closing.
- Client status transitions and credential revocation/history are not represented as distinct audited workflows.
- Component and authenticated direct-route tests are absent.

**Priority:** P1 for authoritative hierarchical lookups and concurrency; P2 for operational enhancements.

### 4.3 API Registry

**Implemented:** registered/inventory tabs, manual edit, code synchronization, metadata status, and exact UI policies for manage/synchronize.

**Gaps:**

- Sync conflicts are reported but there is no guided resolution workflow.
- Manual editing can change security-critical method/path/auth/scope metadata without a change preview or step-up confirmation.
- No diff between inventory and persisted registry before synchronization.
- Sync/save error handlers do not consistently display stable codes or trace IDs.
- No server pagination for a registry that grows with the backend.
- No page/service tests for conflict, missing metadata, ambiguous routes, or failed synchronization.

**Priority:** P1 because incorrect registry metadata directly affects enforcement.

### 4.4 Privilege Catalog

**Implemented:** privilege and submenu list/create/edit with server-generated privilege composition.

**Gaps:**

- Raw code-part editing is expert-only and lacks collision/impact preview.
- No usage view showing roles, clients, routes, UI policies, layout features, or license entitlements that depend on a privilege.
- No safe deactivation workflow or warning about downstream access removal.
- Modal saves lack consistent loading/duplicate-submit and structured error presentation.
- No server pagination or component/service tests.
- Delete is intentionally absent, but deactivation governance is not a complete substitute without dependency analysis.

**Priority:** P1 for dependency/impact analysis; P2 for usability.

### 4.5 User and Role Administration

**Implemented:** tenant-scoped user list/create/edit, account enablement/password update, global/tenant roles, role assignment, normalized user scopes, and role privilege assignment.

**Gaps:**

- The page mixes three independently authorized domains and eagerly loads all APIs.
- Tenant-role create/edit buttons and row actions lack `ROLE_ADMINISTRATION_MANAGE` UI gating.
- User-role replacement trusts roles embedded in the list row and has no load-before-save state.
- Role-privilege replacement can save an empty set before/after a failed current-assignment read.
- Native `confirm()` is used rather than the shared confirmation and change-summary workflow.
- User-scope choices do not provide authoritative dependent business/branch lookups.
- Policy decisions and action columns are not reactive after context refresh.
- Initial load and role-save failures can be silent.
- No user detail/audit view, session revocation view, forced password-reset workflow, lock/unlock workflow, MFA state, or account activity history.
- No focused service, component, or authenticated browser tests.

**Priority:** P0 for privilege separation and safe replacement; P1 for scope lookup, revocation, and error handling.

### 4.6 Tenant Administration

**Implemented:** tenant registration, domain verification, and activate/suspend/reactivate/cancel transitions with reasons where required.

**Gaps:**

- Permission decisions and column actions are evaluated once, not reactively.
- Registration save has no structured error/loading handler and can be submitted repeatedly.
- Lifecycle action availability is represented by handlers that silently do nothing for invalid states instead of hiding/disabling invalid actions.
- Domain management is limited to the primary registration domain; there is no add/remove/set-primary domain workflow.
- No tenant detail view for assignments, branding, clients, licenses, users, or audit history.
- No explicit step-up UI for high-impact lifecycle changes.
- List filtering/paging is client-side and feature tests are absent.

**Priority:** P1 for reactive authorization, mutation safety, and lifecycle UX.

### 4.7 Layout Profiles and Policies

**Implemented:** profile editing, themes, UI policies, and client layout assignments.

**Gaps:**

- UI policy responses historically omit client identity, causing the editor to rely on the active filter; this remains fragile until the backend DTO is self-describing.
- Privilege codes are comma-separated free text rather than validated selections.
- No change preview for full-replace policy privileges.
- No preview/sandbox showing how a profile renders before assignment.
- No clone/version/publish/rollback lifecycle for profiles.
- Client assignment has no concurrency protection or conflict visualization across CLIENT/ROLE/PRIVILEGE/DEVICE/MODULE scopes.
- Reads and saves have incomplete structured error handling and no component tests.

**Priority:** P1 for self-describing policy DTOs and replacement safety.

### 4.8 Navigation Tree

**Implemented:** full unpruned five-level administration tree and save editors for every level.

**Gaps:**

- Feature privilege synchronization is append-only; removing codes in the editor does not define a reliable removal operation and repeated saves can duplicate links.
- Privilege codes and parent IDs are entered through low-level controls rather than authorized selectors.
- No drag/drop reorder despite a reorder backend contract; editing numeric display order is error-prone.
- No route validation against Angular routes or backend route policies.
- No orphan/duplicate/invalid-parent diagnostics.
- No preview of the effective pruned navigation for a selected client/user.
- Error/loading states and tests are incomplete.

**Priority:** P1 for deterministic privilege replacement/deduplication and integrity validation.

### 4.9 License Administration

**Implemented:** plans, subscriptions, plan/subscription entitlements, key list/generation, and subscription lifecycle actions.

**Gaps:**

- The page eagerly loads client applications, plans, and subscriptions even when a user lacks the corresponding supporting API grant.
- Entitlement target fields are all shown simultaneously; invalid combinations are easy to submit.
- Entitlement creation is insert-only with no edit/remove/deactivate workflow in the console.
- No license key revoke operation.
- Activation and validation are intentionally absent because they belong to consuming clients, but the admin console also lacks diagnostic history for them.
- Usage snapshots, audit events, capacity/limit consumption, expiry alerts, renewal workflows, and export are absent.
- Owner selection uses IDs without a complete tenant/business lookup and validation experience.
- Most requests lack structured load/error states; feature tests are absent.

**Priority:** P1 for entitlement correctness and key revocation; P2 for telemetry and renewal operations.

### 4.10 Database Backup

**Implemented:** server-paginated history, manual execution, status display, and encrypted artifact download with exact execute/download policies.

**Gaps:**

- No job detail/error-log view despite a backend detail endpoint.
- No cancel/retry delivery/manage controls even though privilege codes reserve delivery/manage capabilities.
- No schedule/retention/storage target configuration UI.
- No restore request, isolated restore verification, recovery drill, checksum verification, or off-host replication status.
- Download object-URL cleanup is immediate after click and is not covered by a browser test.
- No polling/live refresh for queued/running jobs.
- No feature tests for partial/failed jobs, denied downloads, missing artifacts, or configuration-disabled execution.

**Priority:** P1 for detail/polling and recovery evidence; restore operations require a separately designed, step-up-protected backend contract.

### 4.11 Missing administration domains

The navigation/dashboard and broader architecture mention capabilities that are absent or explicitly deferred:

- Workflow definition/runtime administration;
- platform authorization/audit-event viewer;
- user session administration and forced revocation;
- backup delivery and recovery administration;
- license usage/audit and key revocation;
- tenant branding/domain/client-assignment detail workflows;
- operational health and configuration diagnostics.

These should be explicitly scheduled or marked out of scope so the console does not imply full platform administration coverage.

## 5. Backend and deployment gaps affecting the frontend

1. **Fresh-install versus upgraded database grants:** DataSeeder and Flyway must remain equivalent. V49 handles both upgraded databases (migration) and fresh synchronized installs (DataSeeder addition), but every new protected endpoint needs the same dual-path review.
2. **Policy/grant verification:** API metadata coverage proves annotation metadata exists; it does not prove every deployed client has all required API/feature/tenant grants. Add a `SYSTEM_ADMIN_WEB` contract test or startup report for required frontend endpoint families.
3. **Migration ordering:** Some navigation migrations depend on privilege rows created by application seeding. A Flyway migration that runs before those rows exist can succeed without inserting navigation and will not retry. Seed required privilege catalog records transactionally in migrations or add deterministic reconciliation.
4. **Authenticated browser fixtures:** The complete VIEW-only/specialized/full-admin matrix needs registered `SYSTEM_ADMIN_WEB`, tenant hostname resolution, synchronized registry records, grants, and seeded users. CI currently proves unauthenticated denial only.
5. **Production enforcement:** `ENFORCE` is now the default and production requirement. Operational deployment must verify that no environment overrides it and that metadata/grants are applied before traffic is enabled.

## 6. Recommended delivery sequence

### Gate A — Prevent destructive or misleading administration

1. Split User and Role Administration authorization domains.
2. Add load-before-save state to role and role-privilege replacement.
3. Fix navigation feature privilege replacement/deduplication.
4. Make permission decisions and action construction reactive.
5. Standardize loading, denial, trace, and mutation error presentation.

### Gate B — Complete core operator workflows

1. Add authorized hierarchical lookups to client/user/license ownership scopes.
2. Add API Registry diff/conflict resolution and privilege dependency analysis.
3. Add tenant detail/domain management and backup job detail/live refresh.
4. Add license entitlement lifecycle and key revocation.
5. Add concurrency/version controls to full replacement APIs.

### Gate C — Establish enforceable release coverage

1. Add service contract tests for every endpoint wrapper.
2. Add component tests for exact VIEW/MANAGE/ASSIGN/SYNC/ROTATE/EXECUTE/DOWNLOAD presentation.
3. Add failure and revocation tests for every replacement workflow.
4. Run authenticated Playwright tenant/client/privilege matrices against seeded backend data.
5. Add a deployment check proving required `SYSTEM_ADMIN_WEB` API, feature, tenant, route, and UI policy grants are active.

### Gate D — Operational completeness

1. Implement audit/session administration.
2. Implement license usage/audit and recovery-safe key revocation.
3. Implement backup delivery, restore verification, retention, and recovery drills.
4. Implement workflow administration only after its subject/action authorization contract is finalized.

## 7. Definition of feature completeness

A system frontend feature is complete only when:

- its route, navigation node, UI actions, API metadata, client grants, user privileges, and data scope agree;
- VIEW-only users never trigger unauthorized supporting API calls;
- every full replacement loads authoritative state and cannot save after a failed read;
- revocation changes visible controls without logout or route reconstruction;
- direct URLs work and fail closed for unauthorized tenants/resources;
- loading, empty, denied, rate-limited, unavailable, and failed states are distinct;
- destructive/high-impact operations use confirmation, pending state, duplicate-submit prevention, and audit/trace context;
- app-owned unit/component tests and authenticated browser matrices cover the supported privilege tiers;
- operational prerequisites and intentionally deferred workflows are documented without implying they are implemented.

