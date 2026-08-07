import { Injectable, inject } from '@angular/core';
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

    save(request: ApiRegistryRequestDto): Observable<ApiRegistryDto> {
        return this.api.post<ApiRegistryDto>(ApiEndpoints.API_REGISTRY_SAVE, request);
    }

    /** Reconciles the persisted registry against the live inventory scan (added/changed/unchanged/deactivated/conflicted). */
    sync(): Observable<ApiRegistrySyncReportDto> {
        return this.api.post<ApiRegistrySyncReportDto>(ApiEndpoints.API_REGISTRY_SYNC);
    }
}
