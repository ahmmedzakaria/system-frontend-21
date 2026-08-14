import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthorizedUiDirective } from '@nexacore/platform';
import { ButtonComponent } from '@nexacore/shared';
import { AuthPolicyAdministrationService } from '../../../core/services/auth-policy-administration.service';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { TenantAdministrationService } from '../../../core/services/tenant-administration.service';
import {
    AuthPolicyAdministrationDto, AuthPolicyIdentifierType, AuthPolicyLoginMethod, ClientApplicationDto
} from '../access-control.model';
import { TenantDto } from '../../tenant/tenant.model';

const IDENTIFIERS: Record<AuthPolicyLoginMethod, AuthPolicyIdentifierType[]> = {
    PASSWORD: ['USERNAME', 'EMAIL', 'MOBILE', 'PERSON_ID'], OTP: ['MOBILE', 'EMAIL'],
    MAGIC_LINK: ['EMAIL'], OAUTH: ['USERNAME'], SSO: ['USERNAME'], BIOMETRIC: ['USERNAME'], PASSKEY: ['USERNAME']
};

@Component({
    selector: 'app-auth-policy-administration', standalone: true,
    imports: [FormsModule, ButtonComponent, AuthorizedUiDirective],
    templateUrl: './auth-policy-administration.component.html',
    styleUrl: './auth-policy-administration.component.scss'
})
export class AuthPolicyAdministrationComponent {
    private readonly policiesService = inject(AuthPolicyAdministrationService);
    private readonly tenantsService = inject(TenantAdministrationService);
    private readonly clientsService = inject(ClientApplicationService);

    protected readonly tenants = signal<TenantDto[]>([]);
    protected readonly clients = signal<ClientApplicationDto[]>([]);
    protected readonly policies = signal<AuthPolicyAdministrationDto[]>([]);
    protected readonly selectedTenantId = signal<number | null>(null);
    protected readonly selectedClientCode = signal('');
    protected readonly loginMethod = signal<AuthPolicyLoginMethod>('PASSWORD');
    protected readonly identifierType = signal<AuthPolicyIdentifierType>('USERNAME');
    protected readonly enabled = signal(true);
    protected readonly loading = signal(true);
    protected readonly saving = signal(false);
    protected readonly message = signal<string | null>(null);
    protected readonly availableIdentifiers = computed(() => IDENTIFIERS[this.loginMethod()]);

    constructor() {
        forkJoin({ tenants: this.tenantsService.list(), clients: this.clientsService.list() }).subscribe({
            next: ({ tenants, clients }) => {
                this.tenants.set(tenants.filter(item => item.status === 'ACTIVE'));
                this.clients.set(clients.filter(item => item.status === 'ACTIVE'));
                const tenantId = this.tenants()[0]?.id ?? null;
                this.selectedTenantId.set(tenantId);
                this.selectedClientCode.set(this.clients()[0]?.clientCode ?? '');
                this.loading.set(false);
                if (tenantId) this.loadPolicies();
            },
            error: () => { this.loading.set(false); this.message.set('Tenant and client catalogs could not be loaded.'); }
        });
    }

    protected tenantChanged(value: string): void {
        this.selectedTenantId.set(Number(value) || null); this.loadPolicies();
    }

    protected methodChanged(value: AuthPolicyLoginMethod): void {
        this.loginMethod.set(value);
        if (!this.availableIdentifiers().includes(this.identifierType())) this.identifierType.set(this.availableIdentifiers()[0]);
    }

    protected edit(policy: AuthPolicyAdministrationDto): void {
        this.selectedClientCode.set(policy.clientCode); this.loginMethod.set(policy.loginMethod);
        this.identifierType.set(policy.loginIdentifierType); this.enabled.set(policy.enabled); this.message.set(null);
    }

    protected save(): void {
        const tenantId = this.selectedTenantId();
        if (!tenantId || !this.selectedClientCode() || this.saving()) return;
        this.saving.set(true); this.message.set(null);
        this.policiesService.save({ tenantId, clientCode: this.selectedClientCode(), loginMethod: this.loginMethod(),
            loginIdentifierType: this.identifierType(), enabled: this.enabled() }).subscribe({
            next: () => { this.saving.set(false); this.message.set('Authentication policy saved.'); this.loadPolicies(); },
            error: () => { this.saving.set(false); this.message.set('The policy was rejected. Confirm the client is assigned to this tenant and the method is compatible.'); }
        });
    }

    private loadPolicies(): void {
        const tenantId = this.selectedTenantId();
        if (!tenantId) { this.policies.set([]); return; }
        this.loading.set(true);
        this.policiesService.list(tenantId).subscribe({ next: rows => { this.policies.set(rows); this.loading.set(false); },
            error: () => { this.policies.set([]); this.loading.set(false); this.message.set('Authentication policies could not be loaded.'); } });
    }
}
