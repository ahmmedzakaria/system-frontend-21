import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthorizationPolicyService } from '@nexacore/platform';
import { ButtonComponent, DynamicListComponent, DynamicListLoader, ListColumnConfig, ModalComponent, MutationState } from '@nexacore/shared';
import { BackupService } from '../../core/services/backup.service';
import { BackupConfigurationDto, BackupDeliveryAttemptDto, BackupJobDto, BackupReadinessDto, BackupRestoreVerificationDto, BackupStatus, formatBytes, formatDateTime } from './backup.model';
import { PageOperationService } from '../../core/authorization/page-operation.service';
import { triggerBlobDownload } from './backup-download';
import { pollBackupJob } from './backup-polling';

@Component({
    selector: 'app-backup-list',
    standalone: true,
    imports: [ButtonComponent, DynamicListComponent, ModalComponent],
    templateUrl: './backup-list.component.html',
    styleUrl: './backup-list.component.scss'
})
export class BackupListComponent {
    private readonly service = inject(BackupService);
    private readonly listRef = viewChild<DynamicListComponent<BackupJobDto>>('backupList');
    private readonly policy=inject(AuthorizationPolicyService);
    private readonly operations=inject(PageOperationService);
    private readonly destroyRef=inject(DestroyRef);
    protected readonly canExecute=this.policy.actionAllowed('backup.execute');
    protected readonly canDownload=this.policy.actionAllowed('backup.download');
    protected readonly canDeliver=this.policy.actionAllowed('backup.deliver');
    protected readonly canManage=this.policy.actionAllowed('backup.manage');
    protected readonly runState=new MutationState();
    protected readonly downloadState=new MutationState();
    protected readonly message = signal<string | null>(null);
    protected readonly detail=signal<BackupJobDto|null>(null);
    protected readonly detailLoading=signal(false);
    protected readonly deliveryHistory=signal<BackupDeliveryAttemptDto[]>([]);
    protected readonly configuration=signal<BackupConfigurationDto|null>(null);
    protected readonly readiness=signal<BackupReadinessDto|null>(null);
    protected readonly verifications=signal<BackupRestoreVerificationDto[]>([]);
    protected readonly deliveryState=new MutationState();
    private readonly stopPolling=new Subject<void>();

    constructor(){
        this.destroyRef.onDestroy(()=>{this.stopPolling.next();this.stopPolling.complete();});
        if(this.canManage()){
            this.service.configuration().subscribe({next:x=>this.configuration.set(x),error:e=>this.recordFailure(this.runState,e,'Backup configuration could not be loaded.')});
            this.service.readiness().subscribe({next:x=>this.readiness.set(x),error:e=>this.recordFailure(this.runState,e,'Backup readiness could not be loaded.')});
            this.service.restoreVerifications().subscribe({next:x=>this.verifications.set(x),error:e=>this.recordFailure(this.runState,e,'Restore evidence could not be loaded.')});
        }
    }

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
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [
                {icon:'eye',label:'View backup detail',onClick:(row:BackupJobDto)=>this.openDetail(row)},
                ...(this.canDownload() ? [{ icon: 'download', label: 'Download encrypted backup', hidden:(row:BackupJobDto)=>!['COMPLETED','PARTIAL'].includes(row.status), onClick: (row: BackupJobDto) => this.download(row) }] : [])
            ]
        } as ListColumnConfig<BackupJobDto>
    ]);

    protected openDetail(row:BackupJobDto):void{
        this.stopPolling.next(); this.detailLoading.set(true); this.detail.set(row);
        this.service.detail(row.id).subscribe({next:job=>{this.detail.set(job);this.detailLoading.set(false);this.loadDelivery(job.id);if(this.isActive(job.status))this.poll(job.id);},error:e=>{this.detailLoading.set(false);this.recordFailure(this.downloadState,e,'Backup detail could not be loaded.');}});
    }
    protected closeDetail():void{this.stopPolling.next();this.detail.set(null);this.deliveryHistory.set([]);}
    private poll(id:string):void{pollBackupJob(()=>this.service.detail(id),this.stopPolling).subscribe({next:job=>{this.detail.set(job);if(!this.isActive(job.status))this.listRef()?.reload();},error:e=>{this.stopPolling.next();this.recordFailure(this.downloadState,e,'Backup status polling stopped.');}});}
    private isActive(status:BackupStatus):boolean{return status==='QUEUED'||status==='RUNNING';}
    private loadDelivery(id:string):void{if(this.canDeliver())this.service.deliveryHistory(id).subscribe({next:x=>this.deliveryHistory.set(x),error:e=>this.recordFailure(this.deliveryState,e,'Delivery history could not be loaded.')});}
    protected retryDelivery():void{const job=this.detail();if(!job||!this.canDeliver()||!this.deliveryState.begin())return;this.service.retryDelivery(job.id).subscribe({next:x=>{this.deliveryState.succeed();this.message.set(x.status==='DELIVERED'?'Backup delivery completed.':`Delivery failed: ${x.failureCode}`);this.loadDelivery(job.id);},error:e=>this.recordFailure(this.deliveryState,e,'Backup delivery could not be retried.')});}

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
                triggerBlobDownload(blob, filename);
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
    protected readonly formatBytes=formatBytes;
    protected readonly formatDateTime=formatDateTime;
}
