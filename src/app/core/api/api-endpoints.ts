import { ActionTypes, ApiEndpoint } from '@nexacore/platform';

// Login/session/privilege-context endpoints are already self-contained inside
// @nexacore/platform's AuthService/ApplicationContextService — do not
// redeclare them here. This file only holds endpoints specific to this app's
// own pages (Access Control, Privilege, Layout, License), added module by
// module as each phase is implemented.
export const ApiEndpoints = {
    SYSTEM_DASHBOARD_AGGREGATE: { apiPath: 'system/dashboard/aggregate', actionType: ActionTypes.SEARCH },
    // Access Control — Client Applications
    CLIENT_APP_SAVE: { apiPath: 'system/client-app/save', actionType: ActionTypes.CREATE },
    CLIENT_APP_LIST: { apiPath: 'system/client-app/list', actionType: ActionTypes.SEARCH },
    CLIENT_APP_DETAIL: { apiPath: 'system/client-app/detail', actionType: ActionTypes.SEARCH },
    CLIENT_APP_API_PERMISSIONS: { apiPath: 'system/client-app/api-permissions', actionType: ActionTypes.SEARCH },
    CLIENT_APP_FEATURE_PERMISSIONS: { apiPath: 'system/client-app/feature-permissions', actionType: ActionTypes.SEARCH },
    CLIENT_APP_SCOPE_ASSIGNMENTS: { apiPath: 'system/client-app/scope-assignments', actionType: ActionTypes.SEARCH },
    CLIENT_APP_ROTATE_API_KEY: { apiPath: 'system/client-app/rotate-api-key', actionType: ActionTypes.UPDATE },
    CLIENT_APP_ASSIGN_API_PERMISSIONS: { apiPath: 'system/client-app/assign-api-permissions', actionType: ActionTypes.UPDATE },
    CLIENT_APP_ASSIGN_FEATURE_PERMISSIONS: { apiPath: 'system/client-app/assign-feature-permissions', actionType: ActionTypes.UPDATE },
    CLIENT_APP_ASSIGN_TENANTS: { apiPath: 'system/client-app/assign-tenants', actionType: ActionTypes.UPDATE },
    AUTH_POLICY_LIST: { apiPath: 'system/auth-policy/list', actionType: ActionTypes.SEARCH },
    AUTH_POLICY_SAVE: { apiPath: 'system/auth-policy/save', actionType: ActionTypes.UPDATE },

    // Access Control — API Registry
    API_REGISTRY_INVENTORY: { apiPath: 'system/api-registry/inventory', actionType: ActionTypes.SEARCH },
    API_REGISTRY_LIST: { apiPath: 'system/api-registry/list', actionType: ActionTypes.SEARCH },
    API_REGISTRY_SEARCH: { apiPath: 'system/api-registry/search', actionType: ActionTypes.SEARCH },
    API_REGISTRY_INVENTORY_SEARCH: { apiPath: 'system/api-registry/inventory/search', actionType: ActionTypes.SEARCH },
    API_REGISTRY_SAVE: { apiPath: 'system/api-registry/save', actionType: ActionTypes.CREATE },
    API_REGISTRY_SYNC: { apiPath: 'system/api-registry/sync', actionType: ActionTypes.UPDATE },
    API_REGISTRY_SYNC_PREVIEW: { apiPath: 'system/api-registry/sync/preview', actionType: ActionTypes.SEARCH },
    API_REGISTRY_SYNC_APPLY: { apiPath: 'system/api-registry/sync/apply', actionType: ActionTypes.UPDATE },

    // Access Control — Users & Roles
    USER_LIST: { apiPath: 'system/user/list', actionType: ActionTypes.SEARCH },
    USER_DETAIL: { apiPath: 'system/user/detail', actionType: ActionTypes.SEARCH },
    USER_ROLE_ASSIGNMENTS: { apiPath: 'system/user/role-assignments', actionType: ActionTypes.SEARCH },
    USER_SAVE: { apiPath: 'system/user/save', actionType: ActionTypes.CREATE },
    USER_ASSIGN_ROLES: { apiPath: 'system/user/assign-roles', actionType: ActionTypes.CREATE },
    USER_SCOPE_ASSIGNMENTS: { apiPath: 'system/user/scope-assignments', actionType: ActionTypes.SEARCH },
    USER_REPLACE_SCOPE_ASSIGNMENTS: { apiPath: 'system/user/replace-scope-assignments', actionType: ActionTypes.UPDATE },
    ROLE_LIST: { apiPath: 'system/role/list', actionType: ActionTypes.SEARCH },
    ROLE_DETAIL: { apiPath: 'system/role/detail', actionType: ActionTypes.SEARCH },
    ROLE_PRIVILEGE_ASSIGNMENTS: { apiPath: 'system/role/privilege-assignments', actionType: ActionTypes.SEARCH },
    ROLE_SAVE: { apiPath: 'system/role/save', actionType: ActionTypes.CREATE },
    GLOBAL_ROLE_SAVE: { apiPath: 'system/role/global/save', actionType: ActionTypes.CREATE },

    // Tenant control plane
    TENANT_REGISTER: { apiPath: 'system/tenants/register', actionType: ActionTypes.CREATE },
    TENANT_LIST: { apiPath: 'system/tenants/list', actionType: ActionTypes.SEARCH },
    TENANT_DETAIL: { apiPath: 'system/tenants/detail', actionType: ActionTypes.SEARCH },
    TENANT_AUTHORIZED: { apiPath: 'system/tenants/authorized', actionType: ActionTypes.SEARCH },
    TENANT_BUSINESSES: { apiPath: 'system/tenants/businesses', actionType: ActionTypes.SEARCH },
    TENANT_BRANCHES: { apiPath: 'system/tenants/branches', actionType: ActionTypes.SEARCH },
    TENANT_DOMAIN_VERIFY: { apiPath: 'system/tenants/domain/verify', actionType: ActionTypes.UPDATE },
    TENANT_DOMAIN_ADD: { apiPath: 'system/tenants/domain/add', actionType: ActionTypes.CREATE },
    TENANT_DOMAIN_SET_PRIMARY: { apiPath: 'system/tenants/domain/set-primary', actionType: ActionTypes.UPDATE },
    TENANT_DOMAIN_DEACTIVATE: { apiPath: 'system/tenants/domain/deactivate', actionType: ActionTypes.UPDATE },
    TENANT_ACTIVATE: { apiPath: 'system/tenants/activate', actionType: ActionTypes.UPDATE },
    TENANT_SUSPEND: { apiPath: 'system/tenants/suspend', actionType: ActionTypes.UPDATE },
    TENANT_REACTIVATE: { apiPath: 'system/tenants/reactivate', actionType: ActionTypes.UPDATE },
    TENANT_CANCEL: { apiPath: 'system/tenants/cancel', actionType: ActionTypes.UPDATE },

    // Privileges
    PRIVILEGE_LIST: { apiPath: 'system/privilege/list', actionType: ActionTypes.SEARCH },
    PRIVILEGE_SEARCH: { apiPath: 'system/privilege/search', actionType: ActionTypes.SEARCH },
    PRIVILEGE_SAVE: { apiPath: 'system/privilege/save', actionType: ActionTypes.CREATE },
    PRIVILEGE_ASSIGN_ROLE: { apiPath: 'system/privilege/assign-role', actionType: ActionTypes.CREATE },
    PRIVILEGE_ROLE_CODES: { apiPath: 'system/privilege/role-codes', actionType: ActionTypes.SEARCH },
    PRIVILEGE_IMPACT: { apiPath: 'system/privilege/impact', actionType: ActionTypes.SEARCH },
    PRIVILEGE_DEACTIVATE: { apiPath: 'system/privilege/deactivate', actionType: ActionTypes.UPDATE },
    SUB_MENU_LIST: { apiPath: 'system/privilege/sub-menu/list', actionType: ActionTypes.SEARCH },
    SUB_MENU_SAVE: { apiPath: 'system/privilege/sub-menu/save', actionType: ActionTypes.CREATE },

    // Layout
    LAYOUT_PROFILE_LIST: { apiPath: 'system/layout/profile/list', actionType: ActionTypes.SEARCH },
    LAYOUT_PROFILE_SAVE: { apiPath: 'system/layout/profile/save', actionType: ActionTypes.CREATE },
    LAYOUT_UI_POLICY_LIST: { apiPath: 'system/layout/ui-policy/list', actionType: ActionTypes.SEARCH },
    LAYOUT_UI_POLICY_SAVE: { apiPath: 'system/layout/ui-policy/save', actionType: ActionTypes.CREATE },
    LAYOUT_ROUTE_POLICY_LIST: { apiPath: 'system/layout/route-policy/list', actionType: ActionTypes.SEARCH },
    LAYOUT_ROUTE_POLICY_SAVE: { apiPath: 'system/layout/route-policy/save', actionType: ActionTypes.CREATE },
    LAYOUT_CLIENT_ASSIGN_LIST: { apiPath: 'system/layout/client/list', actionType: ActionTypes.SEARCH },
    LAYOUT_CLIENT_ASSIGN_SAVE: { apiPath: 'system/layout/client/assign', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_TREE: { apiPath: 'system/layout/navigation/tree', actionType: ActionTypes.SEARCH },
    LAYOUT_NAVIGATION_TREE_ADMIN: { apiPath: 'system/layout/navigation/tree/admin', actionType: ActionTypes.SEARCH },
    LAYOUT_NAVIGATION_PREVIEW: { apiPath: 'system/layout/navigation/preview', actionType: ActionTypes.SEARCH },
    LAYOUT_NAVIGATION_INTEGRITY: { apiPath: 'system/layout/navigation/integrity', actionType: ActionTypes.SEARCH },
    LAYOUT_NAVIGATION_GROUP_SAVE: { apiPath: 'system/layout/navigation/group/save', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_MODULE_SAVE: { apiPath: 'system/layout/navigation/module/save', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_CATEGORY_SAVE: { apiPath: 'system/layout/navigation/category/save', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_CATEGORY_REORDER: { apiPath: 'system/layout/navigation/category/reorder', actionType: ActionTypes.UPDATE },
    LAYOUT_NAVIGATION_FEATURE_GROUP_SAVE: { apiPath: 'system/layout/navigation/feature-group/save', actionType: ActionTypes.CREATE },
    LAYOUT_NAVIGATION_FEATURE_SAVE: { apiPath: 'system/layout/navigation/feature/save', actionType: ActionTypes.CREATE },

    // License
    LICENSE_PLAN_LIST: { apiPath: 'system/license/plan/list', actionType: ActionTypes.SEARCH },
    LICENSE_PLAN_SAVE: { apiPath: 'system/license/plan/save', actionType: ActionTypes.CREATE },
    LICENSE_PLAN_ENTITLEMENT_LIST: { apiPath: 'system/license/plan/entitlement/list', actionType: ActionTypes.SEARCH },
    LICENSE_PLAN_ENTITLEMENT_SAVE: { apiPath: 'system/license/plan/entitlement/save', actionType: ActionTypes.CREATE },
    LICENSE_SUBSCRIPTION_LIST: { apiPath: 'system/license/subscription/list', actionType: ActionTypes.SEARCH },
    LICENSE_SUBSCRIPTION_ASSIGN: { apiPath: 'system/license/subscription/assign', actionType: ActionTypes.CREATE },
    LICENSE_SUBSCRIPTION_SUSPEND: { apiPath: 'system/license/subscription/suspend', actionType: ActionTypes.UPDATE },
    LICENSE_SUBSCRIPTION_REACTIVATE: { apiPath: 'system/license/subscription/reactivate', actionType: ActionTypes.UPDATE },
    LICENSE_SUBSCRIPTION_CANCEL: { apiPath: 'system/license/subscription/cancel', actionType: ActionTypes.UPDATE },
    LICENSE_SUBSCRIPTION_ENTITLEMENT_LIST: { apiPath: 'system/license/subscription/entitlement/list', actionType: ActionTypes.SEARCH },
    LICENSE_SUBSCRIPTION_ENTITLEMENT_SAVE: { apiPath: 'system/license/subscription/entitlement/save', actionType: ActionTypes.CREATE },
    LICENSE_KEY_LIST: { apiPath: 'system/license/key/list', actionType: ActionTypes.SEARCH },
    LICENSE_KEY_GENERATE: { apiPath: 'system/license/key/generate', actionType: ActionTypes.CREATE },
    LICENSE_KEY_REVOKE: { apiPath: 'system/license/key/revoke', actionType: ActionTypes.UPDATE },
    LICENSE_USAGE_LIST: { apiPath: 'system/license/usage/list', actionType: ActionTypes.SEARCH },
    LICENSE_AUDIT_LIST: { apiPath: 'system/license/audit/list', actionType: ActionTypes.SEARCH },
    LICENSE_RENEWAL_SUMMARY: { apiPath: 'system/license/renewal/summary', actionType: ActionTypes.SEARCH },

    // Database Backup Administration
    BACKUP_RUN: { apiPath: 'system/backup/run', actionType: ActionTypes.CREATE },
    BACKUP_LIST: { apiPath: 'system/backup/list', actionType: ActionTypes.SEARCH },
    BACKUP_DETAIL: { apiPath: 'system/backup/detail', actionType: ActionTypes.SEARCH },
    BACKUP_DOWNLOAD: { apiPath: 'system/backup/download', actionType: ActionTypes.UPDATE },
    BACKUP_DELIVERY_RETRY: { apiPath: 'system/backup/delivery/retry', actionType: ActionTypes.UPDATE },
    BACKUP_DELIVERY_HISTORY: { apiPath: 'system/backup/delivery/history', actionType: ActionTypes.SEARCH },
    BACKUP_CONFIGURATION: { apiPath: 'system/backup/configuration', actionType: ActionTypes.SEARCH },
    BACKUP_READINESS: { apiPath: 'system/backup/readiness', actionType: ActionTypes.SEARCH },
    BACKUP_RESTORE_VERIFICATION_LIST: { apiPath: 'system/backup/restore-verification/list', actionType: ActionTypes.SEARCH },
} satisfies Record<string, ApiEndpoint>;
