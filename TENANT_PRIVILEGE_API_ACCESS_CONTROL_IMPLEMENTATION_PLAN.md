# System Frontend 21 Tenant, Privilege, and API Access-Control Implementation Plan

## 1. Purpose

This document defines the implementation required to align `system-frontend-21` with the backend tenant, privilege, client, API-registry, and data-scope architecture.

It is the frontend companion to:

`backend/src/main/java/com/nexacore/systemmodule/accesscontrol/TENANT_PRIVILEGE_API_ACCESS_CONTROL_TEST_ROADMAP.md`

The backend remains the authorization authority. Frontend route guards and action visibility improve safety and usability, but they never replace backend `@PrivilegeApi`, method-security, tenant-resolution, or repository-scope enforcement.

## 2. Target authorization model

The completed application must follow this request path:

```text
Browser hostname
  -> backend resolves tenant from a trusted domain
  -> SYSTEM_ADMIN_WEB client is authenticated/resolved
  -> API registry and client grants are evaluated
  -> access token identifies a tenant-bound account
  -> AuthenticatedRequestContextFilter intersects:
       resolved tenant
       token/account tenant
       client tenant assignment
       user tenant/business/branch assignments
  -> effective client-filtered privileges are captured
  -> backend returns application context:
       effective tenant and scopes
       effective privileges
       route policies
       UI action policies
       layout and navigation
  -> frontend uses that context for navigation and action visibility
  -> backend independently authorizes every request
```

Security invariants:

1. The browser must not grant itself tenant, business, or branch authority through headers, form fields, query parameters, or local storage.
2. A tenant ID is mandatory for every structural scope. A branch requires a business, and a business must belong to the supplied tenant.
3. Person membership and login authorization scope are independent.
4. A branch assignment cannot widen to business or tenant access.
5. Client API, client feature, client tenant, user role, role privilege, and user scope replacement operations must load current server state before saving.
6. Administrative pages and actions must fail closed when their policy is absent.
7. Privilege and scope revocation must take effect without requiring a new login session.
8. Angular configuration must never contain a confidential client secret.

## 3. Current implementation assessment

### 3.1 Implemented foundations

- Angular routes are protected by the shared `authGuard` at the authenticated layout boundary.
- The shared platform provides `routePrivilegeGuard`, `AuthorizedUiDirective`, policy evaluation, JWT attachment, and application-context loading.
- `SYSTEM_ADMIN_WEB` is configured as a distinct client code.
- The backend exposes explicit `@PrivilegeApi` policies for access-control, privilege, layout, tenant, license, backup, user, and role administration.
- User and role screens already apply some explicit privilege checks.
- API-registry, layout, license, backup, tenant, privilege, user, and client-administration screens exist.

### 3.2 Critical gaps

#### Gap A — Existing client grants are not loaded

`ClientApplicationDetailComponent` initializes API, feature, and tenant selections as empty. It loads available APIs and privileges but not the selected client's current grants. Each corresponding backend mutation is full-replace.

Impact: pressing Save can erase valid client grants or tenant assignments.

#### Gap B — Tenant hierarchy is flattened

The UI temporarily represents `{tenantId, businessId}` pairs but sends separate `tenantIds[]` and `businessIds[]`. The relationship between a tenant and its business is lost, and branches are unsupported.

Impact: the contract cannot express or validate a hierarchical authorization tuple.

#### Gap C — Administration routes bypass route policies

All current application routes use `data: { public: true }`. The parent guard still requires login, but `routePrivilegeGuard` bypasses privilege-policy evaluation.

Impact: unauthorized users can enter administrative screens and discover denial only when an API returns 403.

#### Gap D — Most mutation controls are always visible

Client rotation and assignment, API synchronization, privilege catalog changes, tenant lifecycle actions, layout mutations, license operations, and backup operations are generally rendered without `AuthorizedUiDirective` or equivalent exact privilege checks.

Impact: the UI advertises actions the user cannot perform and encourages avoidable denied requests.

#### Gap E — User scope assignments cannot be administered

The backend authorization context depends on `AuthUserScopeAssignment`, but the frontend can manage only users, roles, and role privileges. It cannot view or change tenant/business/branch authorization assignments.

Impact: a source of truth required by `AuthenticatedRequestContextFilter` has no supported administration workflow.

### 3.3 High-priority gaps

#### Gap F — Application context omits effective tenant and scopes

The frontend context includes client identity, privileges, policies, and layout, but not the backend-validated effective tenant or scope assignments. The Users screen decodes `tenant_id` directly from the token.

