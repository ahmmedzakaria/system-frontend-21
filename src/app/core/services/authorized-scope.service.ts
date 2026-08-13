import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ScopeLookupOption } from '@nexacore/shared';
import { ApiEndpoints } from '../api/api-endpoints';

interface ScopeLookupDto { id:number; code:string; displayName:string; tenantId:number; businessId:number|null; }
@Injectable({providedIn:'root'})
export class AuthorizedScopeService {
    private readonly api=inject(ApiService);
    readonly tenants=():Observable<readonly ScopeLookupOption[]>=>this.api.post<ScopeLookupDto[]>(ApiEndpoints.TENANT_AUTHORIZED).pipe(map(this.options));
    readonly businesses=(tenantId:number):Observable<readonly ScopeLookupOption[]>=>this.api.post<ScopeLookupDto[]>(ApiEndpoints.TENANT_BUSINESSES,{tenantId}).pipe(map(this.options));
    readonly branches=(tenantId:number,businessId:number):Observable<readonly ScopeLookupOption[]>=>this.api.post<ScopeLookupDto[]>(ApiEndpoints.TENANT_BRANCHES,{tenantId,businessId}).pipe(map(this.options));
    private readonly options=(rows:ScopeLookupDto[])=>rows.map(row=>({id:row.id,label:`${row.displayName} (#${row.id})`}));
}
