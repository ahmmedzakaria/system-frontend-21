export type DashboardMetricKey='activeClients'|'apiMetadataConflicts'|'pendingTenants'|'licensesNearingExpiry'|'runningBackups'|'failedBackups';
export interface DashboardMetricDto{value:number;severity:'NONE'|'WARNING'|'CRITICAL';warningCode:string|null;route:string;}
export interface DashboardDiagnosticsDto{enforcementMode:string;accessControlEnabled:boolean;registryLastSynchronizedAt:string|null;}
export interface DashboardAggregateDto{generatedAt:string;metrics:Partial<Record<DashboardMetricKey,DashboardMetricDto>>;diagnostics:DashboardDiagnosticsDto|null;}
export const DASHBOARD_PRESENTATION:Record<DashboardMetricKey,{title:string;icon:string}>={
 activeClients:{title:'Active client applications',icon:'building'},apiMetadataConflicts:{title:'API metadata conflicts',icon:'triangle-exclamation'},
 pendingTenants:{title:'Pending tenant onboarding',icon:'building'},licensesNearingExpiry:{title:'Licenses nearing expiry',icon:'clock'},
 runningBackups:{title:'Running backups',icon:'archive'},failedBackups:{title:'Failed or partial backups',icon:'triangle-exclamation'}
};
