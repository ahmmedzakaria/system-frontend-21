import { Component, inject, signal, viewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import { ButtonComponent, DynamicListComponent, DynamicListLoader, ListColumnConfig } from '@nexacore/shared';
import { BackupService } from '../../core/services/backup.service';
import { BackupJobDto, BackupStatus, formatBytes, formatDateTime } from './backup.model';

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

    protected readonly running = signal(false);
    protected readonly message = signal<string | null>(null);

    protected readonly loadBackups: DynamicListLoader<BackupJobDto> = (params) =>
        this.service.list(params.page - 1, params.pageSize).pipe(
            map((result) => ({ items: result.items, total: result.total }))
        );

    protected readonly columns: ListColumnConfig<BackupJobDto>[] = [
        { key: 'id', header: 'Backup ID', format: (row) => row.id.slice(0, 8) },
        { key: 'trigger', header: 'Trigger' },
        {
            key: 'status', header: 'Status', type: 'badge',
            label: (row) => row.status,
            status: (row) => this.statusTone(row.status)
        },
        { key: 'requestedBy', header: 'Requested By' },
        { key: 'requestedAt', header: 'Requested', format: (row) => formatDateTime(row.requestedAt) },
        { key: 'completedAt', header: 'Completed', format: (row) => formatDateTime(row.completedAt) },
        { key: 'artifactSizeBytes', header: 'Encrypted Size', align: 'end', format: (row) => formatBytes(row.artifactSizeBytes) },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'download', label: 'Download encrypted backup', onClick: (row) => this.download(row) }]
        }
    ];

    protected runBackup(): void {
        this.running.set(true);
        this.message.set(null);
        this.service.run().subscribe({
            next: (job) => {
                this.running.set(false);
                this.message.set(`Backup ${job.id.slice(0, 8)} was queued.`);
                this.listRef()?.reload();
            },
            error: (error: Error) => {
                this.running.set(false);
                this.message.set(error.message);
            }
        });
    }

    private download(row: BackupJobDto): void {
        if (row.status !== 'COMPLETED' && row.status !== 'PARTIAL') {
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
            },
            error: (error: Error) => this.message.set(error.message)
        });
    }

    private statusTone(status: BackupStatus): 'verified' | 'pending' | 'draft' | 'rejected' {
        if (status === 'COMPLETED') return 'verified';
        if (status === 'QUEUED' || status === 'RUNNING') return 'pending';
        if (status === 'FAILED' || status === 'PARTIAL') return 'rejected';
        return 'draft';
    }
}
