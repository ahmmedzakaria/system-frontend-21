import { Injectable, inject } from '@angular/core';
import { ApiService } from '@nexacore/platform';
import { Observable } from 'rxjs';
import { ApiEndpoints } from '../api/api-endpoints';
import { PublicNavigationContext, PublicNavigationGroup, PublicNavigationIntegrity, PublicNavigationItem } from '../../pages/layout/public-navigation/public-navigation.model';

@Injectable({ providedIn: 'root' })
export class PublicNavigationService {
  private readonly api = inject(ApiService);
  groups(tenantId: number): Observable<PublicNavigationGroup[]> {
    return this.api.post(ApiEndpoints.PUBLIC_NAVIGATION_GROUP_LIST, { tenantId });
  }
  saveGroup(request: Record<string, unknown>): Observable<PublicNavigationGroup> {
    return this.api.post(ApiEndpoints.PUBLIC_NAVIGATION_GROUP_SAVE, request);
  }
  items(tenantId: number): Observable<PublicNavigationItem[]> {
    return this.api.post(ApiEndpoints.PUBLIC_NAVIGATION_ITEM_LIST, { tenantId });
  }
  saveItem(request: Record<string, unknown>): Observable<PublicNavigationItem> {
    return this.api.post(ApiEndpoints.PUBLIC_NAVIGATION_ITEM_SAVE, request);
  }
  assignments(tenantId: number, clientCode: string): Observable<{ itemIds: number[] }> {
    return this.api.post(ApiEndpoints.PUBLIC_NAVIGATION_ASSIGNMENT_LIST, { tenantId, clientCode });
  }
  replaceAssignments(tenantId: number, clientCode: string, itemIds: number[]): Observable<{ itemIds: number[] }> {
    return this.api.post(ApiEndpoints.PUBLIC_NAVIGATION_ASSIGNMENT_REPLACE, { tenantId, clientCode, itemIds });
  }
  preview(tenantId: number, clientCode: string, surfaces: string[]): Observable<PublicNavigationContext> {
    return this.api.post(ApiEndpoints.PUBLIC_NAVIGATION_PREVIEW, { tenantId, clientCode, surfaces });
  }
  integrity(tenantId: number): Observable<PublicNavigationIntegrity> {
    return this.api.post(ApiEndpoints.PUBLIC_NAVIGATION_INTEGRITY, { tenantId });
  }
}
