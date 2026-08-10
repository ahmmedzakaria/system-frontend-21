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

## Dashboard

Route: `dashboard` (`pages/dashboard/`). Four static cards — Client Applications,
Privileges, Layout Profiles, Active Licenses — one per module below. The cards are
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

A route added to `app.routes.ts` with no matching migration still works by direct URL
— it just won't appear in the sidebar until the backend catches up. Every route in this
app is currently `data: { public: true }` at the Angular route-guard level (backend
`routePolicies`/`uiPolicies` aren't seeded yet — see the comment block at the top of
`app.routes.ts`); real authorization is enforced entirely server-side by each
endpoint's `@PrivilegeApi` code, not by the frontend guard.

---

## Phase 1 — Access Control

### Client Applications

- Routes: `access-control/client-applications` (list), `.../create` and
  `.../:id/edit` (editor), `.../:id` (detail).
- Components: `client-applications-list.component.ts`,
  `client-application-editor.component.ts`, `client-application-detail.component.ts`.
- Model: `pages/access-control/access-control.model.ts`.
- Backend endpoints: `client-app/list`, `client-app/save`, `client-app/rotate-api-key`,
  `client-app/assign-api-permissions`, `client-app/assign-feature-permissions`,
  `client-app/assign-tenants`.
- `ClientApplicationDto`: `id`, `clientCode`, `clientName`, `clientType`
  (`WEB`|`MOBILE`|`POS`|`ERP`|`PARTNER_PORTAL`|`INTERNAL_SERVICE`), `status`
  (`ACTIVE`|`DISABLED`|`SUSPENDED`|`EXPIRED`), `allowedOrigins`, `allowedIps`,
  `rateLimitPerMinute`, `description`.
- The detail page is where a client's API/feature/tenant permissions are actually
  granted — three **full-replace** assignment calls
  (`ClientPermissionAssignmentRequestDto`): the submitted `apiRegistryIds[]` /
  `privilegeCodes[]` / tenant-business id pairs become the client's *entire* set for
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
  `type`, `icon`, `description`, `route`, `active`, `displayOrder`, `privilegeCodes[]`,
  `children[]`. The `id`/`parentId`/`active`/`displayOrder` fields were added to the
  backend response specifically for this page — without them there was no way to
  resolve a newly-created node's id to use as a `parentId` for its child, or to
  pre-fill an edit form's `active`/`displayOrder` without silently resetting them.
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
