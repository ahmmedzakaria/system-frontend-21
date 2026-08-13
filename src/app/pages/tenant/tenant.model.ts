import { FieldConfig } from '@nexacore/shared';

export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type TenantDomainType = 'CUSTOM' | 'PLATFORM_SUBDOMAIN';

export interface TenantDto {
    id: number;
    version: number;
    tenantCode: string;
    displayName: string;
    status: TenantStatus;
    primaryDomainId: number | null;
    hostname: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TenantDomainDto {
    id: number; hostname: string; domainType: TenantDomainType;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
    primaryDomain: boolean; active: boolean; verifiedAt: string | null;
    lastCheckedAt: string | null; createdAt: string; updatedAt: string;
}

export interface TenantAssignmentSummaryDto {
    clients: number; users: number; layouts: number; licenses: number; brandingOverrides: number;
}

export interface PlatformAdminAuditEventDto {
    id: number; actorUserId: number; actionCode: string; outcome: string;
    reason: string | null; traceId: string | null; createdAt: string;
}

export interface TenantDetailDto {
    id: number; version: number; tenantCode: string; displayName: string; legalName: string | null;
    registrationNumber: string | null; billingEmail: string | null; defaultLocale: string; defaultTimeZone: string;
    status: TenantStatus; activatedAt: string | null; suspendedAt: string | null; suspensionReason: string | null;
    cancelledAt: string | null; cancellationReason: string | null; domains: TenantDomainDto[];
    assignments: TenantAssignmentSummaryDto; history: PlatformAdminAuditEventDto[]; createdAt: string; updatedAt: string;
}

export interface TenantDomainMutationRequest {
    tenantId: number; domainId?: number | null; hostname?: string | null; domainType?: TenantDomainType | null;
}

export interface TenantRegistrationRequest {
    tenantCode: string;
    displayName: string;
    legalName: string | null;
    registrationNumber: string | null;
    billingEmail: string | null;
    hostname: string;
    domainType: TenantDomainType;
    defaultLocale: string | null;
    defaultTimeZone: string | null;
}

export const TENANT_PRIVILEGES = {
    view: '11020100901',
    register: '11020100910',
    verifyDomain: '11020100980',
    manageLifecycle: '11020100987'
} as const;

export const TENANT_REGISTRATION_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'tenantCode', label: 'Tenant Code', required: true },
    { type: 'text', key: 'displayName', label: 'Display Name', required: true },
    { type: 'text', key: 'legalName', label: 'Legal Name' },
    { type: 'text', key: 'registrationNumber', label: 'Registration Number' },
    { type: 'text', key: 'billingEmail', label: 'Billing Email' },
    { type: 'text', key: 'hostname', label: 'Hostname', required: true },
    { type: 'dropdown', key: 'domainType', label: 'Domain Type', required: true, options: [
        { label: 'Custom domain', value: 'CUSTOM' },
        { label: 'Platform subdomain', value: 'PLATFORM_SUBDOMAIN' }
    ] },
    { type: 'text', key: 'defaultLocale', label: 'Default Locale' },
    { type: 'text', key: 'defaultTimeZone', label: 'Default Time Zone' }
];

export const TENANT_DOMAIN_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'hostname', label: 'Hostname', required: true },
    { type: 'dropdown', key: 'domainType', label: 'Domain Type', required: true, options: [
        { label: 'Custom domain', value: 'CUSTOM' }, { label: 'Platform subdomain', value: 'PLATFORM_SUBDOMAIN' }
    ] }
];