Impact: the UI cannot display authoritative scope, explain scope denial, or safely support tenant-aware administration.

#### Gap G — Authorization cache can become stale

Privileges and policies are stored in local storage and normally refreshed at login. Backend revocation applies immediately, but the UI may continue to display stale routes or controls.

#### Gap H — Client deployment contract is incomplete

The Angular environment supplies `SYSTEM_ADMIN_WEB` with an empty API key. This is safe only if it is intentionally registered as a public browser client. A confidential API key must never be added to the bundle.

#### Gap I — Raw numeric ownership input

Client tenant assignments accept manually typed numeric tenant and business IDs. They provide no authoritative lookup or parent-child validation.

#### Gap J — No application-specific authorization tests

The shared platform has guard tests, but `system-frontend-21` has no focused unit or browser coverage for its route policies, action policies, tenant hierarchy, replacement workflows, or revocation behavior.

## 4. Required backend contracts

Frontend implementation depends on completing these backend contracts first.

### 4.1 Client administration detail

Add a detail endpoint protected by client-application VIEW privilege:

```text
POST /api/v1/system/client-app/detail
```

Request:

```json
{
  "clientApplicationId": 3
}
```

Response must include client metadata and current active assignments, or the backend may expose separately protected read endpoints:

```ts
interface ClientApplicationAdministrationDetailDto {
  client: ClientApplicationDto;
  apiRegistryIds: number[];
  privilegeCodes: string[];
  scopeAssignments: ClientScopeAssignmentDto[];
}
```

The frontend must not infer selected assignments from catalog data.

### 4.2 Hierarchical client scope contract

Replace the independent tenant and business arrays with:

```ts
interface ClientScopeAssignmentDto {
  tenantId: number;
  businessId: number | null;
  branchId: number | null;
  active: boolean;
}

interface ReplaceClientScopeAssignmentsRequest {
  clientApplicationId: number;
  assignments: ClientScopeAssignmentDto[];
}
```

Backend validation must verify ownership relationships and reject invalid or duplicate tuples. If client access is intentionally tenant-only, remove business fields from both backend and frontend instead of retaining an unusable partial hierarchy.

### 4.3 User authorization-scope administration

Add endpoints protected by dedicated user-scope VIEW and ASSIGN privileges:

```text
POST /api/v1/system/user/scope/list
POST /api/v1/system/user/scope/replace
```

Suggested DTO:

```ts
interface UserScopeAssignmentDto {
  id: number | null;
  tenantId: number;
  businessId: number | null;
  branchId: number | null;
  active: boolean;
}

interface ReplaceUserScopeAssignmentsRequest {
  userId: number;
  assignments: UserScopeAssignmentDto[];
}
```

These endpoints must update `AuthUserScopeAssignment`; they must not derive authorization from person organization membership.

### 4.4 Effective application context

Extend `/api/v1/system/privilege/context`:

```ts
interface EffectiveTenantContextDto {
  tenantId: number;
  tenantCode: string;
  hostname: string;
  scopeAssignments: Array<{
    tenantId: number;
    businessId: number | null;
    branchId: number | null;
  }>;
}

interface ApplicationContext {
  clientCode: string;
  clientType: string;
  effectiveTenant: EffectiveTenantContextDto;
  privilegeCodes: string[];
  routePolicies: RoutePrivilegePolicy[];
  uiPolicies: UiPrivilegePolicy[];
  authorizationVersion?: string;
  layout?: BackendLayoutConfig;
}
```

The effective tenant values must come from the same server-owned request context used for authorization.

### 4.5 Authoritative scope lookups

Provide scoped lookup endpoints for active tenants, businesses belonging to a tenant, and branches belonging to a business. Results must themselves be privilege- and scope-protected.

### 4.6 Route and UI policy seed data

Seed route and action policies for `SYSTEM_ADMIN_WEB`. Use the existing bootstrap privilege codes; do not invent frontend-only privilege codes.

Minimum route mapping:

| Route | Required policy |
|---|---|
| `/dashboard` | Authenticated; no administrative privilege |
| `/access-control/client-applications` | Client application VIEW |
| `/access-control/client-applications/create` | Client application MANAGE |
| `/access-control/client-applications/:id` | Client application VIEW |
| `/access-control/client-applications/:id/edit` | Client application MANAGE |
| `/access-control/api-registry` | API registry VIEW |
| `/access-control/privileges` | Privilege catalog VIEW |
| `/access-control/tenants` | Tenant administration VIEW |
| `/access-control/users` | User or role administration VIEW according to the selected route design |
| `/layout/profiles` | Layout administration VIEW |
| `/layout/navigation-tree` | Layout administration VIEW |
| `/license` | License administration VIEW |
| `/backup` | Database backup VIEW |

