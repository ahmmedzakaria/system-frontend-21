import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonComponent, CheckboxComponent, ModalComponent, ConfirmDialogComponent } from '@nexacore/shared';
import { IconComponent } from '@nexacore/platform';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { ApiRegistryService } from '../../../core/services/api-registry.service';
import { PrivilegeService } from '../../../core/services/privilege.service';
import { ApiRegistryDto, ClientApplicationDto, GeneratedClientCredentialDto, PrivilegeListItemDto } from '../access-control.model';

interface TenantPair {
    tenantId: number;
    businessId: number | null;
}

@Component({
    selector: 'app-client-application-detail',
    standalone: true,
    imports: [FormsModule, RouterLink, ButtonComponent, CheckboxComponent, ModalComponent, ConfirmDialogComponent, IconComponent],
    templateUrl: './client-application-detail.component.html',
    styleUrl: './client-application-detail.component.scss'
})
export class ClientApplicationDetailComponent {
    private readonly clientAppService = inject(ClientApplicationService);
    private readonly apiRegistryService = inject(ApiRegistryService);
    private readonly privilegeService = inject(PrivilegeService);
    private readonly route = inject(ActivatedRoute);

    private readonly id = Number(this.route.snapshot.paramMap.get('id'));

    protected readonly client = signal<ClientApplicationDto | null>(null);
    protected readonly loading = signal(true);

    // Credentials
    protected readonly rotateConfirmOpen = signal(false);
    protected readonly rotating = signal(false);
    protected readonly generatedCredential = signal<GeneratedClientCredentialDto | null>(null);

    // API Permissions
    protected readonly apiRegistryRows = signal<ApiRegistryDto[]>([]);
    protected readonly selectedApiIds = signal<Set<number>>(new Set());
    protected readonly savingApiPermissions = signal(false);

    // Feature Permissions
    protected readonly privileges = signal<PrivilegeListItemDto[]>([]);
    protected readonly selectedPrivilegeCodes = signal<Set<string>>(new Set());
    protected readonly savingFeaturePermissions = signal(false);

    // Tenant Assignments
    protected readonly tenantPairs = signal<TenantPair[]>([]);
    protected newTenantId: number | null = null;
    protected newBusinessId: number | null = null;
    protected readonly savingTenants = signal(false);

    constructor() {
        this.clientAppService.list().subscribe({
            next: (rows) => {
                this.client.set(rows.find((row) => row.id === this.id) ?? null);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
        this.apiRegistryService.list().subscribe((rows) => this.apiRegistryRows.set(rows));
        this.privilegeService.list().subscribe((rows) => this.privileges.set(rows));
    }

    protected requestRotate(): void {
        this.rotateConfirmOpen.set(true);
    }

    protected confirmRotate(): void {
        this.rotating.set(true);
        this.clientAppService.rotateApiKey(this.id).subscribe({
            next: (credential) => {
                this.rotating.set(false);
                this.rotateConfirmOpen.set(false);
                this.generatedCredential.set(credential);
            },
            error: () => {
                this.rotating.set(false);
                this.rotateConfirmOpen.set(false);
            }
        });
    }

    protected toggleApi(id: number, checked: boolean): void {
        const next = new Set(this.selectedApiIds());
        checked ? next.add(id) : next.delete(id);
        this.selectedApiIds.set(next);
    }

    protected isApiSelected(id: number): boolean {
        return this.selectedApiIds().has(id);
    }

    protected saveApiPermissions(): void {
        this.savingApiPermissions.set(true);
        this.clientAppService.assignApiPermissions(this.id, [...this.selectedApiIds()]).subscribe({
            next: () => this.savingApiPermissions.set(false),
            error: () => this.savingApiPermissions.set(false)
        });
    }

    protected togglePrivilege(code: string, checked: boolean): void {
        const next = new Set(this.selectedPrivilegeCodes());
        checked ? next.add(code) : next.delete(code);
        this.selectedPrivilegeCodes.set(next);
    }

    protected isPrivilegeSelected(code: string): boolean {
        return this.selectedPrivilegeCodes().has(code);
    }

    protected saveFeaturePermissions(): void {
        this.savingFeaturePermissions.set(true);
        this.clientAppService.assignFeaturePermissions(this.id, [...this.selectedPrivilegeCodes()]).subscribe({
            next: () => this.savingFeaturePermissions.set(false),
            error: () => this.savingFeaturePermissions.set(false)
        });
    }

    protected addTenantPair(): void {
        if (this.newTenantId == null) {
            return;
        }
        this.tenantPairs.update((pairs) => [...pairs, { tenantId: this.newTenantId!, businessId: this.newBusinessId }]);
        this.newTenantId = null;
        this.newBusinessId = null;
    }

    protected removeTenantPair(index: number): void {
        this.tenantPairs.update((pairs) => pairs.filter((_, i) => i !== index));
    }

    protected saveTenantAssignments(): void {
        const pairs = this.tenantPairs();
        this.savingTenants.set(true);
        this.clientAppService
            .assignTenants(
                this.id,
                pairs.map((p) => p.tenantId),
                pairs.filter((p) => p.businessId != null).map((p) => p.businessId as number)
            )
            .subscribe({
                next: () => this.savingTenants.set(false),
                error: () => this.savingTenants.set(false)
            });
    }
}
