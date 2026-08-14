import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ButtonComponent,
    ConfirmDialogComponent,
    DropdownOption,
    DynamicListLoader,
    DynamicModalComponent,
    DynamicTabComponent,
    DynamicTabConfig,
    ListColumnConfig,
    ModalComponent
    ,HierarchicalScopeSelectorComponent, HierarchicalScopeValue
} from '@nexacore/shared';
import { FormsModule } from '@angular/forms';
import { LicenseService } from '../../core/services/license.service';
import { ClientApplicationService } from '../../core/services/client-application.service';
import { AuthorizedUiDirective, AuthorizationPolicyService } from '@nexacore/platform';
import { AuthorizedScopeService } from '../../core/services/authorized-scope.service';
import {
    ENTITLEMENT_FIELDS,
    EntitlementOwnerType,
    GeneratedLicenseKeyDto,
    KEY_FIELDS,
    LicenseEntitlementDto,
    LicenseEntitlementRequestDto,
    LicenseKeyRequestDto,
    LicenseKeySummaryDto,
    LicensePlanDto,
    LicensePlanRequestDto,
    LicenseStatus,
    LicenseSubscriptionDto,
    LicenseSubscriptionRequestDto,
    PLAN_FIELDS,
    entitlementInitialValue,
    entitlementTargetLabel,
    formatDateTime,
    licenseStatusTone,
    planInitialValue,
    subscriptionFields,
    subscriptionInitialValue,
    toIsoOrNull
    ,validateEntitlementTarget, normalizeEntitlementTarget, LicenseUsageSnapshotDto, LicenseAuditEventDto, LicenseRenewalSummaryDto
} from './license.model';

type SubscriptionAction = 'suspend' | 'reactivate' | 'cancel';

@Component({
    selector: 'app-license-list',
    standalone: true,
    imports: [ButtonComponent, ConfirmDialogComponent, DynamicModalComponent, DynamicTabComponent, ModalComponent, AuthorizedUiDirective,
        HierarchicalScopeSelectorComponent, FormsModule],
    templateUrl: './license-list.component.html',
    styleUrl: './license-list.component.scss'
})
export class LicenseListComponent {
    protected readonly formatDateTime = formatDateTime;
    private readonly service = inject(LicenseService);
    private readonly clientAppService = inject(ClientApplicationService);
    private readonly authorizedScopes=inject(AuthorizedScopeService);
    private readonly policy=inject(AuthorizationPolicyService);
    protected readonly canViewClients=this.policy.privilegeAllowed('11020100101');

    private readonly tabsRef = viewChild<DynamicTabComponent>('tabsRef');
    protected readonly activeTabIndex = signal(0);
    protected readonly activeTabKey = computed(() => this.tabs()[this.activeTabIndex()]?.key);

    // Cached across tabs — Subscriptions/Entitlements need Plans' codes for dropdowns,
    // Entitlements/Keys need Subscriptions' codes for owner pickers.
    protected readonly plans = signal<LicensePlanDto[]>([]);
    protected readonly subscriptions = signal<LicenseSubscriptionDto[]>([]);
    protected readonly clientOptions = signal<DropdownOption<unknown>[]>([]);

    protected readonly planOptions = computed<DropdownOption<unknown>[]>(() =>
        this.plans().map((plan) => ({ label: `${plan.planName} (${plan.planCode})`, value: plan.planCode })));
    protected readonly subscriptionOptions = computed<DropdownOption<unknown>[]>(() =>
        this.subscriptions().map((sub) => ({ label: `${sub.subscriptionCode} (${sub.planCode})`, value: sub.subscriptionCode })));

    constructor() {
        this.reloadPlans();
        this.reloadSubscriptions();
        if (this.canViewClients()) this.clientAppService.list().subscribe((clients) => {
            this.clientOptions.set(clients.map((client) => ({ label: `${client.clientName} (${client.clientCode})`, value: client.id })));
        });
    }

    private reloadPlans(): void {
        this.service.planList().subscribe((rows) => {
            this.plans.set(rows);
            this.tabsRef()?.reloadTab('plans');
        });
    }

    private reloadSubscriptions(): void {
        this.service.subscriptionList().subscribe((rows) => {
            this.subscriptions.set(rows);
            this.tabsRef()?.reloadTab('subscriptions');
        });
    }

    // ---- Plans ----

    protected readonly planFields = PLAN_FIELDS;
    protected readonly planEditorOpen = signal(false);
    protected readonly planEditorInitialValue = signal<Record<string, unknown>>({});
    private editingPlanId: number | null = null;

