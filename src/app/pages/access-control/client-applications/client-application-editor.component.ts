import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DynamicWizardComponent, DynamicWizardStepConfig } from '@nexacore/shared';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import {
    CLIENT_STATUS_OPTIONS,
    CLIENT_TYPE_OPTIONS,
    ClientApplicationRequestDto,
    ClientApplicationStatus,
    ClientApplicationType
} from '../access-control.model';

@Component({
    selector: 'app-client-application-editor',
    standalone: true,
    imports: [DynamicWizardComponent],
    templateUrl: './client-application-editor.component.html',
    styleUrl: './client-application-editor.component.scss'
})
export class ClientApplicationEditorComponent {
    private readonly service = inject(ClientApplicationService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    private readonly editingId = this.route.snapshot.paramMap.get('id');
    protected readonly isEdit = !!this.editingId;
    protected readonly loading = signal(this.isEdit);
    protected readonly steps = signal<DynamicWizardStepConfig[]>(this.buildSteps({}));

    constructor() {
        if (this.editingId) {
            const id = Number(this.editingId);
            // No get-by-id endpoint exists — /client-app/list is the only way
            // to resolve a single client application's current field values.
            this.service.list().subscribe({
                next: (rows) => {
                    const match = rows.find((row) => row.id === id);
                    if (match) {
                        this.steps.set(
                            this.buildSteps({
                                clientCode: match.clientCode,
                                clientName: match.clientName,
                                clientType: match.clientType,
                                status: match.status,
                                description: match.description ?? '',
                                allowedOrigins: match.allowedOrigins ?? '',
                                oauthClientId: match.oauthClientId ?? '',
                                allowedRedirectUris: match.allowedRedirectUris ?? '',
                                allowedLogoutRedirectUris: match.allowedLogoutRedirectUris ?? '',
                                allowedIps: match.allowedIps ?? '',
                                rateLimitPerMinute: match.rateLimitPerMinute ?? null
                            })
                        );
                    }
                    this.loading.set(false);
                },
                error: () => this.loading.set(false)
            });
        }
    }

    protected onSubmit(value: Record<string, unknown>): void {
        const request: ClientApplicationRequestDto = {
            id: this.editingId ? Number(this.editingId) : null,
            clientCode: value['clientCode'] as string,
            clientName: value['clientName'] as string,
            clientType: value['clientType'] as ClientApplicationType,
            status: value['status'] as ClientApplicationStatus,
            description: (value['description'] as string) || null,
            allowedOrigins: (value['allowedOrigins'] as string) || null,
            oauthClientId: (value['oauthClientId'] as string) || null,
            allowedRedirectUris: (value['allowedRedirectUris'] as string) || null,
            allowedLogoutRedirectUris: (value['allowedLogoutRedirectUris'] as string) || null,
            allowedIps: (value['allowedIps'] as string) || null,
            rateLimitPerMinute: (value['rateLimitPerMinute'] as number | null) ?? null
        };
        this.service.save(request).subscribe((saved) => {
            this.router.navigate(['/access-control/client-applications', saved.id]);
        });
    }

    private buildSteps(initial: Record<string, unknown>): DynamicWizardStepConfig[] {
        return [
            {
                key: 'general',
                label: 'General',
                initialValue: initial,
                fields: [
                    { type: 'text', key: 'clientCode', label: 'Client Code', required: true, placeholder: 'e.g. SYSTEM_ADMIN_WEB' },
                    { type: 'text', key: 'clientName', label: 'Client Name', required: true },
                    { type: 'dropdown', key: 'clientType', label: 'Client Type', options: CLIENT_TYPE_OPTIONS, required: true },
                    { type: 'dropdown', key: 'status', label: 'Status', options: CLIENT_STATUS_OPTIONS, required: true },
                    { type: 'textarea', key: 'description', label: 'Description', rows: 3 }
                ]
            },
            {
                key: 'access',
                label: 'Origins / IPs / Rate Limit',
                initialValue: initial,
                fields: [
                    { type: 'textarea', key: 'allowedOrigins', label: 'Allowed Origins', rows: 2, placeholder: 'Comma-separated origins, e.g. https://admin.example.com' },
                    { type: 'text', key: 'oauthClientId', label: 'OAuth Client ID', placeholder: 'Registered OAuth/OIDC client ID' },
                    { type: 'textarea', key: 'allowedRedirectUris', label: 'Allowed Redirect URIs', rows: 2, placeholder: 'Comma-separated exact callback URIs' },
                    { type: 'textarea', key: 'allowedLogoutRedirectUris', label: 'Allowed Logout Redirect URIs', rows: 2, placeholder: 'Comma-separated exact post-logout URIs' },
                    { type: 'textarea', key: 'allowedIps', label: 'Allowed IPs', rows: 2, placeholder: 'Comma-separated IPs/CIDRs' },
                    { type: 'number', key: 'rateLimitPerMinute', label: 'Rate Limit (requests/minute)' }
                ]
            }
        ];
    }
}
