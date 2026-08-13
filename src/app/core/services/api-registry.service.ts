import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import {
    ApiInventoryItemDto,
    ApiRegistryDto,
    ApiRegistryRequestDto,
    ApiRegistrySyncReportDto
} from '../../pages/access-control/access-control.model';

@Injectable({ providedIn: 'root' })
export class ApiRegistryService {
    private readonly api = inject(ApiService);

    list(): Observable<ApiRegistryDto[]> {
        return this.api.post<ApiRegistryDto[]>(ApiEndpoints.API_REGISTRY_LIST);
    }

    /** Live scan of every @RequestMapping under com.nexacore.* — distinct from list(), which reads the persisted table. */
    inventory(): Observable<ApiInventoryItemDto[]> {
        return this.api.post<ApiInventoryItemDto[]>(ApiEndpoints.API_REGISTRY_INVENTORY);
    }
    search(query:string,page:number,pageSize:number):Observable<{items:ApiRegistryDto[];total:number}> {
        return this.api.post<{items:ApiRegistryDto[];total:number}>(ApiEndpoints.API_REGISTRY_SEARCH,{query,page,pageSize});
    }
    inventorySearch(query:string,page:number,pageSize:number):Observable<{items:ApiInventoryItemDto[];total:number}> {
        return this.api.post<{items:ApiInventoryItemDto[];total:number}>(ApiEndpoints.API_REGISTRY_INVENTORY_SEARCH,{query,page,pageSize});
    }

    save(request: ApiRegistryRequestDto): Observable<ApiRegistryDto> {
        return this.api.post<ApiRegistryDto>(ApiEndpoints.API_REGISTRY_SAVE, request);
    }

    /** Reconciles the persisted registry against the live inventory scan (added/changed/unchanged/deactivated/conflicted). */
    sync(): Observable<ApiRegistrySyncReportDto> {
        return this.api.post<ApiRegistrySyncReportDto>(ApiEndpoints.API_REGISTRY_SYNC);
    }

    previewSync(): Observable<ApiRegistrySyncReportDto> {
        return this.api.post<ApiRegistrySyncReportDto>(ApiEndpoints.API_REGISTRY_SYNC_PREVIEW);
    }

    applySync(previewVersion:string): Observable<ApiRegistrySyncReportDto> {
        return this.api.post<ApiRegistrySyncReportDto>(ApiEndpoints.API_REGISTRY_SYNC_APPLY,{previewVersion});
    }

    saveStepUp(request:ApiRegistryRequestDto):Observable<ApiRegistryDto> {
        return this.api.post<ApiRegistryDto>(ApiEndpoints.API_REGISTRY_SAVE,request,
            {headers:new HttpHeaders().set('X-Step-Up-Authentication','reauthenticated')});
    }
}
