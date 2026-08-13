import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonComponent, ModalComponent, ConfirmDialogComponent } from '@nexacore/shared';
import { IconComponent } from '@nexacore/platform';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { ClientApplicationDto, GeneratedClientCredentialDto } from '../access-control.model';

@Component({
    selector: 'app-client-application-detail',
    standalone: true,
    imports: [RouterLink, ButtonComponent, ModalComponent, ConfirmDialogComponent, IconComponent],
    templateUrl: './client-application-detail.component.html',
    styleUrl: './client-application-detail.component.scss'
})
export class ClientApplicationDetailComponent {
    private readonly clientAppService = inject(ClientApplicationService);
    private readonly route = inject(ActivatedRoute);

    private readonly id = Number(this.route.snapshot.paramMap.get('id'));

    protected readonly client = signal<ClientApplicationDto | null>(null);
    protected readonly loading = signal(true);

    // Credentials
    protected readonly rotateConfirmOpen = signal(false);
    protected readonly rotating = signal(false);
    protected readonly generatedCredential = signal<GeneratedClientCredentialDto | null>(null);

    constructor() {
        this.clientAppService.list().subscribe({
            next: (rows) => {
                this.client.set(rows.find((row) => row.id === this.id) ?? null);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
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

}