Create action policies for every mutation, including specialized actions such as client credential rotation, API synchronization, role assignment, privilege assignment, client tenant assignment, backup execution, and backup download.

## 5. Implementation phases

### Phase 0 — Contract confirmation and safety freeze

Objective: prevent accidental destructive use while the read contracts are missing.

Tasks:

1. Mark API, feature, and tenant assignment editors unavailable until current assignments load successfully.
2. Display a clear error if assignment reads fail.
3. Do not permit an unresolved empty state to be submitted.
4. Document full-replace semantics beside every replacement control.
5. Confirm whether client scope is tenant-only or fully tenant/business/branch hierarchical.

Acceptance gate:

- A user cannot overwrite client assignments before the current server state is known.

### Phase 1 — Client assignment read/write parity

Backend tasks:

1. Implement client detail or dedicated assignment-read endpoints.
2. Return only active assignment identifiers needed by the editor.
3. Introduce hierarchical client scope DTOs.
4. Validate tenant/business/branch relationships in the service layer.
5. Invalidate authorization cache after successful replacement.

Frontend tasks:

1. Add client detail and assignment DTOs to `access-control.model.ts`.
2. Add service methods to `ClientApplicationService`.
3. Load all current selections before rendering assignment editors.
4. Track `loading`, `loaded`, `dirty`, `saving`, and `error` independently for each assignment type.
5. Disable Save unless data is loaded and changed.
6. Show a replacement summary and confirmation.
7. Reload saved state after mutation instead of assuming the submitted state is authoritative.

Acceptance gate:

- Opening and saving an unchanged client produces no authorization change.
- Existing grants appear selected.
- A failed read can never become an empty replacement write.

### Phase 2 — Effective tenant and hierarchical scope context

Backend tasks:

1. Extend the application-context response with effective tenant and effective scope assignments.
2. Ensure values are derived from `AuthenticatedRequestContextHolder` and `EffectiveTenantAccessContextHolder`.
3. Add an authorization-context version if practical for cache invalidation.

Shared platform tasks:

1. Extend `ApplicationContext` in `@nexacore/platform`.
2. Store effective context reactively; avoid treating local storage as the authority.
3. Clear tenant/scope state on logout, user change, and failed context refresh.
4. Make malformed cached privilege data fail closed instead of throwing.

System frontend tasks:

1. Replace manual JWT `tenant_id` parsing with `ApplicationContextService`.
2. Display effective tenant code/name in the authenticated shell or page context.
3. Display business/branch scope summaries where they affect administration.
4. Translate `DATA_SCOPE_NOT_ALLOWED` into a concise scope-specific user message without revealing protected records.

Acceptance gate:

- All frontend tenant display and defaults come from a live, server-validated application context.

### Phase 3 — User scope-assignment administration

Backend tasks:

1. Add scope list and replacement endpoints.
2. Add dedicated bootstrap VIEW and ASSIGN privileges if no existing exact privilege applies.
3. Validate tuples and tenant ownership in database/service predicates.
4. Audit before/after assignment state.
5. Invalidate affected user authorization data after commit.

Frontend tasks:

1. Add an "Authorization Scopes" action to the Users table.
2. Load current assignments before opening the editor.
3. Implement dependent tenant, business, and branch selectors.
4. Support multiple normalized scope tuples.
5. Explain that organization membership does not grant application access.
6. Require explicit confirmation for full replacement.
7. Refresh the affected user and current application context when the current user's assignments change.

Acceptance gate:

- Tenant, business, and branch assignments can be administered without widening scope or conflating membership with authorization.

### Phase 4 — Route-policy enforcement

Backend tasks:

1. Seed route policies for all `system-frontend-21` routes.
2. Associate the policy set with the `SYSTEM_ADMIN_WEB` client/layout configuration.
3. Verify parameterized route matching, especially `:id` routes.

Frontend tasks:

1. Remove `data: { public: true }` from administrative routes.
2. Retain it only for deliberately privilege-neutral authenticated routes such as the dashboard.
3. Add an access-denied route instead of silently redirecting every denial to the dashboard.
4. Preserve a safe return URL only for authentication, not authorization denial.

Acceptance gate:

