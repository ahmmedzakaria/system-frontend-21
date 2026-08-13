import { DropdownOption, FieldConfig, StatusTone } from '@nexacore/shared';

// Mirrors backend DTOs 1:1 (com.nexacore.systemmodule.license.dto.*).

export type LicensePlanType = 'TRIAL' | 'STANDARD' | 'ENTERPRISE' | 'CUSTOM' | 'INTERNAL';
export type BillingCycle = 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
export type LicenseStatus = 'DRAFT' | 'ACTIVE' | 'TRIAL' | 'GRACE_PERIOD' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'REVOKED';
export type LicenseEntitlementType = 'MODULE' | 'SUBMODULE' | 'FEATURE' | 'ACTION' | 'API' | 'LIMIT' | 'ADD_ON';
export type LicenseOverrideMode = 'ALLOW' | 'DENY' | 'LIMIT_OVERRIDE';
export type EntitlementOwnerType = 'PLAN' | 'SUBSCRIPTION';

export interface LicensePlanDto {
    id: number;
    planCode: string;
    planName: string;
    planType: LicensePlanType;
    billingCycle: BillingCycle;
    trialDays: number | null;
    description: string | null;
    active: boolean;
}

export interface LicensePlanRequestDto {
    id: number | null;
    planCode: string;
    planName: string;
    planType: LicensePlanType;
    billingCycle: BillingCycle;
    trialDays: number | null;
    description: string | null;
    active: boolean;
}

export interface LicenseSubscriptionDto {
    id: number;
    subscriptionCode: string;
    planCode: string;
    tenantId: number | null;
    businessId: number | null;
    clientApplicationId: number | null;
    status: LicenseStatus;
    startsAt: string | null;
    expiresAt: string | null;
    gracePeriodEndsAt: string | null;
    autoRenew: boolean;
}

export interface LicenseSubscriptionRequestDto {
    id: number | null;
    subscriptionCode: string;
    planCode: string;
    tenantId: number | null;
    businessId: number | null;
    clientApplicationId: number | null;
    status: LicenseStatus | null;
    startsAt: string | null;
    expiresAt: string | null;
    gracePeriodEndsAt: string | null;
    autoRenew: boolean;
    metadataJson: string | null;
}

export interface LicenseEntitlementDto {
    id: number;
    ownerCode: string;
    entitlementType: LicenseEntitlementType;
    moduleId: number | null;
    submoduleId: number | null;
    featureId: number | null;
    privilegeId: number | null;
    apiRegistryId: number | null;
    limitCode: string | null;
    limitValue: number | null;
    overrideMode: LicenseOverrideMode | null;
    active: boolean;
}

export interface LicenseEntitlementRequestDto {
    planCode: string | null;
    subscriptionCode: string | null;
    entitlementType: LicenseEntitlementType;
    moduleId: number | null;
    submoduleId: number | null;
    featureId: number | null;
    privilegeId: number | null;
    apiRegistryId: number | null;
    limitCode: string | null;
    limitValue: number | null;
    overrideMode: LicenseOverrideMode | null;
    active: boolean;
}

export interface LicenseKeySummaryDto {
    id: number;
    subscriptionCode: string;
    keyPrefix: string;
    issuedAt: string | null;
    activatedAt: string | null;
    lastValidatedAt: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
    active: boolean;
}

export interface LicenseKeyRequestDto {
    subscriptionCode: string;
    rawLicenseKey: string | null;
    activationFingerprint: string | null;
    expiresAt: string | null;
}

export interface GeneratedLicenseKeyDto {
    id: number;
    subscriptionCode: string;
    rawLicenseKey: string;
    keyPrefix: string;
    expiresAt: string | null;
}

// ---- Date <-> ISO string helpers ----
// DynamicForm's `date` field (DatePickerComponent) both emits and expects a
// plain `YYYY-MM-DD` string (see toIsoDate/parseIsoDate in @nexacore/shared's
// date-utils.ts) — NOT a `Date` instance. The backend's `LocalDateTime`
// fields need a full `yyyy-MM-ddTHH:mm:ss` string to deserialize, and the
// widened response comes back as one too, so it must be truncated back down
// to the date-only form the picker expects when pre-filling an edit.

export function toIsoOrNull(value: unknown): string | null {
    return typeof value === 'string' && value ? `${value}T00:00:00` : null;
}

export function toDateOnly(value: string | null): string | null {
    return value ? value.slice(0, 10) : null;
}

export function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }
    return new Date(value).toLocaleString();
}

// ---- Status tone mapping (StatusTone only has 4 members; LicenseStatus has 8) ----

export function licenseStatusTone(status: LicenseStatus): StatusTone {
    switch (status) {
        case 'ACTIVE':
        case 'TRIAL':
            return 'verified';
        case 'GRACE_PERIOD':
            return 'pending';
        case 'DRAFT':
            return 'draft';
        default:
            return 'rejected';
    }
}

// ---- Field configs ----

