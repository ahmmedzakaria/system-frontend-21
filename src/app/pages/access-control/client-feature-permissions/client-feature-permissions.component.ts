import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApplicationContextService, AuthorizationPolicyService, IconComponent } from '@nexacore/platform';
import { AssignmentChecklistComponent, AssignmentLoadStateComponent, ButtonComponent, ReplacementSelectionState, ReplacementSummaryComponent } from '@nexacore/shared';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { AuthorizedScopeService } from '../../../core/services/authorized-scope.service';
import { PrivilegeService } from '../../../core/services/privilege.service';
import { ClientApplicationDto } from '../access-control.model';
import { PrivilegeDto } from '../privileges/privileges.model';

@Component({
    selector: 'app-client-feature-permissions',
    standalone: true,
    imports: [FormsModule, IconComponent, ButtonComponent, AssignmentChecklistComponent, AssignmentLoadStateComponent, ReplacementSummaryComponent],
    templateUrl: './client-feature-permissions.component.html',
    styleUrl: '../client-api-permissions/client-api-permissions.component.scss',
})
export class ClientFeaturePermissionsComponent {
    private assignmentRequestId = 0;
    private readonly clientsService = inject(ClientApplicationService);
    private readonly privilegesService = inject(PrivilegeService);
    private readonly authorizedScopes = inject(AuthorizedScopeService);
    private readonly context = inject(ApplicationContextService);
    private readonly policy = inject(AuthorizationPolicyService);
    protected readonly tenants = signal<readonly { id: number; label: string }[]>([]);
    protected readonly clients = signal<ClientApplicationDto[]>([]);
    protected readonly options = signal<PrivilegeDto[]>([]);
    protected readonly selectedTenantId = signal<number | null>(null);
    protected readonly selectedClientId = signal<number | null>(null);
    protected readonly loadingCatalog = signal(true);
    protected readonly catalogError = signal('');
    protected readonly state = new ReplacementSelectionState<PrivilegeDto, string>({ keyOf: item => item.privilegeCode });
    protected readonly selectedClient = computed(() => this.clients().find(item => item.id === this.selectedClientId()) ?? null);
    protected readonly selectedTenant = computed(() => this.tenants().find(item => item.id === this.selectedTenantId()) ?? null);
    protected readonly selectedKeys = computed(() => new Set(this.state.selected().map(item => item.privilegeCode)));
    protected readonly canAssign = computed(() => this.policy.isActionAllowed('client-applications.assign-feature'));
    protected readonly keyOf = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly labelOf = (item: PrivilegeDto) => `${item.featureName} — ${item.actionName}`;
    protected readonly detailOf = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly groupOf = (item: PrivilegeDto) => `${item.moduleName} / ${item.submoduleName}`;

    constructor() { this.loadCatalog(); }

    protected loadCatalog(): void {
        this.loadingCatalog.set(true); this.catalogError.set('');
        forkJoin({ clients: this.clientsService.list(), privileges: this.privilegesService.list(), tenants: this.authorizedScopes.tenants() }).subscribe({
            next: ({ clients, privileges, tenants }) => {
                const sorted = [...clients].sort((a, b) => a.clientName.localeCompare(b.clientName));
                this.clients.set(sorted); this.options.set(privileges.filter(item => item.active)); this.tenants.set(tenants);
                const currentTenantId = this.selectedTenantId() ?? this.context.effectiveTenant()?.tenantId;
                const initialTenant = tenants.find(item => item.id === currentTenantId) ?? tenants[0];
                this.selectedTenantId.set(initialTenant?.id ?? null);
                this.loadingCatalog.set(false);
                const initial = sorted.find(item => item.id === this.selectedClientId()) ?? sorted.find(item => item.status === 'ACTIVE') ?? sorted[0];
                if (initial && initialTenant) { this.selectedClientId.set(initial.id); this.loadAssignments(); }
            },
            error: () => { this.loadingCatalog.set(false); this.catalogError.set('Applications, tenants, and feature privileges could not be loaded.'); },
        });
    }

    protected clientChanged(value: number | string): void { this.selectedClientId.set(Number(value)); this.loadAssignments(); }
    protected tenantChanged(value: number | string): void { this.selectedTenantId.set(Number(value)); this.loadAssignments(); }
    protected loadAssignments(): void {
        const clientId = this.selectedClientId(); const tenantId = this.selectedTenantId();
        if (clientId == null || tenantId == null) return;
        const requestId = ++this.assignmentRequestId;
        this.state.beginLoad();
        this.clientsService.featurePermissions(clientId, tenantId).subscribe({
            next: codes => {
                if (requestId === this.assignmentRequestId) {
                    this.state.loadSucceeded(this.options().filter(item => codes.has(item.privilegeCode)));
                }
            },
            error: () => {
                if (requestId === this.assignmentRequestId) {
                    this.state.loadFailed('Current tenant feature assignments could not be loaded.');
                }
            },
        });
    }
    protected toggle(change: { item: PrivilegeDto; selected: boolean }): void { this.state.toggle(change.item, change.selected); }
    protected save(): void {
        const clientId = this.selectedClientId(); const tenantId = this.selectedTenantId();
        if (clientId == null || tenantId == null || !this.canAssign() || !this.state.beginSave()) return;
        this.clientsService.assignFeaturePermissions(clientId, tenantId, this.state.selected().map(item => item.privilegeCode)).subscribe({
            next: () => this.state.saveSucceeded(),
            error: () => this.state.saveFailed('The feature assignment replacement was rejected. Your selections were retained.'),
        });
    }
}
