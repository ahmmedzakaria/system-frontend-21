import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { DynamicListComponent, DynamicListLoader, ListColumnConfig } from '@nexacore/shared';
import { ButtonComponent } from '@nexacore/shared';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { ClientApplicationDto } from '../access-control.model';
import { AuthorizedUiDirective } from '@nexacore/platform';

const STATUS_TONE: Record<ClientApplicationDto['status'], 'success' | 'neutral' | 'amber' | 'red'> = {
    ACTIVE: 'success',
    DISABLED: 'neutral',
    SUSPENDED: 'amber',
    EXPIRED: 'red'
};

@Component({
    selector: 'app-client-applications-list',
    standalone: true,
    imports: [DynamicListComponent, ButtonComponent, AuthorizedUiDirective],
    templateUrl: './client-applications-list.component.html',
    styleUrl: './client-applications-list.component.scss'
})
export class ClientApplicationsListComponent {
    private readonly service = inject(ClientApplicationService);
    protected readonly router = inject(Router);

    protected readonly loadItems: DynamicListLoader<ClientApplicationDto> = (params) =>
        this.service.list().pipe(
            map((rows) => {
                const query = params.query.trim().toLowerCase();
                const filtered = query
                    ? rows.filter((row) => row.clientCode.toLowerCase().includes(query) || row.clientName.toLowerCase().includes(query))
                    : rows;
                const start = (params.page - 1) * params.pageSize;
                return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
            })
        );

    protected readonly columns: ListColumnConfig<ClientApplicationDto>[] = [
        { key: 'clientCode', header: 'Client Code' },
        { key: 'clientName', header: 'Name' },
        { key: 'clientType', header: 'Type', type: 'pill', label: (row) => row.clientType, tone: () => 'neutral' },
        { key: 'status', header: 'Status', type: 'pill', label: (row) => row.status, tone: (row) => STATUS_TONE[row.status] },
        {
            key: 'actions',
            header: '',
            align: 'end',
            type: 'actions',
            actions: [
                { icon: 'eye', label: 'View', onClick: (row) => this.router.navigate(['/access-control/client-applications', row.id]) },
                { icon: 'edit', label: 'Edit', permissionKey: 'client-applications.edit', onClick: (row) => this.router.navigate(['/access-control/client-applications', row.id, 'edit']) }
            ]
        }
    ];

    protected create(): void {
        this.router.navigate(['/access-control/client-applications/create']);
    }

    protected configureAuthPolicies(): void {
        this.router.navigate(['/access-control/auth-policies']);
    }
}
