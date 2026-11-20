# System Frontend 21 — Module Reference

This is the content-level companion to `AGENTS.md` (which covers conventions/rules).
`AGENTS.md` says how to build in this app; this document says what has actually been
built — every route, the backend endpoints each page talks to, and the DTO shapes in
play. Update it whenever a module's routes, endpoints, or model shapes change; it is
the only persistent record of this — the Plan-Mode scratch file at
`/home/zahmmed/.claude/plans/dreamy-swimming-bubble.md` is overwritten by whichever
phase was planned most recently and does not retain history.

All backend endpoints below are relative to `/api/v1/system/...` and are defined in
`backend/src/main/java/com/nexacore/systemmodule/`. All frontend endpoint constants
live in `src/app/core/api/api-endpoints.ts`.

## Machine-readable feature contract

`src/app/core/authorization/system-feature-contract.ts` is the enforceable inventory
for every protected application route, UI action, app-owned endpoint, required backend
privilege, and declared data scope. Tests require every `ApiEndpoints` entry to occur
exactly once and every protected Angular route to occur in the contract. When adding or
removing an endpoint, route, or action, update this contract in the same change.

Backend `SystemAdminWebApiContractTest` verifies that the frontend's required endpoint
families still exist with reviewed annotations. `SystemDatabaseMigrationTest` verifies
the upgraded-database V49 lifecycle and V50 administration-read grants after seeding annotation-discovered API rows.
`DataSeeder` reconciles `SYSTEM_ADMIN_WEB` route/UI policies at every startup, so a
previous migration that inserted no link cannot leave the application permanently
without its policy. Bootstrap privilege rows are migration-seeded before the navigation
migrations, while application startup synchronizes their catalog representation.

V49 is intentionally limited to authenticated application context, session status, and
logout. Feature API/privilege grants remain owned by their feature migrations and
fresh-install seeding.

## Dashboard

