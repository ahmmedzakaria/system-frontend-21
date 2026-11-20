import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApplicationContextService, AuthorizationPolicyService, IconComponent } from '@nexacore/platform';
import { AssignmentChecklistComponent, AssignmentLoadStateComponent, ButtonComponent, ReplacementSelectionState, ReplacementSummaryComponent } from '@nexacore/shared';
import { ClientApplicationService } from '../../../core/services/client-application.service';
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
    private readonly clientsService = inject(ClientApplicationService);
    private readonly privilegesService = inject(PrivilegeService);
    private readonly context = inject(ApplicationContextService);
    private readonly policy = inject(AuthorizationPolicyService);
    protected readonly tenant = computed(() => this.context.effectiveTenant());
    protected readonly clients = signal<ClientApplicationDto[]>([]);
    protected readonly options = signal<PrivilegeDto[]>([]);
    protected readonly selectedClientId = signal<number | null>(null);
    protected readonly loadingCatalog = signal(true);
    protected readonly catalogError = signal('');
    protected readonly state = new ReplacementSelectionState<PrivilegeDto, string>({ keyOf: item => item.privilegeCode });
    protected readonly selectedClient = computed(() => this.clients().find(item => item.id === this.selectedClientId()) ?? null);
    protected readonly selectedKeys = computed(() => new Set(this.state.selected().map(item => item.privilegeCode)));
    protected readonly canAssign = computed(() => this.policy.isActionAllowed('client-applications.assign-feature'));
    protected readonly keyOf = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly labelOf = (item: PrivilegeDto) => `${item.featureName} — ${item.actionName}`;
    protected readonly detailOf = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly groupOf = (item: PrivilegeDto) => `${item.moduleName} / ${item.submoduleName}`;

    constructor() { this.loadCatalog(); }

    protected loadCatalog(): void {
        if (!this.tenant()) {
            this.loadingCatalog.set(false);
            this.catalogError.set('A resolved tenant is required to manage client feature permissions.');
            return;
        }
        this.loadingCatalog.set(true); this.catalogError.set('');
        forkJoin({ clients: this.clientsService.list(), privileges: this.privilegesService.list() }).subscribe({
            next: ({ clients, privileges }) => {
                const sorted = [...clients].sort((a, b) => a.clientName.localeCompare(b.clientName));
                this.clients.set(sorted); this.options.set(privileges.filter(item => item.active)); this.loadingCatalog.set(false);
                const initial = sorted.find(item => item.id === this.selectedClientId()) ?? sorted.find(item => item.status === 'ACTIVE') ?? sorted[0];
                if (initial) { this.selectedClientId.set(initial.id); this.loadAssignments(); }
            },
            error: () => { this.loadingCatalog.set(false); this.catalogError.set('Applications and feature privileges could not be loaded.'); },
        });
    }

    protected clientChanged(value: number | string): void { this.selectedClientId.set(Number(value)); this.loadAssignments(); }
    protected loadAssignments(): void {
        const clientId = this.selectedClientId(); const tenantId = this.tenant()?.tenantId;
        if (clientId == null || tenantId == null) return;
        this.state.beginLoad();
        this.clientsService.featurePermissions(clientId, tenantId).subscribe({
            next: codes => this.state.loadSucceeded(this.options().filter(item => codes.has(item.privilegeCode))),
            error: () => this.state.loadFailed('Current tenant feature assignments could not be loaded.'),
        });
    }
    protected toggle(change: { item: PrivilegeDto; selected: boolean }): void { this.state.toggle(change.item, change.selected); }
    protected save(): void {
        const clientId = this.selectedClientId(); const tenantId = this.tenant()?.tenantId;
        if (clientId == null || tenantId == null || !this.canAssign() || !this.state.beginSave()) return;
        this.clientsService.assignFeaturePermissions(clientId, tenantId, this.state.selected().map(item => item.privilegeCode)).subscribe({
            next: () => this.state.saveSucceeded(),
            error: () => this.state.saveFailed('The feature assignment replacement was rejected. Your selections were retained.'),
        });
    }
}
