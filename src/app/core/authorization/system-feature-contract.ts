import { ApiEndpoints } from '../api/api-endpoints';

export type SystemApiEndpointKey = keyof typeof ApiEndpoints;
export type SystemApiDataScope = 'NONE' | 'TENANT' | 'BUSINESS' | 'BRANCH';
export type SystemPolicyKey = `${string}.${string}`;
export const AUTHENTICATED_POLICY = 'AUTHENTICATED' as const;

export interface SystemEndpointContract {
    endpoint: SystemApiEndpointKey;
    /** Semantic policy key used for inventory/diagnostics. The backend API registry remains authoritative. */
    policy: SystemPolicyKey | typeof AUTHENTICATED_POLICY;
    dataScope: SystemApiDataScope;
}

export interface SystemFeatureContract {
    feature: string;
    /** Route path to stable semantic policy key. Runtime resolution comes from backend routePolicies. */
    routes: Readonly<Record<string, SystemPolicyKey>>;
    /** UI action code to stable semantic policy key. Runtime resolution comes from backend uiPolicies. */
    actions: Readonly<Record<string, SystemPolicyKey>>;
    endpoints: readonly SystemEndpointContract[];
}

const endpoint = (endpointKey: SystemApiEndpointKey, policy: SystemEndpointContract['policy'], dataScope: SystemApiDataScope = 'NONE'):
SystemEndpointContract => ({ endpoint: endpointKey, policy, dataScope });

