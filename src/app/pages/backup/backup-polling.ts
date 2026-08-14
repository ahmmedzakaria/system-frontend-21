import { Observable, timer } from 'rxjs';
import { switchMap, take, takeUntil, takeWhile } from 'rxjs/operators';
import { BackupJobDto } from './backup.model';

export function isBackupTerminal(job: BackupJobDto): boolean { return job.status !== 'QUEUED' && job.status !== 'RUNNING'; }
export function pollBackupJob(fetch: () => Observable<BackupJobDto>, stop: Observable<unknown>, intervalMs = 2000, limit = 60): Observable<BackupJobDto> {
    return timer(intervalMs, intervalMs).pipe(take(limit), takeUntil(stop), switchMap(fetch), takeWhile(job => !isBackupTerminal(job), true));
}