- Missing or unmatched policies fail closed.
- VIEW-only users cannot enter create/edit routes.
- Direct URL navigation follows the same policy as sidebar navigation.

### Phase 5 — UI action-policy enforcement

Tasks:

1. Define stable action codes for every button, row action, modal submit, and destructive operation.
2. Seed corresponding backend UI policies.
3. Apply `AuthorizedUiDirective` to declarative controls.
4. Add handler-level checks for sensitive actions.
5. Separate VIEW, MANAGE, ASSIGN, SYNCHRONIZE, ROTATE, EXECUTE, and DOWNLOAD actions.
6. Do not use broad role checks where a privilege policy exists. Retain `ROLE_SYSTEM_ADMIN` only for a backend-defined platform-only rule.

Priority action inventory:

| Area | Actions requiring policy |
|---|---|
| Client applications | Create, edit, rotate key, replace APIs, replace features, replace scopes |
| API registry | Create/edit, synchronize |
| Privileges | Catalog synchronize/save, submenu save, role assignment, user assignment |
| Users and roles | Create/edit user, assign roles, create/edit role, manage global template |
| Tenants | Register, verify domain, activate, suspend, reactivate, cancel |
| Layout | Save profiles/policies, assign/reconcile client layout, mutate/reorder navigation |
| License | Save plan/entitlements, assign/transition subscription, generate/activate key |
| Backup | Execute, view detail, download |

Acceptance gate:

- A VIEW-only account sees data but no mutation controls.
- Specialized privileges reveal only their matching actions.
- Backend denial remains effective if a handler is invoked programmatically.

### Phase 6 — Authorization refresh and revocation handling

Tasks:

1. Add `ApplicationContextService.refresh()` with single-flight behavior.
2. Refresh after changes to roles, privileges, client feature permissions, route/UI policies, and the current user's scopes.
3. On `USER_PRIVILEGE_NOT_ALLOWED` or `DATA_SCOPE_NOT_ALLOWED`, clear stale context, refresh once, and update navigation/actions.
4. Do not automatically retry mutation requests after a 403.
5. Optionally use `authorizationVersion` or a short TTL to detect stale context.
6. Keep access tokens and refresh tokens out of diagnostic output.

Acceptance gate:

- Revoked privileges disappear from the UI and are denied by the next backend request without logout.
- User A's context cannot remain visible after User B logs in on the same browser.

### Phase 7 — Authoritative tenant/business/branch selectors

Tasks:

1. Replace raw numeric fields with lookup selectors.
2. Load businesses only after tenant selection.
3. Load branches only after business selection.
4. Clear descendants when a parent selection changes.
5. Reject duplicate and invalid tuples locally while retaining backend validation.
6. Display names/codes with identifiers for auditability.
7. Avoid loading tenants or descendants the operator is not allowed to administer.

Acceptance gate:

- The frontend cannot construct a branch-without-business tuple or pair a business with the wrong tenant.

### Phase 8 — Remaining endpoint and usability parity

Review and either implement or explicitly defer:

- Direct privilege assignment to users.
- Layout profile detail.
- Client layout reconciliation.
- Navigation category list/reorder.
- License key activation.
- Workflow administration.
- Authorization audit-event viewer.
- Client get-by-ID instead of list-and-filter.

Every decision must be recorded in `MODULES.md`.

## 6. Frontend error contract

Centralize handling for stable backend errors:

| HTTP | Backend code | Frontend behavior |
|---:|---|---|
| 401 | `AUTHENTICATION_REQUIRED` | Clear invalid session and redirect to login |
| 401 | `INVALID_CLIENT_CREDENTIALS` | Show deployment/configuration failure; do not repeatedly retry |
| 403 | `API_NOT_REGISTERED` | Show configuration error with trace ID if supplied |
| 403 | `CLIENT_API_NOT_ALLOWED` | Show client grant/configuration error |
| 403 | `CLIENT_FEATURE_NOT_ALLOWED` | Show client feature-grant/configuration error |
| 403 | `USER_PRIVILEGE_NOT_ALLOWED` | Refresh context once and show access denied |
| 403 | `DATA_SCOPE_NOT_ALLOWED` | Show tenant/scope denial without object-existence information |
| 403 | `API_REGISTRY_AMBIGUOUS` | Show configuration error; disable affected operation |
| 429 | `RATE_LIMIT_EXCEEDED` | Honor `Retry-After`; disable immediate resubmission |
| 503 | `RATE_LIMIT_UNAVAILABLE` | Show temporary service unavailability |