    private makeLoader<T>(source: () => T[], textOf: (row: T) => string): DynamicListLoader<T> {
        return (params) => {
            const rows = source();
            const query = params.query.trim().toLowerCase();
            const filtered = query ? rows.filter((row) => textOf(row).toLowerCase().includes(query)) : rows;
            const start = (params.page - 1) * params.pageSize;
            return of({ items: filtered.slice(start, start + params.pageSize), total: filtered.length });
        };
    }

    protected readonly loadPlans = this.makeLoader(this.plans, (row) => `${row.planCode} ${row.planName}`);

    protected readonly planColumns: ListColumnConfig<LicensePlanDto>[] = [
        { key: 'planCode', header: 'Code' },
        { key: 'planName', header: 'Name' },
        { key: 'planType', header: 'Plan Type' },
        { key: 'billingCycle', header: 'Billing Cycle' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', permissionKey: 'license.manage', onClick: (row) => this.openPlanEditor(row) }]
        }
    ];

    protected openPlanEditor(row: LicensePlanDto | null): void {
        this.editingPlanId = row?.id ?? null;
        this.planEditorInitialValue.set(planInitialValue(row));
        this.planEditorOpen.set(true);
    }
    protected closePlanEditor(): void {
        this.planEditorOpen.set(false);
    }
    protected savePlanEditor(value: Record<string, unknown>): void {
        const request: LicensePlanRequestDto = {
            id: this.editingPlanId,
            planCode: (value['planCode'] as string) || '',
            planName: value['planName'] as string,
            planType: value['planType'] as LicensePlanRequestDto['planType'],
            billingCycle: value['billingCycle'] as LicensePlanRequestDto['billingCycle'],
            trialDays: (value['trialDays'] as number) ?? null,
            description: (value['description'] as string) || null,
            active: !!value['active']
        };
        this.service.planSave(request).subscribe(() => {
            this.planEditorOpen.set(false);
            this.reloadPlans();
        });
    }

    // ---- Subscriptions ----

    protected readonly subscriptionFieldsComputed = computed(() => subscriptionFields(this.planOptions(), this.clientOptions()));
    protected readonly subscriptionEditorOpen = signal(false);
    protected readonly subscriptionEditorInitialValue = signal<Record<string, unknown>>({});
    private editingSubscriptionId: number | null = null;
    private editingSubscriptionVersion: number | null = null;
    private editingSubscriptionStatus: LicenseStatus | null = null;
    protected readonly subscriptionOwnerScope=signal<HierarchicalScopeValue|null>(null);
    protected readonly loadTenants=this.authorizedScopes.tenants;
    protected readonly loadBusinesses=this.authorizedScopes.businesses;
    // License ownership is currently tenant/business scoped; branch ownership is not part of its backend contract.
    protected readonly loadBranches=() => of([]);

    protected readonly loadSubscriptions = this.makeLoader(this.subscriptions, (row) => `${row.subscriptionCode} ${row.planCode}`);

