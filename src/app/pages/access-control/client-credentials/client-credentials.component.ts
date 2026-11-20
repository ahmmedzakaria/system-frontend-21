import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthorizationPolicyService, IconComponent } from '@nexacore/platform';
import { ButtonComponent, ConfirmDialogComponent, ModalComponent } from '@nexacore/shared';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { ClientApplicationDto, GeneratedClientCredentialDto } from '../access-control.model';

@Component({
    selector: 'app-client-credentials',
    standalone: true,
    imports: [FormsModule, IconComponent, ButtonComponent, ConfirmDialogComponent, ModalComponent],
    templateUrl: './client-credentials.component.html',
    styleUrl: './client-credentials.component.scss'
})
export class ClientCredentialsComponent {
    private readonly clientsService = inject(ClientApplicationService);
    private readonly policy = inject(AuthorizationPolicyService);

    protected readonly clients = signal<ClientApplicationDto[]>([]);
    protected readonly selectedClientId = signal<number | null>(null);
    protected readonly loading = signal(true);
    protected readonly rotating = signal(false);
    protected readonly error = signal('');
    protected readonly rotateConfirmOpen = signal(false);
    protected readonly generatedCredential = signal<GeneratedClientCredentialDto | null>(null);
    protected readonly canRotate = computed(() => this.policy.isActionAllowed('client-applications.rotate'));
    protected readonly selectedClient = computed(() =>
        this.clients().find(client => client.id === this.selectedClientId()) ?? null);

    constructor() {
        this.loadClients();
    }

    protected loadClients(): void {
        this.loading.set(true);
        this.error.set('');
        this.clientsService.list().subscribe({
            next: clients => {
                const sorted = [...clients].sort((left, right) => left.clientName.localeCompare(right.clientName));
                this.clients.set(sorted);
                const selected = sorted.find(client => client.id === this.selectedClientId())
                    ?? sorted.find(client => client.status === 'ACTIVE')
                    ?? sorted[0];
                this.selectedClientId.set(selected?.id ?? null);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.error.set('Client applications could not be loaded.');
            }
        });
    }

    protected clientChanged(value: number | string): void {
        const clientId = Number(value);
        this.selectedClientId.set(Number.isSafeInteger(clientId) && clientId > 0 ? clientId : null);
        this.generatedCredential.set(null);
    }

    protected requestRotation(): void {
        if (this.selectedClientId() == null || !this.canRotate() || this.rotating()) return;
        this.rotateConfirmOpen.set(true);
    }

    protected confirmRotation(): void {
        const clientId = this.selectedClientId();
        if (clientId == null || !this.canRotate() || this.rotating()) return;
        this.rotating.set(true);
        this.error.set('');
        this.clientsService.rotateApiKey(clientId).subscribe({
            next: credential => {
                this.rotating.set(false);
                this.rotateConfirmOpen.set(false);
                this.generatedCredential.set(credential);
            },
            error: () => {
                this.rotating.set(false);
                this.rotateConfirmOpen.set(false);
                this.error.set('The client credential could not be rotated.');
            }
        });
    }
}