const PLAN_TYPE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Trial', value: 'TRIAL' },
    { label: 'Standard', value: 'STANDARD' },
    { label: 'Enterprise', value: 'ENTERPRISE' },
    { label: 'Custom', value: 'CUSTOM' },
    { label: 'Internal', value: 'INTERNAL' }
];
const BILLING_CYCLE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'None', value: 'NONE' },
    { label: 'Monthly', value: 'MONTHLY' },
    { label: 'Quarterly', value: 'QUARTERLY' },
    { label: 'Yearly', value: 'YEARLY' },
    { label: 'Custom', value: 'CUSTOM' }
];
export const ENTITLEMENT_TYPE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Module', value: 'MODULE' },
    { label: 'Submodule', value: 'SUBMODULE' },
    { label: 'Feature', value: 'FEATURE' },
    { label: 'Action', value: 'ACTION' },
    { label: 'API', value: 'API' },
    { label: 'Limit', value: 'LIMIT' },
    { label: 'Add-On', value: 'ADD_ON' }
];
export const OVERRIDE_MODE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Allow', value: 'ALLOW' },
    { label: 'Deny', value: 'DENY' },
    { label: 'Limit Override', value: 'LIMIT_OVERRIDE' }
];

export const PLAN_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'planCode', label: 'Code', required: true },
    { type: 'text', key: 'planName', label: 'Name', required: true },
    { type: 'dropdown', key: 'planType', label: 'Plan Type', options: PLAN_TYPE_OPTIONS },
    { type: 'dropdown', key: 'billingCycle', label: 'Billing Cycle', options: BILLING_CYCLE_OPTIONS },
    { type: 'number', key: 'trialDays', label: 'Trial Days' },
    { type: 'textarea', key: 'description', label: 'Description', colSpan: 2 },
    { type: 'checkbox', key: 'active', label: 'Active' }
];

export function planInitialValue(row: LicensePlanDto | null): Record<string, unknown> {
    if (!row) {
        return { planType: 'STANDARD', billingCycle: 'NONE', active: true };
    }
    return {
        planCode: row.planCode, planName: row.planName, planType: row.planType, billingCycle: row.billingCycle,
        trialDays: row.trialDays, description: row.description ?? '', active: row.active
    };
}

export function subscriptionFields(planOptions: DropdownOption<unknown>[], clientOptions: DropdownOption<unknown>[]): FieldConfig[] {
    return [
        { type: 'text', key: 'subscriptionCode', label: 'Code', required: true },
        { type: 'dropdown', key: 'planCode', label: 'Plan', options: planOptions, required: true },
        { type: 'dropdown', key: 'clientApplicationId', label: 'Client Application (owner)', options: clientOptions },
        { type: 'date', key: 'startsAt', label: 'Starts At' },
        { type: 'date', key: 'expiresAt', label: 'Expires At' },
        { type: 'date', key: 'gracePeriodEndsAt', label: 'Grace Period Ends At' },
        { type: 'checkbox', key: 'autoRenew', label: 'Auto Renew' }
    ];
}

export function subscriptionInitialValue(row: LicenseSubscriptionDto | null): Record<string, unknown> {
    if (!row) {
        return { autoRenew: false };
    }
    return {
        subscriptionCode: row.subscriptionCode, planCode: row.planCode, clientApplicationId: row.clientApplicationId,
        tenantId: row.tenantId, businessId: row.businessId,
        startsAt: toDateOnly(row.startsAt),
        expiresAt: toDateOnly(row.expiresAt),
        gracePeriodEndsAt: toDateOnly(row.gracePeriodEndsAt),
        autoRenew: row.autoRenew
    };
}

export const ENTITLEMENT_FIELDS: FieldConfig[] = [
    { type: 'dropdown', key: 'entitlementType', label: 'Entitlement Type', options: ENTITLEMENT_TYPE_OPTIONS, required: true },
    { type: 'number', key: 'moduleId', label: 'Module Id (if type=Module)' },
    { type: 'number', key: 'submoduleId', label: 'Submodule Id (if type=Submodule)' },
    { type: 'number', key: 'featureId', label: 'Feature Id (if type=Feature)' },
    { type: 'number', key: 'privilegeId', label: 'Privilege Id (if type=Action)' },
    { type: 'number', key: 'apiRegistryId', label: 'API Registry Id (if type=API)' },
    { type: 'text', key: 'limitCode', label: 'Limit Code (if type=Limit)' },
    { type: 'number', key: 'limitValue', label: 'Limit Value (if type=Limit)' },
    { type: 'dropdown', key: 'overrideMode', label: 'Override Mode (subscription overrides only)', options: OVERRIDE_MODE_OPTIONS },
    { type: 'checkbox', key: 'active', label: 'Active' }
];

export function entitlementInitialValue(): Record<string, unknown> {
    return { entitlementType: 'FEATURE', overrideMode: 'ALLOW', active: true };
}

export function entitlementTargetLabel(row: LicenseEntitlementDto): string {
    if (row.moduleId != null) return `Module #${row.moduleId}`;
    if (row.submoduleId != null) return `Submodule #${row.submoduleId}`;
    if (row.featureId != null) return `Feature #${row.featureId}`;
    if (row.privilegeId != null) return `Privilege #${row.privilegeId}`;
    if (row.apiRegistryId != null) return `API #${row.apiRegistryId}`;
    return row.limitCode ? `Limit ${row.limitCode}` : '—';
}

export const KEY_FIELDS: FieldConfig[] = [
    { type: 'date', key: 'expiresAt', label: 'Expires At' },
    { type: 'text', key: 'activationFingerprint', label: 'Activation Fingerprint (optional)', colSpan: 2 }
];