    protected readonly subscriptionColumns: ListColumnConfig<LicenseSubscriptionDto>[] = [
        { key: 'subscriptionCode', header: 'Code' },
        { key: 'planCode', header: 'Plan' },
        { key: 'status', header: 'Status', type: 'badge', status: (row) => licenseStatusTone(row.status), label: (row) => row.status },
        { key: 'expiresAt', header: 'Expires At', format: (row) => formatDateTime(row.expiresAt) },
        { key: 'autoRenew', header: 'Auto Renew', type: 'badge', status: (row) => (row.autoRenew ? 'verified' : 'draft') },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [
                { icon: 'edit', label: 'Edit', permissionKey: 'license.manage', onClick: (row) => this.openSubscriptionEditor(row) },
                { icon: 'hourglass-half', label: 'Suspend', permissionKey: 'license.manage', hidden: row => !['ACTIVE','TRIAL','GRACE_PERIOD'].includes(row.status), onClick: (row) => this.openSubscriptionAction('suspend', row) },
                { icon: 'check', label: 'Reactivate', permissionKey: 'license.manage', hidden: row => row.status !== 'SUSPENDED', onClick: (row) => this.openSubscriptionAction('reactivate', row) },
                { icon: 'ban', label: 'Cancel', permissionKey: 'license.manage', hidden: row => ['CANCELLED','REVOKED','EXPIRED'].includes(row.status), onClick: (row) => this.openSubscriptionAction('cancel', row), danger: true }
            ]
        }
    ];

    protected openSubscriptionEditor(row: LicenseSubscriptionDto | null): void {
        this.editingSubscriptionId = row?.id ?? null;
        this.editingSubscriptionVersion = row?.version ?? null;
        this.editingSubscriptionStatus = row?.status ?? null;
        this.subscriptionEditorInitialValue.set(subscriptionInitialValue(row));
        this.subscriptionOwnerScope.set(row?.tenantId ? {tenantId:row.tenantId,businessId:row.businessId,branchId:null}:null);
        this.subscriptionEditorOpen.set(true);
    }
    protected closeSubscriptionEditor(): void {
        this.subscriptionEditorOpen.set(false);
    }
    protected saveSubscriptionEditor(value: Record<string, unknown>): void {
        const request: LicenseSubscriptionRequestDto = {
            id: this.editingSubscriptionId,
            version: this.editingSubscriptionVersion,
            subscriptionCode: (value['subscriptionCode'] as string) || '',
            planCode: value['planCode'] as string,
            tenantId: this.subscriptionOwnerScope()?.tenantId ?? null,
            businessId: this.subscriptionOwnerScope()?.businessId ?? null,
            clientApplicationId: (value['clientApplicationId'] as number) ?? null,
            // Never sourced from the form — this page has no free-form status field (status
            // changes only via Suspend/Reactivate/Cancel below). Passing the row's current
            // status through unchanged prevents assignSubscription() from resetting an edited
            // SUSPENDED/CANCELLED subscription back to ACTIVE (its null-status default).
            status: this.editingSubscriptionStatus,
            startsAt: toIsoOrNull(value['startsAt']),
            expiresAt: toIsoOrNull(value['expiresAt']),
            gracePeriodEndsAt: toIsoOrNull(value['gracePeriodEndsAt']),
            autoRenew: !!value['autoRenew'],
            metadataJson: null
        };
        this.service.subscriptionAssign(request).subscribe(() => {
            this.subscriptionEditorOpen.set(false);
            this.reloadSubscriptions();
        });
    }

    protected readonly pendingSubscriptionAction = signal<SubscriptionAction | null>(null);
    protected readonly subscriptionActionLoading = signal(false);
    protected readonly suspendReason = signal('');
    private pendingSubscriptionCode: string | null = null;

    protected openSubscriptionAction(action: SubscriptionAction, row: LicenseSubscriptionDto): void {
        this.pendingSubscriptionCode = row.subscriptionCode;
        this.suspendReason.set('');
        this.pendingSubscriptionAction.set(action);
    }
    protected cancelSubscriptionAction(): void {
        this.pendingSubscriptionAction.set(null);
    }
    protected subscriptionActionTitle(): string {
        switch (this.pendingSubscriptionAction()) {
            case 'suspend': return 'Suspend Subscription';
            case 'reactivate': return 'Reactivate Subscription';
            case 'cancel': return 'Cancel Subscription';
            default: return '';
        }
    }
    protected subscriptionActionMessage(): string {
        switch (this.pendingSubscriptionAction()) {
            case 'reactivate': return `Reactivate ${this.pendingSubscriptionCode}?`;
            case 'cancel': return `Cancel ${this.pendingSubscriptionCode}? This cannot be undone.`;
            default: return '';
        }
    }
    protected confirmSubscriptionAction(): void {
        const action = this.pendingSubscriptionAction();
        const code = this.pendingSubscriptionCode;
        if (!action || !code) {
            return;
        }
        this.subscriptionActionLoading.set(true);
        const request$ = action === 'suspend'
            ? this.service.subscriptionSuspend(code, this.suspendReason())
            : action === 'reactivate'
                ? this.service.subscriptionReactivate(code)
                : this.service.subscriptionCancel(code);
        request$.subscribe(() => {
            this.subscriptionActionLoading.set(false);
            this.pendingSubscriptionAction.set(null);
            this.reloadSubscriptions();
        });
    }

    // ---- Entitlements ----

    protected readonly entitlementOwnerType = signal<EntitlementOwnerType>('PLAN');
    protected readonly entitlementOwnerCode = signal('');
    protected readonly entitlementOwnerOptions = computed(() =>
        this.entitlementOwnerType() === 'PLAN' ? this.planOptions() : this.subscriptionOptions());
    protected readonly entitlementFields = ENTITLEMENT_FIELDS;
    protected readonly entitlementEditorOpen = signal(false);
    protected readonly entitlementEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly entitlementError = signal<string | null>(null);
    private editingEntitlement: LicenseEntitlementDto | null = null;

    protected setEntitlementOwnerType(type: EntitlementOwnerType): void {
        this.entitlementOwnerType.set(type);
        this.entitlementOwnerCode.set('');
        this.tabsRef()?.reloadTab('entitlements');
    }
    protected setEntitlementOwnerCode(code: string): void {
        this.entitlementOwnerCode.set(code);
        this.tabsRef()?.reloadTab('entitlements');
    }

    protected readonly loadEntitlements: DynamicListLoader<LicenseEntitlementDto> = (params) => {
        const code = this.entitlementOwnerCode();
        if (!code) {
            return of({ items: [], total: 0 });
        }
        const rows$ = this.entitlementOwnerType() === 'PLAN'
            ? this.service.planEntitlementList(code)
            : this.service.subscriptionEntitlementList(code);
        return rows$.pipe(
            map((rows) => {
                const start = (params.page - 1) * params.pageSize;
                return { items: rows.slice(start, start + params.pageSize), total: rows.length };
            })
        );
    };

    protected readonly entitlementColumns: ListColumnConfig<LicenseEntitlementDto>[] = [
        { key: 'entitlementType', header: 'Type' },
        { key: 'target', header: 'Target', format: (row) => entitlementTargetLabel(row) },
        { key: 'limitCode', header: 'Limit Code', format: (row) => row.limitCode ?? '—' },
        { key: 'limitValue', header: 'Limit Value', format: (row) => row.limitValue?.toString() ?? '—' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        { key: 'actions', header: '', type: 'actions', align: 'end', actions: [
            { icon: 'edit', label: 'Edit', permissionKey: 'license.manage', onClick: (row) => this.openEntitlementEditor(row) },
            { icon: 'ban', label: 'Deactivate', permissionKey: 'license.manage', danger: true, hidden: (row) => !row.active, onClick: (row) => this.deactivateEntitlement(row) }
        ] }
    ];

    protected openEntitlementEditor(row: LicenseEntitlementDto | null = null): void {
        this.editingEntitlement = row;
        this.entitlementError.set(null);
        this.entitlementEditorInitialValue.set(entitlementInitialValue(row));
        this.entitlementEditorOpen.set(true);
    }
    protected closeEntitlementEditor(): void {
        this.entitlementEditorOpen.set(false);
    }
    protected saveEntitlementEditor(value: Record<string, unknown>): void {
        value = normalizeEntitlementTarget(value);
        const validation = validateEntitlementTarget(value);
        if (validation) { this.entitlementError.set(validation); return; }
        const ownerType = this.entitlementOwnerType();
        const code = this.entitlementOwnerCode();
        const request: LicenseEntitlementRequestDto = {
            id: this.editingEntitlement?.id ?? null,
            version: this.editingEntitlement?.version ?? null,
            planCode: ownerType === 'PLAN' ? code : null,
            subscriptionCode: ownerType === 'SUBSCRIPTION' ? code : null,
            entitlementType: value['entitlementType'] as LicenseEntitlementRequestDto['entitlementType'],
            moduleId: (value['moduleId'] as number) ?? null,
            submoduleId: (value['submoduleId'] as number) ?? null,
            featureId: (value['featureId'] as number) ?? null,
            privilegeId: (value['privilegeId'] as number) ?? null,
            apiRegistryId: (value['apiRegistryId'] as number) ?? null,
            limitCode: (value['limitCode'] as string) || null,
            limitValue: (value['limitValue'] as number) ?? null,
            overrideMode: (value['overrideMode'] as LicenseEntitlementRequestDto['overrideMode']) || null,
            active: !!value['active']
        };
        const save$ = ownerType === 'PLAN'
            ? this.service.planEntitlementSave(request)
            : this.service.subscriptionEntitlementSave(request);
        save$.subscribe(() => {
            this.entitlementEditorOpen.set(false);
            this.tabsRef()?.reloadTab('entitlements');
        });
    }
    protected deactivateEntitlement(row: LicenseEntitlementDto): void {
        if (!confirm(`Deactivate ${entitlementTargetLabel(row)}? Decisions depending on this entitlement may be denied immediately.`)) return;
        const request: LicenseEntitlementRequestDto = { ...row, planCode: this.entitlementOwnerType() === 'PLAN' ? row.ownerCode : null,
            subscriptionCode: this.entitlementOwnerType() === 'SUBSCRIPTION' ? row.ownerCode : null, active: false };
        const call = this.entitlementOwnerType() === 'PLAN' ? this.service.planEntitlementSave(request) : this.service.subscriptionEntitlementSave(request);
        call.subscribe(() => this.tabsRef()?.reloadTab('entitlements'));
    }

    // ---- Keys ----

    protected readonly keyFilterSubscriptionCode = signal('');
    protected readonly keyEditorOpen = signal(false);
    protected readonly keyEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly generatedKey = signal<GeneratedLicenseKeyDto | null>(null);
    protected readonly keyFields = KEY_FIELDS;

    protected setKeyFilterSubscriptionCode(code: string): void {
        this.keyFilterSubscriptionCode.set(code);
        this.tabsRef()?.reloadTab('keys');
    }

    protected readonly loadKeys: DynamicListLoader<LicenseKeySummaryDto> = (params) => {
        const code = this.keyFilterSubscriptionCode();
        if (!code) {
            return of({ items: [], total: 0 });
        }
        return this.service.keyList(code).pipe(
            map((rows) => {
                const start = (params.page - 1) * params.pageSize;
                return { items: rows.slice(start, start + params.pageSize), total: rows.length };
            })
        );
    };

    protected readonly keyColumns: ListColumnConfig<LicenseKeySummaryDto>[] = [
        { key: 'keyPrefix', header: 'Key Prefix' },
        { key: 'issuedAt', header: 'Issued At', format: (row) => formatDateTime(row.issuedAt) },
        { key: 'activatedAt', header: 'Activated At', format: (row) => formatDateTime(row.activatedAt) },
        { key: 'expiresAt', header: 'Expires At', format: (row) => formatDateTime(row.expiresAt) },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        { key: 'actions', header: '', type: 'actions', align: 'end', actions: [
            { icon: 'ban', label: 'Revoke', danger: true, permissionKey: 'license.manage', hidden: (row) => !row.active, onClick: (row) => this.revokeKey(row) }
        ] }
    ];
    protected revokeKey(row: LicenseKeySummaryDto): void {
        const reason = prompt(`Reason for revoking key ${row.keyPrefix}`);
        if (!reason?.trim()) return;
        this.service.keyRevoke(row.id, reason.trim()).subscribe(() => this.tabsRef()?.reloadTab('keys'));
    }

    protected readonly diagnosticSubscriptionCode = signal('');
    protected readonly renewal = signal<LicenseRenewalSummaryDto | null>(null);
    protected setDiagnosticSubscriptionCode(code: string): void { this.diagnosticSubscriptionCode.set(code); this.renewal.set(null); if (code) this.service.renewalSummary(code).subscribe(x => this.renewal.set(x)); this.tabsRef()?.reloadTab('usage'); this.tabsRef()?.reloadTab('audit'); }
    protected readonly loadUsage: DynamicListLoader<LicenseUsageSnapshotDto> = (params) => this.diagnosticSubscriptionCode() ? this.service.usageList(this.diagnosticSubscriptionCode()).pipe(map(rows => ({items: rows.slice((params.page-1)*params.pageSize, params.page*params.pageSize), total: rows.length}))) : of({items:[],total:0});
    protected readonly loadAudit: DynamicListLoader<LicenseAuditEventDto> = (params) => this.diagnosticSubscriptionCode() ? this.service.auditList(this.diagnosticSubscriptionCode()).pipe(map(rows => ({items: rows.slice((params.page-1)*params.pageSize, params.page*params.pageSize), total: rows.length}))) : of({items:[],total:0});
    protected readonly usageColumns: ListColumnConfig<LicenseUsageSnapshotDto>[] = [{key:'usagePeriod',header:'Period'},{key:'usageCode',header:'Limit / Usage'},{key:'usageValue',header:'Consumed'},{key:'measuredAt',header:'Measured',format:r=>formatDateTime(r.measuredAt)}];
    protected readonly auditColumns: ListColumnConfig<LicenseAuditEventDto>[] = [{key:'eventType',header:'Event'},{key:'actorUserId',header:'Actor',format:r=>r.actorUserId?.toString() ?? 'System'},{key:'createdAt',header:'Occurred',format:r=>formatDateTime(r.createdAt)}];

    protected openKeyEditor(): void {
        this.keyEditorInitialValue.set({});
        this.keyEditorOpen.set(true);
    }
    protected closeKeyEditor(): void {
        this.keyEditorOpen.set(false);
    }
    protected saveKeyEditor(value: Record<string, unknown>): void {
        const request: LicenseKeyRequestDto = {
            subscriptionCode: this.keyFilterSubscriptionCode(),
            rawLicenseKey: null,
            activationFingerprint: (value['activationFingerprint'] as string) || null,
            expiresAt: toIsoOrNull(value['expiresAt'])
        };
        this.service.keyGenerate(request).subscribe((generated) => {
            this.keyEditorOpen.set(false);
            this.generatedKey.set(generated);
        });
    }
    protected closeGeneratedKey(): void {
        this.generatedKey.set(null);
        this.tabsRef()?.reloadTab('keys');
    }

    // ---- Tabs ----

    protected readonly tabs = computed<DynamicTabConfig[]>(() => [
        {
            key: 'plans', label: 'Plans',
            columns: this.planColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadPlans as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search by code or name…',
            emptyTitle: 'No license plans yet',
            emptyMessage: 'Add the first license plan to get started.'
        },
        {
            key: 'subscriptions', label: 'Subscriptions',
            columns: this.subscriptionColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadSubscriptions as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search by code or plan…',
            emptyTitle: 'No subscriptions yet',
            emptyMessage: 'Assign a plan to a tenant, business, or client application to get started.'
        },
        {
            key: 'entitlements', label: 'Entitlements',
            filters: [
                {
                    key: 'ownerType', label: 'Owner',
                    options: [{ label: 'Plan', value: 'PLAN' }, { label: 'Subscription', value: 'SUBSCRIPTION' }],
                    value: this.entitlementOwnerType(),
                    onChange: (value) => this.setEntitlementOwnerType(value as EntitlementOwnerType)
                },
                {
                    key: 'ownerCode', label: '',
                    options: this.entitlementOwnerOptions(),
                    placeholder: `Select ${this.entitlementOwnerType() === 'PLAN' ? 'a plan' : 'a subscription'}…`,
                    value: this.entitlementOwnerCode() || null,
                    onChange: (value) => this.setEntitlementOwnerCode(value as string)
                }
            ],
            ready: !!this.entitlementOwnerCode(),
            emptyFilterHint: 'Select a plan or subscription above to view its entitlements.',
            columns: this.entitlementColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadEntitlements as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search…',
            emptyTitle: 'No entitlements yet',
            emptyMessage: 'Grant this plan or subscription its first entitlement.'
        },
        {
            key: 'keys', label: 'Keys',
            filters: [
                {
                    key: 'subscription', label: 'Subscription',
                    options: this.subscriptionOptions(),
                    placeholder: 'Select a subscription…',
                    value: this.keyFilterSubscriptionCode() || null,
                    onChange: (value) => this.setKeyFilterSubscriptionCode(value as string)
                }
            ],
            ready: !!this.keyFilterSubscriptionCode(),
            emptyFilterHint: 'Select a subscription above to view its license keys.',
            columns: this.keyColumns as ListColumnConfig<unknown>[],
            loadItems: this.loadKeys as DynamicListLoader<unknown>,
            searchPlaceholder: 'Search…',
            emptyTitle: 'No license keys yet',
            emptyMessage: 'Generate the first key for this subscription.'
        },
        { key:'usage', label:'Usage & Renewal', filters:[{key:'subscription',label:'Subscription',options:this.subscriptionOptions(),value:this.diagnosticSubscriptionCode()||null,onChange:v=>this.setDiagnosticSubscriptionCode(v as string)}], ready:!!this.diagnosticSubscriptionCode(), emptyFilterHint:'Select a subscription to inspect usage and renewal.', columns:this.usageColumns as ListColumnConfig<unknown>[], loadItems:this.loadUsage as DynamicListLoader<unknown>, emptyTitle:'No usage snapshots', emptyMessage:'No measured consumption has been recorded.' },
        { key:'audit', label:'Audit', filters:[{key:'subscription',label:'Subscription',options:this.subscriptionOptions(),value:this.diagnosticSubscriptionCode()||null,onChange:v=>this.setDiagnosticSubscriptionCode(v as string)}], ready:!!this.diagnosticSubscriptionCode(), emptyFilterHint:'Select a subscription to inspect audit history.', columns:this.auditColumns as ListColumnConfig<unknown>[], loadItems:this.loadAudit as DynamicListLoader<unknown>, emptyTitle:'No audit events', emptyMessage:'No license administration events have been recorded.'
        }
    ]);
}
