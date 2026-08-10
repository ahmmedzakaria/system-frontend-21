import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { BackupJobDto, BackupPageDto } from '../../pages/backup/backup.model';

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
}