export const SYSTEM_FEATURE_CONTRACTS: readonly SystemFeatureContract[] = [
    {
        feature: 'client-applications',
        routes: {
            '/access-control/client-applications': 'client-applications.view',
            '/access-control/client-applications/create': 'client-applications.manage',
            '/access-control/client-applications/:id/edit': 'client-applications.manage',
            '/access-control/client-applications/:id': 'client-applications.view'
        },
        actions: {
            'client-applications.create': 'client-applications.create', 'client-applications.edit': 'client-applications.edit',
            'client-applications.rotate': 'client-applications.rotate', 'client-applications.assign-api': 'client-applications.assign-api',
            'client-applications.assign-feature': 'client-applications.assign-feature', 'client-applications.assign-scope': 'client-applications.assign-scope'
        },
        endpoints: [
            endpoint('CLIENT_APP_SAVE', 'client-applications.manage'), endpoint('CLIENT_APP_LIST', 'client-applications.view'),
            endpoint('CLIENT_APP_DETAIL', 'client-applications.view'), endpoint('CLIENT_APP_API_PERMISSIONS', 'client-applications.assign-api'),
            endpoint('CLIENT_APP_FEATURE_PERMISSIONS', 'client-applications.assign-feature'), endpoint('CLIENT_APP_SCOPE_ASSIGNMENTS', 'client-applications.assign-scope'),
            endpoint('CLIENT_APP_ROTATE_API_KEY', 'client-applications.rotate'), endpoint('CLIENT_APP_ASSIGN_API_PERMISSIONS', 'client-applications.assign-api'),
            endpoint('CLIENT_APP_ASSIGN_FEATURE_PERMISSIONS', 'client-applications.assign-feature'), endpoint('CLIENT_APP_ASSIGN_TENANTS', 'client-applications.assign-scope')
        ]
    },
    {
        feature: 'api-registry', routes: { '/access-control/api-registry': 'api-registry.view' },
        actions: { 'api-registry.manage': 'api-registry.manage', 'api-registry.synchronize': 'api-registry.synchronize' },
        endpoints: [endpoint('API_REGISTRY_INVENTORY', 'api-registry.view'), endpoint('API_REGISTRY_LIST', 'api-registry.view'),
            endpoint('API_REGISTRY_SEARCH', 'api-registry.view'), endpoint('API_REGISTRY_INVENTORY_SEARCH', 'api-registry.view'),
            endpoint('API_REGISTRY_SAVE', 'api-registry.manage'), endpoint('API_REGISTRY_SYNC', 'api-registry.synchronize'),
            endpoint('API_REGISTRY_SYNC_PREVIEW', 'api-registry.synchronize'), endpoint('API_REGISTRY_SYNC_APPLY', 'api-registry.synchronize')]
    },
    {
        feature: 'users-and-roles', routes: {
            '/access-control/users': 'users.view', '/access-control/roles': 'roles.view',
            '/access-control/roles/:id/privileges': 'roles.view'
        },
        actions: { 'users.manage': 'users.manage', 'users.assign': 'users.assign', 'roles.manage': 'roles.manage' },
        endpoints: [endpoint('USER_LIST', 'users.view'), endpoint('USER_DETAIL', 'users.view'), endpoint('USER_ROLE_ASSIGNMENTS', 'users.view'),
            endpoint('USER_SAVE', 'users.manage'), endpoint('USER_ASSIGN_ROLES', 'users.assign'), endpoint('USER_SCOPE_ASSIGNMENTS', 'users.view'),
            endpoint('USER_REPLACE_SCOPE_ASSIGNMENTS', 'users.assign'), endpoint('ROLE_LIST', 'roles.view'), endpoint('ROLE_DETAIL', 'roles.view'),
            endpoint('ROLE_PRIVILEGE_ASSIGNMENTS', 'roles.view'), endpoint('ROLE_SAVE', 'roles.manage'), endpoint('GLOBAL_ROLE_SAVE', 'roles.manage')]
    },
    {
        feature: 'tenants', routes: { '/access-control/tenants': 'tenants.view', '/access-control/tenants/:id': 'tenants.view' },
        actions: { 'tenants.register': 'tenants.register', 'tenants.verify-domain': 'tenants.verify-domain', 'tenants.manage-lifecycle': 'tenants.manage-lifecycle' },
        endpoints: [endpoint('TENANT_REGISTER', 'tenants.register'), endpoint('TENANT_LIST', 'tenants.view'), endpoint('TENANT_DETAIL', 'tenants.view'),
            endpoint('TENANT_AUTHORIZED', AUTHENTICATED_POLICY), endpoint('TENANT_BUSINESSES', AUTHENTICATED_POLICY),
            endpoint('TENANT_BRANCHES', AUTHENTICATED_POLICY), endpoint('TENANT_DOMAIN_VERIFY', 'tenants.verify-domain'),
            endpoint('TENANT_DOMAIN_ADD', 'tenants.verify-domain'), endpoint('TENANT_DOMAIN_SET_PRIMARY', 'tenants.verify-domain'),
            endpoint('TENANT_DOMAIN_DEACTIVATE', 'tenants.verify-domain'),
            endpoint('TENANT_ACTIVATE', 'tenants.manage-lifecycle'), endpoint('TENANT_SUSPEND', 'tenants.manage-lifecycle'),
            endpoint('TENANT_REACTIVATE', 'tenants.manage-lifecycle'), endpoint('TENANT_CANCEL', 'tenants.manage-lifecycle')]
    },
    {
        feature: 'privileges', routes: { '/access-control/privileges': 'privileges.view' },
        actions: { 'privileges.manage': 'privileges.manage', 'privileges.assign': 'privileges.assign' },
        endpoints: [endpoint('PRIVILEGE_LIST', 'privileges.view'), endpoint('PRIVILEGE_SEARCH', 'privileges.view'),
            endpoint('PRIVILEGE_SAVE', 'privileges.manage'), endpoint('PRIVILEGE_ASSIGN_ROLE', 'privileges.assign'),
            endpoint('PRIVILEGE_ROLE_CODES', 'privileges.view'), endpoint('SUB_MENU_LIST', 'privileges.view'),
            endpoint('SUB_MENU_SAVE', 'privileges.manage'), endpoint('PRIVILEGE_IMPACT', 'privileges.view'),
            endpoint('PRIVILEGE_DEACTIVATE', 'privileges.manage')]
    },
    {
        feature: 'layout', routes: { '/layout/profiles': 'layout.view', '/layout/navigation-tree': 'layout.view' },
        actions: { 'layout.manage': 'layout.manage' },
        endpoints: [endpoint('LAYOUT_PROFILE_LIST', 'layout.view'), endpoint('LAYOUT_PROFILE_SAVE', 'layout.manage'),
            endpoint('LAYOUT_UI_POLICY_LIST', 'layout.view'), endpoint('LAYOUT_UI_POLICY_SAVE', 'layout.manage'),
            endpoint('LAYOUT_CLIENT_ASSIGN_LIST', 'layout.view'), endpoint('LAYOUT_CLIENT_ASSIGN_SAVE', 'layout.manage'),
            endpoint('LAYOUT_NAVIGATION_TREE', AUTHENTICATED_POLICY), endpoint('LAYOUT_NAVIGATION_TREE_ADMIN', 'layout.view'),
            endpoint('LAYOUT_NAVIGATION_PREVIEW', 'layout.view'), endpoint('LAYOUT_NAVIGATION_INTEGRITY', 'layout.view'),
            endpoint('LAYOUT_NAVIGATION_GROUP_SAVE', 'layout.manage'), endpoint('LAYOUT_NAVIGATION_MODULE_SAVE', 'layout.manage'),
            endpoint('LAYOUT_NAVIGATION_CATEGORY_SAVE', 'layout.manage'), endpoint('LAYOUT_NAVIGATION_FEATURE_GROUP_SAVE', 'layout.manage'),
            endpoint('LAYOUT_NAVIGATION_CATEGORY_REORDER', 'layout.manage'),
            endpoint('LAYOUT_NAVIGATION_FEATURE_SAVE', 'layout.manage')]
    },
    {
        feature: 'license', routes: { '/license': 'license.view' }, actions: { 'license.manage': 'license.manage' },
        endpoints: [endpoint('LICENSE_PLAN_LIST', 'license.view'), endpoint('LICENSE_PLAN_SAVE', 'license.manage'),
            endpoint('LICENSE_PLAN_ENTITLEMENT_LIST', 'license.view'), endpoint('LICENSE_PLAN_ENTITLEMENT_SAVE', 'license.manage'),
            endpoint('LICENSE_SUBSCRIPTION_LIST', 'license.view'), endpoint('LICENSE_SUBSCRIPTION_ASSIGN', 'license.manage'),
            endpoint('LICENSE_SUBSCRIPTION_SUSPEND', 'license.manage'), endpoint('LICENSE_SUBSCRIPTION_REACTIVATE', 'license.manage'),
            endpoint('LICENSE_SUBSCRIPTION_CANCEL', 'license.manage'), endpoint('LICENSE_SUBSCRIPTION_ENTITLEMENT_LIST', 'license.view'),
            endpoint('LICENSE_SUBSCRIPTION_ENTITLEMENT_SAVE', 'license.manage'), endpoint('LICENSE_KEY_LIST', 'license.view'),
            endpoint('LICENSE_KEY_GENERATE', 'license.manage')]
    },
    {
        feature: 'backup', routes: { '/backup': 'backup.view' },
        actions: { 'backup.execute': 'backup.execute', 'backup.download': 'backup.download', 'backup.deliver': 'backup.deliver', 'backup.manage': 'backup.manage' },
        endpoints: [endpoint('BACKUP_RUN', 'backup.execute'), endpoint('BACKUP_LIST', 'backup.view'),
            endpoint('BACKUP_DETAIL', 'backup.view'), endpoint('BACKUP_DOWNLOAD', 'backup.download')]
    }
] as const;

export const SYSTEM_ROUTE_POLICIES = Object.assign({}, ...SYSTEM_FEATURE_CONTRACTS.map(feature => feature.routes)) as Readonly<Record<string, SystemPolicyKey>>;
export const SYSTEM_ACTION_POLICIES = Object.assign({}, ...SYSTEM_FEATURE_CONTRACTS.map(feature => feature.actions)) as Readonly<Record<string, SystemPolicyKey>>;