Do not convert every 403 into logout. Authentication may still be valid.

## 7. Testing plan

### 7.1 Unit tests

Add tests for:

- Every route's expected privilege-policy behavior.
- Missing route policies failing closed.
- Action controls hidden for VIEW-only users.
- Exact specialized action privileges.
- Client assignment state loading before Save is enabled.
- Read failure never producing an empty replacement request.
- Dirty-state and confirmation behavior.
- Hierarchical scope validation.
- Application-context parsing, refresh, cleanup, and malformed cache behavior.
- User changes and logout clearing prior privilege/scope context.
- Stable backend error-code mapping.

### 7.2 HTTP service tests

Using Angular HTTP testing, verify:

- Correct endpoint and request body for each read/write operation.
- `Authorization` and `X-Client-Code` are present where required.
- No confidential API key is embedded or sent for a public browser client.
- Hierarchical scope tuples retain parent-child relationships.
- Full replacement is never called before a successful current-state read.

### 7.3 Browser tests

Create Playwright fixtures for:

1. Platform administrator with full grants.
2. VIEW-only administrator.
3. User missing the route privilege.
4. Tenant A user on tenant A hostname.
5. Tenant A token replayed or used on tenant B hostname.
6. User with business scope.
7. User with one branch scope and a sibling branch denial.
8. Revoked privilege during an active session.

Critical journeys:

- Direct URL route denial.
- Sidebar/nav visibility.
- Client assignment edit without data loss.
- API and feature grant replacement confirmation.
- User scope replacement.
- Credential rotation one-time display.
- API synchronization with specialized privilege.
- Cross-tenant resource denial.
- Context cleanup after logout and subsequent login as another user.

### 7.4 Backend alignment tests

The frontend work is not complete unless the matching backend tests in `TENANT_PRIVILEGE_API_ACCESS_CONTROL_TEST_ROADMAP.md` pass, particularly:

- `AuthenticatedRequestContextFilterTest`
- `EffectiveTenantAccessResolverTest`
- `UserPrivilegeApiAccessFilterTest`
- `AccessControlFilterChainIntegrationTest`
- `ApiMetadataCoverageTest`
- Tenant-owned object-authorization tests

## 8. Verification commands

Frontend checks:

```bash
cd frontendApplications/system-frontend-21
npm test
npm run build
npm run test:e2e
```

Shared platform changes:

```bash
cd frontendApplications/frontend-libs-21
npm test
npm run build
```

Backend checks:

```bash
cd backend
mvn -Dtest=AuthenticatedRequestContextFilterTest,EffectiveTenantAccessResolverTest,UserPrivilegeApiAccessFilterTest test
mvn -Dtest=AccessControlFilterChainIntegrationTest,ApiMetadataCoverageTest test
mvn test
```

Live verification must use the actual backend and a registered `SYSTEM_ADMIN_WEB` client on a hostname resolvable to the intended tenant.

## 9. Deployment prerequisites

Before enabling route and action enforcement in an environment:

1. Register `SYSTEM_ADMIN_WEB` as a public browser-compatible client.
2. Configure every allowed HTTP(S) origin explicitly.
3. Assign the client to each permitted tenant.
4. Synchronize API registry metadata.
5. Grant the client only required APIs and feature privileges.
6. Seed route and UI policies.
7. Assign administrator roles, privileges, and hierarchical scopes.
8. Load the application context successfully in REPORT mode.
9. Review would-deny events and correct metadata/grants.
10. Switch to ENFORCE without deleting registry or permission data.

Rollback changes enforcement mode only. It must not erase API registry, client grant, route-policy, UI-policy, role, privilege, or scope-assignment data.

## 10. Definition of done

Implementation is complete when:

- No administrative route is open through `public: true` except explicitly privilege-neutral authenticated routes.
- Every mutation control is governed by a server-delivered UI policy and an exact backend privilege.
- Current client assignments load before any replacement operation is enabled.
- Client and user scopes preserve tenant/business/branch tuples.
- User authorization scopes have a supported administration UI.
- The frontend consumes a server-validated effective tenant context instead of decoding tenant authority itself.
- Revocation refreshes frontend state and is enforced by the next backend request.
- `SYSTEM_ADMIN_WEB` operates without a browser-embedded secret.
- Unit, HTTP, Playwright, backend filter-chain, and object-authorization tests pass.
- Cross-tenant IDs cannot be used to view or mutate protected data.
- `MODULES.md` documents all implemented and intentionally deferred endpoints.

