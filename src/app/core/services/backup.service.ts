import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { BackupJobDto, BackupPageDto, BackupDeliveryAttemptDto, BackupConfigurationDto, BackupReadinessDto, BackupRestoreVerificationDto } from '../../pages/backup/backup.model';

@Injectable({ providedIn: 'root' })
export class BackupService {
    private readonly api = inject(ApiService);

    run(): Observable<BackupJobDto> {
        return this.api.post<BackupJobDto>(ApiEndpoints.BACKUP_RUN);
    }

    list(page: number, pageSize: number): Observable<BackupPageDto> {
        return this.api.post<BackupPageDto>(ApiEndpoints.BACKUP_LIST, { page, pageSize });
    }

    detail(backupId: string): Observable<BackupJobDto> {
        return this.api.post<BackupJobDto>(ApiEndpoints.BACKUP_DETAIL, { backupId });
    }

    download(backupId: string): Observable<{ blob: Blob; filename: string; contentType: string | null }> {
        return this.api.fetchBinaryData(ApiEndpoints.BACKUP_DOWNLOAD, { backupId });
    }
    retryDelivery(backupId:string):Observable<BackupDeliveryAttemptDto>{return this.api.post<BackupDeliveryAttemptDto>(ApiEndpoints.BACKUP_DELIVERY_RETRY,{backupId});}
    deliveryHistory(backupId:string):Observable<BackupDeliveryAttemptDto[]>{return this.api.post<BackupDeliveryAttemptDto[]>(ApiEndpoints.BACKUP_DELIVERY_HISTORY,{backupId});}
    configuration():Observable<BackupConfigurationDto>{return this.api.post<BackupConfigurationDto>(ApiEndpoints.BACKUP_CONFIGURATION);}
    readiness():Observable<BackupReadinessDto>{return this.api.post<BackupReadinessDto>(ApiEndpoints.BACKUP_READINESS);}
    restoreVerifications():Observable<BackupRestoreVerificationDto[]>{return this.api.post<BackupRestoreVerificationDto[]>(ApiEndpoints.BACKUP_RESTORE_VERIFICATION_LIST);}
}
