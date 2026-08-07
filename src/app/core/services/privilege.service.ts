import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import { PrivilegeListItemDto } from '../../pages/access-control/access-control.model';

/**
 * Minimal read-only wrapper used ahead of the full Privilege module (a later
 * phase) — Access Control's Feature Permissions picker needs the flat
 * privilege list, not the whole Privilege admin surface.
 */
@Injectable({ providedIn: 'root' })
export class PrivilegeService {
    private readonly api = inject(ApiService);

    list(): Observable<PrivilegeListItemDto[]> {
        return this.api.post<PrivilegeListItemDto[]>(ApiEndpoints.PRIVILEGE_LIST);
    }
}
