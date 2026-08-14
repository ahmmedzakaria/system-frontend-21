import { Subject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { BackupJobDto } from './backup.model';
import { pollBackupJob } from './backup-polling';

const job = (status: BackupJobDto['status']) => ({ id:'1',status } as BackupJobDto);
describe('pollBackupJob',()=>{
    it('stops after the first terminal state',async()=>{vi.useFakeTimers();const stop=new Subject<void>();let calls=0;const seen:string[]=[];pollBackupJob(()=>of(job(++calls===2?'COMPLETED':'RUNNING')),stop,10,10).subscribe(x=>seen.push(x.status));await vi.advanceTimersByTimeAsync(100);expect(seen).toEqual(['RUNNING','COMPLETED']);expect(calls).toBe(2);vi.useRealTimers();});
    it('stops on teardown signal',async()=>{vi.useFakeTimers();const stop=new Subject<void>();let calls=0;pollBackupJob(()=>{calls++;return of(job('RUNNING'));},stop,10,10).subscribe();await vi.advanceTimersByTimeAsync(10);stop.next();await vi.advanceTimersByTimeAsync(100);expect(calls).toBe(1);vi.useRealTimers();});
});
