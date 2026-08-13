// Mirrors backend DTOs 1:1 (com.nexacore.systemmodule.accesscontrol.dto) —
// field names/casing match the JSON the backend actually sends/receives.

export type ClientApplicationType = 'WEB' | 'MOBILE' | 'POS' | 'ERP' | 'PARTNER_PORTAL' | 'INTERNAL_SERVICE';
export type ClientApplicationStatus = 'ACTIVE' | 'DISABLED' | 'SUSPENDED' | 'EXPIRED';

export const CLIENT_TYPE_OPTIONS: { label: string; value: ClientApplicationType }[] = [
    { label: 'Web', value: 'WEB' },
    { label: 'Mobile', value: 'MOBILE' },
    { label: 'POS', value: 'POS' },
    { label: 'ERP', value: 'ERP' },
    { label: 'Partner Portal', value: 'PARTNER_PORTAL' },
    { label: 'Internal Service', value: 'INTERNAL_SERVICE' }
];

export const CLIENT_STATUS_OPTIONS: { label: string; value: ClientApplicationStatus }[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Disabled', value: 'DISABLED' },
    { label: 'Suspended', value: 'SUSPENDED' },
    { label: 'Expired', value: 'EXPIRED' }
];

export interface ClientApplicationDto {
    id: number;
    clientCode: string;
    clientName: string;
    clientType: ClientApplicationType;
    status: ClientApplicationStatus;
    allowedOrigins: string | null;
    allowedIps: string | null;
    rateLimitPerMinute: number | null;
    description: string | null;
}

export interface ClientApplicationRequestDto {
    id?: number | null;
    clientCode: string;
    clientName: string;
    clientType: ClientApplicationType;
    status: ClientApplicationStatus;
    allowedOrigins?: string | null;
    allowedIps?: string | null;
    rateLimitPerMinute?: number | null;
    description?: string | null;
}

/** Full-replace semantics on every field the backend actually reads — only
 * populate the field relevant to the specific assign-* call being made. */
export interface ClientPermissionAssignmentRequestDto {
    clientApplicationId: number;
    apiRegistryIds?: number[];
    privilegeCodes?: string[];
    scopeAssignments?: ClientScopeAssignmentDto[];
    version?: string;
}

export interface ClientScopeAssignmentDto {
    tenantId: number;
    businessId: number | null;
    branchId: number | null;
    active: true;
}

export interface ClientAdministrationDetailDto {
    client: ClientApplicationDto;
    apiRegistryIds: number[];
    privilegeCodes: string[];
    scopeAssignments: ClientScopeAssignmentDto[];
    scopeVersion: string;
}

export interface GeneratedClientCredentialDto {
    clientCode: string;
    clientId: string;
    apiKey: string;
}

export interface ApiRegistryDto {
    id: number;
    apiCode: string;
    httpMethod: string;
    pathPattern: string;
    moduleCode: string | null;
    moduleName: string | null;
    submoduleCode: string | null;
    submoduleName: string | null;
    featureTypeCode: string | null;
    featureTypeName: string | null;
    featureCode: string | null;
    featureName: string | null;
    actionCode: string | null;
    actionName: string | null;
    requiredPrivilegeCode: string | null;
    publicApi: boolean;
    clientAuthenticationRequirement: string | null;
    userAuthorizationRequirement: string | null;
    dataScope: string | null;
    source: string | null;
    priority: number;
    lastSynchronizedAt: string | null;
    active: boolean;
}

export interface ApiRegistryRequestDto {
    id?: number | null;
    apiCode: string;
    httpMethod: string;
    pathPattern: string;
    moduleCode?: string | null;
    moduleName?: string | null;
    submoduleCode?: string | null;
    submoduleName?: string | null;
    featureTypeCode?: string | null;
    featureTypeName?: string | null;
    featureCode?: string | null;
    featureName?: string | null;
    actionCode?: string | null;
    actionName?: string | null;
    requiredPrivilegeCode?: string | null;
    publicApi?: boolean;
    clientAuthenticationRequirement?: string | null;
    userAuthorizationRequirement?: string | null;
    dataScope?: string | null;
    priority?: number | null;
    active?: boolean;
}

export interface ApiInventoryItemDto {
    apiCode: string;
    httpMethod: string;
    pathPattern: string;
    controllerClass: string;
    handlerMethod: string;
    sourceModule: string | null;
    accessMetadataDeclared: boolean;
    publicApi: boolean | null;
    moduleCode: string | null;
    submoduleCode: string | null;
    featureTypeCode: string | null;
    featureCode: string | null;
    actionCode: string | null;
    requiredPrivilegeCode: string | null;
    intendedClientTypes: string[];
    dataScope: string | null;
    reviewStatus: string | null;
}

export interface ApiRegistrySyncReportDto {
    added: number;
    changed: number;
    unchanged: number;
    deactivated: number;
    conflicted: number;
    conflicts: string[];
    records: ApiRegistryDto[];
}

/** Minimal shape read from /system/privilege/list — just what the Feature
 * Permissions checklist needs; the full Privilege module (a later phase)
 * will own the complete PrivilegeDto contract. */
export interface PrivilegeListItemDto {
    id: number;
    privilegeCode: string;
    moduleName?: string;
    submoduleName?: string;
    featureName?: string;
    actionName?: string;
    active: boolean;
}
