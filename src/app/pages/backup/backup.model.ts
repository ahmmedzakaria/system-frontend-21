export type BackupStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'DELETED';
export type BackupTrigger = 'SCHEDULED' | 'MANUAL';

export interface BackupDatabaseResultDto {
    logicalDatabase: string;
    databaseName: string;
    status: BackupStatus;
    startedAt: string | null;
    completedAt: string | null;
    sizeBytes: number | null;
    sha256: string | null;
    failureCode: string | null;
    failureMessage: string | null;
}

export interface BackupJobDto {
    id: string;
    trigger: BackupTrigger;
    status: BackupStatus;
    requestedBy: string;
    requestedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    artifactSizeBytes: number | null;
    artifactSha256: string | null;
    expiresAt: string | null;
    failureCode: string | null;
    failureMessage: string | null;
    databases: BackupDatabaseResultDto[];
}

export interface BackupPageDto {
    items: BackupJobDto[];
    total: number;
    page: number;
    pageSize: number;
}

export function formatBytes(value: number | null): string {
    if (value == null) return '—';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDateTime(value: string | null): string {
    return value ? new Date(value).toLocaleString() : '—';
}