Route: `dashboard` (`pages/dashboard/`). Five static cards — Client Applications,
Privileges, Layout Profiles, Active Licenses, Database Backups — one per module below. The cards are
purely presentational (`dashboard.component.ts`'s `stats` array): no live counts, no
`routerLink`, no click handlers. Navigation to each module happens exclusively through
the sidebar nav tree, which is backend-seeded (see "Nav tree seeding" below) — not
through the dashboard.

## Nav tree seeding

Every module's sidebar entry is seeded by an idempotent Flyway migration under
`backend/src/main/resources/db/migration/system/`, all following the same
`WHERE NOT EXISTS` template first established by `V24`:

| Migration | Feature(s) added | Feature group | Gating privilege |
|---|---|---|---|
| `V24` | Dashboard (no privilege — public) | — | — |
| `V25` | Client Applications, API Registry | `ACCESS_CONTROL` | `CLIENT_APPLICATION_VIEW` / `API_REGISTRY_VIEW` |
| `V27` | Privileges | `ACCESS_CONTROL` | privilege catalog's own VIEW code |
| `V28` | Layout Profiles, Navigation Tree | `ACCESS_CONTROL` | `LAYOUT_ADMINISTRATION_VIEW` (`11040100101`) |
| `V29` | License Administration | `ACCESS_CONTROL` | `LICENSE_ADMINISTRATION_VIEW` (`11030199901`) |
| `V32` | Database Backup | `ACCESS_CONTROL` | `DATABASE_BACKUP_VIEW` (`11060100101`) |
| `V50` | Separate Role Administration | `ACCESS_CONTROL` | `ROLE_ADMINISTRATION_VIEW` (`11020100801`) |

A route added to `app.routes.ts` with no matching migration will fail closed when
opened directly. Phase 4 removed the administrative `data: { public: true }` bypasses;
only the non-privileged dashboard remains explicitly public. Administrative routes
and specialized controls now consume the backend-seeded route/UI policies, while
backend `@PrivilegeApi` enforcement remains authoritative.

---

## Phase 1 — Access Control

### Client Applications

- Routes: `access-control/client-applications` (list), `.../create` and
  `.../:id/edit` (editor), `.../:id` (detail).
- Route: `access-control/client-api-permission` provides a focused application
  selector and full-replacement API assignment workflow backed by
  `client-app/api-permissions` and `client-app/assign-api-permissions`.
- Route: `client-feature-permission` provides the equivalent tenant-scoped
  feature privilege assignment workflow backed by `client-app/feature-permissions`
  and `client-app/assign-feature-permissions`.
- Components: `client-applications-list.component.ts`,
  `client-application-editor.component.ts`, `client-application-detail.component.ts`.
- Model: `pages/access-control/access-control.model.ts`.
- Backend endpoints: `client-app/list`, `client-app/detail`, `client-app/save`, `client-app/rotate-api-key`,
  `client-app/api-permissions`, `client-app/feature-permissions`, `client-app/scope-assignments`,
  `client-app/assign-api-permissions`, `client-app/assign-feature-permissions`,
  `client-app/assign-tenants`.
- `ClientApplicationDto`: `id`, `clientCode`, `clientName`, `clientType`
  (`WEB`|`MOBILE`|`POS`|`ERP`|`PARTNER_PORTAL`|`INTERNAL_SERVICE`), `status`
  (`ACTIVE`|`DISABLED`|`SUSPENDED`|`EXPIRED`), `allowedOrigins`, `allowedIps`,
  `rateLimitPerMinute`, `description`.
- The detail page loads one authoritative administration-detail snapshot before a client's API/feature/scope permissions are
  granted — three **full-replace** assignment calls
  (`ClientPermissionAssignmentRequestDto`): the submitted `apiRegistryIds[]` /
  `privilegeCodes[]` / normalized `{tenantId,businessId,branchId}` tuples become the client's *entire* set for
  that dimension, not an add. This is the same "full-replace" pattern later reused (and
  the same footgun later caught) in Layout's UI Policies and License's Subscriptions.
- Rotating an API key (`rotate-api-key`) returns a `GeneratedClientCredentialDto`
  (`clientCode`, `clientId`, `apiKey`) shown once in a "copy it now" modal — this is the
  precedent the License module's one-time key-reveal modal was copied from.

### API Registry

- Route: `access-control/api-registry`.
- Component: `api-registry-list.component.ts`. Model: `api-registry/api-registry.model.ts`.
- Backend endpoints: `api-registry/list`, `api-registry/save`, `api-registry/sync`,
  `api-registry/inventory`.
- `ApiRegistryDto` is the row shape for every `@PrivilegeApi`/`@AuthenticatedApi`
  controller method in the backend: `apiCode`, `httpMethod`, `pathPattern`,
  module/submodule/featureType/feature/action code+name pairs,
  `requiredPrivilegeCode`, `publicApi`, `clientAuthenticationRequirement`
  (`NONE`|`OPTIONAL`|`REQUIRED`), `userAuthorizationRequirement` (`NONE`|`PRIVILEGE`),
  `dataScope` (`NONE`|`TENANT`|`BUSINESS`|`BRANCH`), `source`, `priority`,
  `lastSynchronizedAt`, `active`.
- **Sync** (`api-registry/sync`) is what actually populates this table — it introspects
  every `@ClientSecuredApi`/`@PrivilegeApi`-annotated controller method at runtime and
  upserts a row per endpoint (`ApiRegistrySyncReportDto`: added/changed/unchanged/
  deactivated/conflicted counts + `conflicts[]` + the full updated `records[]`). Every
  endpoint added by a later phase (Layout, License) must be synced here before
  `ClientApiAccessFilter` can grant a client access to it — this is the same mechanism
  that resolved the `X-Client-Code`/`SYSTEM_ADMIN_WEB` permission gap found while
  verifying the License module live (see the `sys_priv_client_api_permissions` /
  `sys_priv_client_feature_permissions` join tables in `ClientAccessDecisionServiceImpl`).
- **Reference implementation for two `@nexacore/shared` "Dynamic*" components**:
  the Registered/Inventory tabs use `app-dynamic-tab` (`DynamicTabConfig`'s `loadItems`/
  `columns` variant — no hand-rolled tab-bar markup/state), and the "New/Edit Entry"
  dialog uses `app-dynamic-modal` (`fields`/`initialValue`/`columns` in, `(closed)`/
  `(submitted)` out — no hand-rolled `app-modal` + `app-dynamic-form` + Cancel/Save
  button row). Both replaced markup that used to be copy-pasted per page; License
  Administration (below) is migrated onto both too — see its note for the 4th
  `DynamicTabConfig` variant (`filters`/`ready`) that migration required. Privileges,
  Profiles & Policies, and Navigation Tree still use the older hand-rolled
  `app-modal`/tab-bar patterns those two components were extracted from.

### Users & Roles

- Routes: `access-control/users`, `access-control/roles`, and
  `access-control/roles/:id/privileges`, independently guarded by User and Role view privileges.
- Components: `users/user-list.component.ts` owns users, role assignment, and user scopes;
  `roles/role-administration.component.ts` owns global/tenant roles and role privileges.
- Backend endpoints include authoritative `user/detail`, `user/role-assignments`,
  `role/detail`, and `role/privilege-assignments` reads in addition to list/save/replacement APIs.
  Assignment reads return `{version, items}`; role and privilege full replacements require
  that version and reject stale state before deleting anything. `AuthUser`/`AuthRole` (`auth_users`/`auth_roles`,
  linked via `auth_user_roles`) previously had no REST API at all, only
  `DataSeeder`'s hardcoded `CommandLineRunner`. The new `UserController`/
  `RoleController` live in `authmodule.core.controller` (not `systemmodule`) since
  they operate on `authmodule` entities directly, the same way
  `AuthModuleGatewayImpl`/`MyUserDetailsService` already do — `@PrivilegeApi`/
  `@PreAuthorize("@privilegeAuthorizer...")` work identically regardless of which
  package a controller lives in, so no module-gateway plumbing was needed.
- `UserDto`: `id`, `username`, `personId`, `personName`, `email`, `mobile`,
  `enabled`, `roles: RoleDto[]`, `lastLoginAt`. `RoleDto`: `id`, `name`.
- **Creating a user auto-provisions a lightweight Person** via the existing
  `PersonModuleGateway.ensurePersonForUser(username, email, mobile, firstName,
  lastName)` — the same helper `DataSeeder` already calls — rather than requiring
  an existing KYC person to be picked first. `email`/`mobile`/`firstName`/
  `lastName` in `UserRequestDto` only take effect on create; the backend
  intentionally ignores them on update (editing an existing Person is the KYC
  Person module's job, not this form's) — the create/edit modal shares one field
  list regardless, since the create-only fields simply have no effect when editing.
- **Password footgun, guarded against**: the same modal serves create and edit,
  so a blank `password` on update must mean "leave it unchanged", not "clear the
  password" — `UserAdminServiceImpl.saveUser()` only calls
  `passwordEncoder.encode(...)` when the request's password is non-blank.
  Password is required (validated) on create.
- **No multi-select field type exists anywhere in `@nexacore/shared`** (`FieldConfig`
  only has single-value checkbox/radio/dropdown/dynamic-dropdown/card-selector) — so
  "assign roles to a user" reuses `client-application-detail.component`'s
  hand-rolled pattern instead: a plain `app-modal` (not `app-dynamic-modal`, since
  there's no `FieldConfig` for a role checklist) containing a `.checklist` of
  `app-checkbox` bound via `[ngModel]`/`(ngModelChange)` to a `Set<number>` signal,
  with a full-replace "Save" button calling `user/assign-roles` — same semantics as
  `client-app/assign-feature-permissions`.
- Role CRUD has no delete — deleting a role still referenced by users/privileges
  is a real footgun, and the Privilege catalog itself has no delete either.
- New privilege codes: `USER_ADMINISTRATION_VIEW`/`_MANAGE`/`_ASSIGN`
  (`11020100701`/`787`/`781`) and `ROLE_ADMINISTRATION_VIEW`/`_MANAGE`
  (`11020100801`/`887`), registered in `BootstrapAdministrationPrivilegeProvider`
  (feature codes `007`/`008` under `SYSTEM_ACCESS_CONTROL`) and seeded into the
  sidebar nav tree by `V33__seed_user_role_administration_navigation.sql`
  (same pattern as `V29__seed_license_navigation.sql`). Nav-seeding migrations
  depend on the privilege catalog row already existing — since that row is
  populated by `DataSeeder` at every app boot (not by a migration), the
  privilege-provider code must ship and the backend restart *once* before a nav
  migration referencing its code can run, or the migration's `INSERT ... SELECT`
  silently inserts nothing and (since Flyway migrations only ever run once) never
  retries.
- User creation now obtains its tenant ID from the live backend application context,
  never by decoding the JWT. User scope administration uses normalized tuples and the
  shared load-before-replace state machine; authorization context is refreshed after
  user, role, privilege, or scope mutations.

---

## Phase 2 — Privileges

- Route: `access-control/privileges` (2 tabs: Privilege Catalog, Sub Menus).
- Component: `privileges-list.component.ts`. Model: `privileges/privileges.model.ts`.
- Backend endpoints: `privilege/list`, `privilege/save`, `privilege/sub-menu/list`,
  `privilege/sub-menu/save`.
- `PrivilegeDto`: `id`, `privilegeCode` (server-generated from the module/submodule/
  featureType/feature/action codes below), module/submodule/featureType/feature/action
  code+name pairs, `subMenuId`/`subMenuName`/`subMenuUrl`, `active`.
- `SubMenuDto`: `id`, `name`, `url`, `icon`, the same module/submodule/featureType/
  feature/action code+name pairs, `menuOrder`, `subMenuOrder`, `active`.
- This is the catalog every other module's `*_VIEW`/`*_MANAGE` privilege codes are
  drawn from (e.g. `LICENSE_ADMINISTRATION_VIEW` = `11030199901` was seeded here by
  `V21__seed_bootstrap_administration_privileges.sql`, then centrally exposed via
  `BootstrapAdministrationPrivileges.java`). Do not invent new privilege codes on the
  frontend — they must already exist in this catalog server-side (see `AGENTS.md`).

---

## Phase 3 — Layout Administration

- Routes: `layout/profiles` (3 tabs: Profiles, UI Policies, Client Assignment),
  `layout/navigation-tree` (5 tabs: Module Groups, Modules, Categories, Feature
  Groups, Features).
- Components: `profiles-policies-list.component.ts`, `navigation-tree.component.ts`.
  Model: `pages/layout/layout.model.ts`.
- Backend endpoints: `layout/profile/list`+`save`, `layout/ui-policy/list`+`save`,
  `layout/client/list`+`assign`, `layout/navigation/tree` (sidebar-facing, prunes
  branches with no privilege-visible feature), `layout/navigation/tree/admin`
  (admin-facing, **unpruned** — added specifically for this page, see below),
  `layout/navigation/{group,module,category,feature-group,feature}/save`.

### Layout Profiles / UI Policies / Client Assignment

- `LayoutProfileDto`: `id`, `code`, `name`, `description`, `layoutType`
  (`SIDEBAR`|`HORIZONTAL`|`RAIL`|`COMPACT`|`PUBLIC`), `navigationMode`
  (`MODULE_LIST`|`MODULE_GROUP_MEGA_PANEL`), `themeMode` (`LIGHT`|`DARK`|`SYSTEM`),
  `density` (`COMFORTABLE`|`COMPACT`|`DENSE`), 7 boolean shell toggles, `active`,
  `brand`. Note the request DTO uses `profileCode`/`profileName`, the response uses
  `code`/`name` — a real backend naming asymmetry, not a frontend bug.
- `UiPrivilegePolicyDto`: `actionCode`, `matchMode` (`ANY`|`ALL`), `privilegeCodes[]`
  — no `clientCode` in the response (a real backend gap), so the editor defaults
  `clientCode` to whatever the tab's client-code filter is currently set to.
- **UI Policy save is full-replace**: `LayoutUiPolicyServiceImpl` deletes all existing
  privilege links for a policy then reinserts exactly the submitted `privilegeCodes[]`.
  Submitting an empty array on an edit would silently wipe the policy's privileges — the
  editor uses a comma-separated `privilegeCodesText` field + `joinPrivilegeCodes`/
  `splitPrivilegeCodes` helpers specifically to round-trip the existing codes rather
  than risk this.
- `ClientLayoutAssignmentDto`: links a client (by `clientApplicationId`/`clientCode`) to
  a layout profile (by `layoutProfileId`/`profileCode`) with `assignmentScope`
  (`CLIENT`|`ROLE`|`PRIVILEGE`|`DEVICE`|`MODULE`), `deviceTarget`
  (`ANY`|`DESKTOP`|`TABLET`|`MOBILE`), `defaultProfile`, `selectable`, `displayOrder`.

### Navigation Tree

- `NavNodeDto` mirrors the backend's 5-level nav hierarchy (`ModuleGroup > Module >
  Category > FeatureGroup > Feature`): `id`, `parentId`, `code`, `tCode`, `label`,
  `type`, `categoryKind`, `featureTypeCode`, `icon`, `description`, `route`, `active`, `displayOrder`, `privilegeCodes[]`,
  `children[]`. The `id`/`parentId`/`active`/`displayOrder` fields were added to the
  backend response specifically for this page — without them there was no way to
  resolve a newly-created node's id to use as a `parentId` for its child, or to
  pre-fill an edit form's `active`/`displayOrder` without silently resetting them.
- Navigation categories carry an optional two-digit `featureTypeCode` from the privilege
  catalog. Existing Setup/Operation/Report categories are backfilled to `01`/`02`/`03`;
  categories without a trusted semantic match remain unset until edited.
- **Two response shapes, one DTO**: `layout/navigation/tree` (used by the real app
  sidebar) prunes any branch that terminates in no privilege-visible feature — correct
  for a sidebar, wrong for this admin page, where a freshly-created empty
  `ModuleGroup`/`Module`/etc. must still be visible so an admin can build out its
  children. `layout/navigation/tree/admin` is the same tree, unpruned, added
  specifically for this page (`LayoutNavigationServiceImpl.getFullNavigationTree()`).
  Reusing the sidebar endpoint here was the original (wrong) approach; a newly-created
  `TEST_GROUP` silently vanishing from the list — despite `POST .../group/save`
  returning 200 with a real id — was the symptom that surfaced it during verification.
- **Feature privilege-code sync is append-only** (not full-replace like UI Policies):
  `syncFeaturePrivileges` never clears/dedupes existing links, so resubmitting the same
  `privilegeCodesText` repeatedly creates duplicate join rows over time. Safe from
  data loss, not from duplication — treat the field as "codes to add," not "codes to
  set," and avoid resubmitting unchanged values.
- Category reordering has its own dedicated backend endpoint
  (`layout/navigation/category/reorder`) that this page intentionally does not use —
  reordering is done by editing a category's `displayOrder` field directly instead of
  building a separate drag-and-drop UI.

---

## Phase 4 — License Administration

- Route: `license` (4 tabs: Plans, Subscriptions, Entitlements, Keys).
- Component: `license-list.component.ts`. Model: `pages/license/license.model.ts`.
- Backend endpoints: `license/plan/list`+`save`, `license/plan/entitlement/list`+`save`,
  `license/subscription/list`+`assign`+`suspend`+`reactivate`+`cancel`,
  `license/subscription/entitlement/list`+`save`, `license/key/list`+`generate`.
  (`license/key/activate`, `license/key/validate`, `license/decision/check` exist on the
  backend but have no admin-console UI — see "Explicitly out of scope" below.)
- **Second reference implementation for `app-dynamic-tab`/`app-dynamic-modal`** (see
  API Registry above for the first). All 4 tabs and 4 of the page's 5 modals are
  migrated: Plans/Subscriptions use the plain `loadItems`/`columns` tab variant;
  Entitlements/Keys needed a shape those variants couldn't express — a filter
  dropdown (or two) gating a conditionally-rendered list — so `DynamicTabConfig`
  gained a 4th variant, `DynamicTabFilteredListConfig` (`filters: TabFilterFieldConfig[]`,
  `ready: boolean`, `emptyFilterHint: string`, plus the usual list props), rendered via
  `app-dropdown` + standalone `[ngModel]` inside `DynamicTabComponent` itself. The
  "License Key Generated" modal (no form/buttons, a one-time credential display) and
  the Suspend/Reactivate/Cancel `app-confirm-dialog` flow are intentionally **not**
  migrated — neither fits `DynamicModalComponent`'s form-in/form-out contract.

### Plans

- `LicensePlanDto`: `id`, `planCode`, `planName`, `planType`
  (`TRIAL`|`STANDARD`|`ENTERPRISE`|`CUSTOM`|`INTERNAL`), `billingCycle`
  (`NONE`|`MONTHLY`|`QUARTERLY`|`YEARLY`|`CUSTOM`), `trialDays`, `description`, `active`.

### Subscriptions

- `LicenseSubscriptionDto`: `id`, `subscriptionCode`, `planCode`, owner
  (`tenantId`/`businessId`/`clientApplicationId` — at least one required), `status`
  (`DRAFT`|`ACTIVE`|`TRIAL`|`GRACE_PERIOD`|`EXPIRED`|`SUSPENDED`|`CANCELLED`|
  `REVOKED`), `startsAt`/`expiresAt`/`gracePeriodEndsAt`, `autoRenew`.
- The editor form has **no status field**. Status changes go through 3 dedicated row
  actions (Suspend — with a reason, via a projected textarea in a shared
  `ConfirmDialogComponent` — Reactivate, Cancel), each calling its own endpoint.
- **Footgun, fixed**: `assignSubscription()` is used for both create *and* edit (it
  looks up by `id` when present), and defaults `status` to `ACTIVE` whenever the
  request's `status` is `null`. Since the form never sends a status, editing an
  already-`SUSPENDED`/`CANCELLED` subscription would silently reactivate it unless the
  frontend explicitly threads the row's *current* status back through on save. The
  editor captures `status` in a private field (`editingSubscriptionStatus`, alongside
  `editingId`) when opening, not from any form control, and passes it through
  unchanged. Verified live: suspend → edit (no status field touched) → save → status
  is still `SUSPENDED`.
- Dates (`startsAt`/`expiresAt`/`gracePeriodEndsAt`) use `DynamicForm`'s `type: 'date'`
  field — the first use of that field type in either frontend app. `DatePickerComponent`
  both emits and expects a plain `YYYY-MM-DD` string (`toIsoDate`/`parseIsoDate` in
  `@nexacore/shared`'s `date-utils.ts`), **not** a `Date` object — `toIsoOrNull`/
  `toDateOnly` in `license.model.ts` handle the string ↔ `LocalDateTime` conversion in
  both directions. Assuming a `Date` object here (the natural first guess) silently
  drops every date field on save with no error.

### Entitlements

- `LicenseEntitlementDto`: `id`, `ownerCode` (the plan or subscription code),
  `entitlementType` (`MODULE`|`SUBMODULE`|`FEATURE`|`ACTION`|`API`|`LIMIT`|`ADD_ON`),
  `moduleId`/`submoduleId`/`featureId`/`privilegeId`/`apiRegistryId` (whichever is
  relevant to `entitlementType`), `limitCode`/`limitValue` (for `LIMIT` type),
  `overrideMode` (`ALLOW`|`DENY`|`LIMIT_OVERRIDE` — **subscription overrides only**,
  always `null` for plan entitlements), `active`.
- An owner-type toggle (Plan / Subscription) plus a dependent dropdown drives which
  list/save endpoint pair is used — same "select an owner first" pattern as Layout's
  Client Assignment tab. Create-only: the backend has no update-by-id for entitlements,
  only inserts, so there is no Edit action.
- `DynamicForm` has no conditional field visibility, so all 5 target-id fields
  (module/submodule/feature/privilege/apiRegistry) render unconditionally, labelled
  "if type=X" — the same simplification already made for Layout's privilege-codes
  field, applied here for the same reason (no conditional-field support in the shared
  form component).
- The `listPlanEntitlements`/`listSubscriptionEntitlements` service methods, their
  repository queries, and the `plan/entitlement/list`/`subscription/entitlement/list`
  endpoints did not exist before this page — the backend had write-only entitlement
  endpoints (`savePlanEntitlement`/`saveEntitlementOverride`) with no way to see what
  had already been granted. Added alongside a new `LicenseEntitlementResponseDto`.

### Keys

- `LicenseKeySummaryDto` (list-safe): `id`, `subscriptionCode`, `keyPrefix`, `issuedAt`,
  `activatedAt`, `lastValidatedAt`, `expiresAt`, `revokedAt`, `active`. **Never includes
  the hash or raw key.**
- A subscription-code filter dropdown drives the list (same pattern as Entitlements'
  owner picker). "New Key" opens a normal form (`expiresAt`, optional
  `activationFingerprint`), but on success does **not** close-and-reload like every
  other editor on this page — it opens a second, distinct modal showing the returned
  `GeneratedLicenseKeyDto.rawLicenseKey` in a read-only field with a "this will not be
  shown again, copy it now" warning (mirroring `client-application-detail.component.ts`'s
  API-key-rotation modal from Phase 1). Closing that modal is what reloads the Keys
  list — the raw key is generated server-side once, SHA-256 hashed for storage, and
  genuinely unrecoverable after this point.
- The `listKeys` service method, its repository query, and the `key/list` endpoint did
  not exist before this page, for the same reason as the Entitlements gap above — added
  alongside `LicenseKeySummaryDto`.
- **Explicitly out of scope**: no UI for `key/activate`/`key/validate` — those represent
  a license-consuming client's own activation flow, not an action a system
  administrator takes from this console. No UI for key revocation — no backend service
  method exists for it at all (would need its own backend addition). No UI for
  `UsageSnapshot`/`AuditEvent` — read-only telemetry tables with no admin save-side use
  case and no backend list methods.

---

## Phase 5 — Database Backup Administration

- Route: `backup`; component/model: `pages/backup/backup-list.component.*` and
  `backup.model.ts`; service: `core/services/backup.service.ts`.
- Backend endpoints: `backup/run`, `backup/list`, `backup/detail`, and
  `backup/download`.
- `run` is asynchronous and returns a queued `BackupJobDto`; the list is
  server-paginated and displays manual/scheduled trigger, job state, actor, timestamps,
  encrypted artifact size, and download action.
- Backend privileges are independently split into view (`11060100101`), execute
  (`11060100113`), encrypted download/export (`11060100104`), delivery retry
  (`11060100180`), and manage (`11060100187`). Version 1 exposes view, execute, and
  download APIs; recipient and attachment-delivery settings remain environment managed.
- Successful jobs contain independently consistent custom-format PostgreSQL dumps for
  `auth_db`, `system_db`, `kyc_db`, `gisdb`, and `log_db`, packaged into an AES-256-GCM
  encrypted ZIP stream. The key is server configuration and is never returned to the
  frontend or included in notification email.
- The backend utility is disabled by default. It requires `pg_dump`, a dedicated local
  storage path, and a Base64-encoded 32-byte encryption key before `run` succeeds.
- Full database backup is platform administration, not tenant export. Tenant users are
  never granted these privileges.
- Notification email can optionally attach the encrypted artifact when explicitly
  enabled and below the configured size cap; larger artifacts fall back to
  notification-only delivery. Explicitly deferred from version 1: short-lived
  single-use download tokens, automated isolated restore verification, MinIO backup,
  and off-host replication. The implementation plan records these recovery phases.

---

## Shared frontend bugs found and fixed across these phases

Two bugs recurred across modules and are worth knowing about before adding a new page:

1. **`DynamicListComponent` loads once before its data is ready.** A list's
   `loadItems` loader can be called before an async prerequisite (e.g. a full tree
   fetch, or a `ClientApplicationService.list()` call) resolves, and the component does
   not re-invoke it on its own when the backing signal updates later — the list is left
   showing an empty state. Fix: capture a `viewChild<DynamicListComponent<T>>('ref')`
   for every list on the page and call `.reload()` explicitly once the prerequisite
   data actually arrives (and again after every save). Every list in Layout and License
   does this.
2. **`DynamicFormComponent` resets on every change-detection cycle if `[initialValue]`
   is bound to a plain method call or object literal instead of a signal.** The
   component has an `effect()` keyed on the `initialValue` input's object identity;
   template expressions like `[initialValue]="someMethod()"` or `[initialValue]="{}"`
   produce a new object reference on every CD tick, which the effect treats as a real
   change and uses to reset the form — silently discarding whatever the user just
   typed, often before the value is ever read on submit. Fix: always bind
   `[initialValue]` to a `signal<Record<string, unknown>>({})` set exactly once when
   the editor opens (this is why every editor on every page follows the
   `xEditorInitialValue.set(...)` / `[initialValue]="xEditorInitialValue()"` pattern —
   deviating from it, even for a "simple" create-only form, reproduces this bug).
