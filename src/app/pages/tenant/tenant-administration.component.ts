import { Component, inject, signal, viewChild } from '@angular/core';
import { AuthorizationPolicyService } from '@nexacore/platform';
import {
    ButtonComponent, ConfirmDialogComponent, DynamicListComponent, DynamicListLoader,
    DynamicModalComponent, ListColumnConfig
} from '@nexacore/shared';
import { map } from 'rxjs/operators';
import { TenantAdministrationService } from '../../core/services/tenant-administration.service';
import {
    TENANT_REGISTRATION_FIELDS, TenantDomainType, TenantDto,
    TenantRegistrationRequest, TenantStatus
} from './tenant.model';

type LifecycleAction = 'activate' | 'suspend' | 'reactivate' | 'cancel';

@Component({
    selector: 'app-tenant-administration',
    standalone: true,
    imports: [ButtonComponent, ConfirmDialogComponent, DynamicListComponent, DynamicModalComponent],
    templateUrl: './tenant-administration.component.html',
    styleUrl: './tenant-administration.component.scss'
})
export class TenantAdministrationComponent {
    private readonly service = inject(TenantAdministrationService);
    private readonly policy = inject(AuthorizationPolicyService);
    private readonly listRef = viewChild<DynamicListComponent<TenantDto>>('tenantList');

    protected readonly canRegister = this.policy.isActionAllowed('tenants.register');
    protected readonly canVerify = this.policy.isActionAllowed('tenants.verify-domain');
    protected readonly canManage = this.policy.isActionAllowed('tenants.manage-lifecycle');
    protected readonly registrationFields = TENANT_REGISTRATION_FIELDS;
    protected readonly registrationOpen = signal(false);
    protected readonly registrationInitial = { domainType: 'CUSTOM', defaultLocale: 'en', defaultTimeZone: 'Asia/Dhaka' };
    protected readonly pendingAction = signal<LifecycleAction | null>(null);
    protected readonly pendingTenant = signal<TenantDto | null>(null);
    protected readonly reason = signal('');
    protected readonly actionLoading = signal(false);
    protected readonly message = signal<string | null>(null);

    protected readonly loadTenants: DynamicListLoader<TenantDto> = (params) => this.service.list().pipe(map(rows => {
        const query = params.query.trim().toLowerCase();
        const filtered = query ? rows.filter(row => `${row.tenantCode} ${row.displayName} ${row.hostname ?? ''}`.toLowerCase().includes(query)) : rows;
        const start = (params.page - 1) * params.pageSize;
        return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
    }));

    protected readonly columns: ListColumnConfig<TenantDto>[] = [
        { key: 'tenantCode', header: 'Tenant Code' },
        { key: 'displayName', header: 'Name' },
        { key: 'hostname', header: 'Primary Domain', format: row => row.hostname ?? '—' },
        { key: 'status', header: 'Status', type: 'badge', label: row => row.status, status: row => this.statusTone(row.status) },
        {
            key: 'actions', header: '', align: 'end', type: 'actions', actions: [
                ...(this.canVerify ? [{ icon: 'check', label: 'Verify domain', onClick: (row: TenantDto) => this.verify(row) }] : []),
                ...(this.canManage ? [
                    { icon: 'play', label: 'Activate', onClick: (row: TenantDto) => { if (row.status === 'PENDING') this.openAction('activate', row); } },
                    { icon: 'pause', label: 'Suspend', onClick: (row: TenantDto) => { if (row.status === 'ACTIVE') this.openAction('suspend', row); } },
                    { icon: 'rotate-right', label: 'Reactivate', onClick: (row: TenantDto) => { if (row.status === 'SUSPENDED') this.openAction('reactivate', row); } },
                    { icon: 'ban', label: 'Cancel', danger: true, onClick: (row: TenantDto) => { if (row.status !== 'CANCELLED') this.openAction('cancel', row); } }
                ] : [])
            ]
        }
    ];

    protected saveRegistration(value: Record<string, unknown>): void {
        const request: TenantRegistrationRequest = {
            tenantCode: value['tenantCode'] as string,
            displayName: value['displayName'] as string,
            legalName: (value['legalName'] as string) || null,
            registrationNumber: (value['registrationNumber'] as string) || null,
            billingEmail: (value['billingEmail'] as string) || null,
            hostname: value['hostname'] as string,
            domainType: value['domainType'] as TenantDomainType,
            defaultLocale: (value['defaultLocale'] as string) || null,
            defaultTimeZone: (value['defaultTimeZone'] as string) || null
        };
        this.service.register(request).subscribe(() => { this.registrationOpen.set(false); this.reload(); });
    }

    protected verify(row: TenantDto): void {
        if (row.primaryDomainId == null) return;
        this.service.verifyDomain(row.primaryDomainId).subscribe({ next: () => this.reload(), error: error => this.message.set(error.message) });
    }

    protected openAction(action: LifecycleAction, tenant: TenantDto): void {
        this.pendingAction.set(action); this.pendingTenant.set(tenant); this.reason.set(''); this.message.set(null);
    }

    protected closeAction(): void { this.pendingAction.set(null); this.pendingTenant.set(null); }
    protected actionTitle(): string { return `${this.capitalize(this.pendingAction())} Tenant`; }
    protected actionMessage(): string { return `${this.capitalize(this.pendingAction())} ${this.pendingTenant()?.displayName ?? 'tenant'}?`; }
    protected requiresReason(): boolean { return this.pendingAction() === 'suspend' || this.pendingAction() === 'cancel'; }

    protected confirmAction(): void {
        const action = this.pendingAction(); const tenant = this.pendingTenant();
        if (!action || !tenant || (this.requiresReason() && !this.reason().trim())) return;
        this.actionLoading.set(true);
        this.service.transition(action, tenant.id, this.reason().trim() || null).subscribe({
            next: () => { this.actionLoading.set(false); this.closeAction(); this.reload(); },
            error: error => { this.actionLoading.set(false); this.message.set(error.message); }
        });
    }

    private reload(): void { this.listRef()?.reload(); }
    private capitalize(value: string | null): string { return value ? value[0].toUpperCase() + value.slice(1) : ''; }
    private statusTone(status: TenantStatus): 'verified' | 'pending' | 'draft' | 'rejected' {
        if (status === 'ACTIVE') return 'verified';
        if (status === 'PENDING') return 'pending';
        if (status === 'CANCELLED') return 'rejected';
        return 'draft';
    }
}
