import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import { AuthorizationPolicyService } from '@nexacore/platform';
import { ButtonComponent, DynamicListComponent, DynamicListLoader, ListColumnConfig, MutationState } from '@nexacore/shared';
import { BackupService } from '../../core/services/backup.service';
import { BackupJobDto, BackupStatus, formatBytes, formatDateTime } from './backup.model';
import { PageOperationService } from '../../core/authorization/page-operation.service';

@Component({
    selector: 'app-backup-list',
    standalone: true,
    imports: [ButtonComponent, DynamicListComponent],
    templateUrl: './backup-list.component.html',
    styleUrl: './backup-list.component.scss'
})
export class BackupListComponent {
    private readonly service = inject(BackupService);
    private readonly listRef = viewChild<DynamicListComponent<BackupJobDto>>('backupList');
    private readonly policy=inject(AuthorizationPolicyService);
    private readonly operations=inject(PageOperationService);
    protected readonly canExecute=this.policy.actionAllowed('backup.execute');
    protected readonly canDownload=this.policy.actionAllowed('backup.download');
    protected readonly runState=new MutationState();
    protected readonly downloadState=new MutationState();
    protected readonly message = signal<string | null>(null);

    protected readonly loadBackups: DynamicListLoader<BackupJobDto> = params =>
        this.service.list(params.page - 1, params.pageSize).pipe(
            map(result => ({ items: result.items, total: result.total }))
        );

    protected readonly columns=computed<ListColumnConfig<BackupJobDto>[]>(() => [
        { key: 'id', header: 'Backup ID', format: row => row.id.slice(0, 8) },
        { key: 'trigger', header: 'Trigger' },
        { key: 'status', header: 'Status', type: 'badge', label: row => row.status, status: row => this.statusTone(row.status) },
        { key: 'requestedBy', header: 'Requested By' },
        { key: 'requestedAt', header: 'Requested', format: row => formatDateTime(row.requestedAt) },
        { key: 'completedAt', header: 'Completed', format: row => formatDateTime(row.completedAt) },
        { key: 'artifactSizeBytes', header: 'Encrypted Size', align: 'end', format: row => formatBytes(row.artifactSizeBytes) },
        ...(this.canDownload() ? [{
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'download', label: 'Download encrypted backup', onClick: (row: BackupJobDto) => this.download(row) }]
        } as ListColumnConfig<BackupJobDto>] : [])
    ]);

    protected runBackup(): void {
        if (!this.canExecute() || !this.runState.begin()) return;
        this.message.set(null);
        this.service.run().subscribe({
            next: job => {
                this.runState.succeed();
                this.message.set(`Backup ${job.id.slice(0, 8)} was queued.`);
                this.listRef()?.reload();
            },
            error: error => this.recordFailure(this.runState,error,'The backup could not be queued.')
        });
    }

    private download(row: BackupJobDto): void {
        if (!this.canDownload() || !this.downloadState.begin()) return;
        if (row.status !== 'COMPLETED' && row.status !== 'PARTIAL') {
            this.downloadState.fail('This backup does not have a downloadable encrypted artifact.');
            this.message.set('This backup does not have a downloadable encrypted artifact.');
            return;
        }
        this.service.download(row.id).subscribe({
            next: ({ blob, filename }) => {
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = filename;
                anchor.click();
                URL.revokeObjectURL(url);
                this.downloadState.succeed();
            },
            error: error => this.recordFailure(this.downloadState,error,'The encrypted backup could not be downloaded.')
        });
    }

    private recordFailure(state: MutationState,error:unknown,fallback:string):void {
        const failure=this.operations.failure(error,fallback);
        state.failStructured(failure.message,failure.code,failure.traceId);
        this.message.set(this.operations.display(failure));
    }

    private statusTone(status: BackupStatus): 'verified' | 'pending' | 'draft' | 'rejected' {
        if (status === 'COMPLETED') return 'verified';
        if (status === 'QUEUED' || status === 'RUNNING') return 'pending';
        if (status === 'FAILED' || status === 'PARTIAL') return 'rejected';
        return 'draft';
    }
}
