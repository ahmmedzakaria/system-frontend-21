import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@nexacore/platform';
import { ApiEndpoints } from '../api/api-endpoints';
import {
    ClientLayoutAssignmentDto,
    ClientLayoutAssignmentRequestDto,
    LayoutNavigationNodeRequestDto,
    LayoutNavigationCategoryOrderRequestDto,
    LayoutNavigationIntegrityDto,
    LayoutProfileDto,
    LayoutProfileRequestDto,
    LayoutRoutePolicyRequestDto,
    LayoutUiPolicyRequestDto,
    NavNodeDto,
    RoutePrivilegePolicyDto,
    UiPrivilegePolicyDto
} from '../../pages/layout/layout.model';

@Injectable({ providedIn: 'root' })
export class LayoutService {
    private readonly api = inject(ApiService);

    profileList(): Observable<LayoutProfileDto[]> {
        return this.api.post<LayoutProfileDto[]>(ApiEndpoints.LAYOUT_PROFILE_LIST);
    }

    profileSave(request: LayoutProfileRequestDto): Observable<LayoutProfileDto> {
        return this.api.post<LayoutProfileDto>(ApiEndpoints.LAYOUT_PROFILE_SAVE, request);
    }

    uiPolicyList(clientCode: string | null): Observable<UiPrivilegePolicyDto[]> {
        return this.api.post<UiPrivilegePolicyDto[]>(ApiEndpoints.LAYOUT_UI_POLICY_LIST, { clientCode });
    }

    uiPolicySave(request: LayoutUiPolicyRequestDto): Observable<UiPrivilegePolicyDto> {
        return this.api.post<UiPrivilegePolicyDto>(ApiEndpoints.LAYOUT_UI_POLICY_SAVE, request);
    }

    routePolicyList(clientCode: string | null): Observable<RoutePrivilegePolicyDto[]> {
        return this.api.post<RoutePrivilegePolicyDto[]>(ApiEndpoints.LAYOUT_ROUTE_POLICY_LIST, { clientCode });
    }

    routePolicySave(request: LayoutRoutePolicyRequestDto): Observable<void> {
        return this.api.post<void>(ApiEndpoints.LAYOUT_ROUTE_POLICY_SAVE, request);
    }

    clientAssignList(clientCode: string, tenantId: number | null): Observable<ClientLayoutAssignmentDto[]> {
        return this.api.post<ClientLayoutAssignmentDto[]>(ApiEndpoints.LAYOUT_CLIENT_ASSIGN_LIST, { clientCode, tenantId });
    }

    clientAssignSave(request: ClientLayoutAssignmentRequestDto): Observable<ClientLayoutAssignmentDto> {
        return this.api.post<ClientLayoutAssignmentDto>(ApiEndpoints.LAYOUT_CLIENT_ASSIGN_SAVE, request);
    }

    navigationTree(clientCode: string, username: string): Observable<NavNodeDto[]> {
        return this.api.post<NavNodeDto[]>(ApiEndpoints.LAYOUT_NAVIGATION_TREE, { clientCode, username });
    }

    navigationTreeAdmin(): Observable<NavNodeDto[]> {
        return this.api.post<NavNodeDto[]>(ApiEndpoints.LAYOUT_NAVIGATION_TREE_ADMIN, {});
    }

    navigationPreview(clientCode: string, username: string): Observable<NavNodeDto[]> {
        return this.api.post<NavNodeDto[]>(ApiEndpoints.LAYOUT_NAVIGATION_PREVIEW, { clientCode, username });
    }

    navigationIntegrity(): Observable<LayoutNavigationIntegrityDto> {
        return this.api.post<LayoutNavigationIntegrityDto>(ApiEndpoints.LAYOUT_NAVIGATION_INTEGRITY, {});
    }

    saveGroup(request: LayoutNavigationNodeRequestDto): Observable<NavNodeDto> {
        return this.api.post<NavNodeDto>(ApiEndpoints.LAYOUT_NAVIGATION_GROUP_SAVE, request);
    }

    saveModule(request: LayoutNavigationNodeRequestDto): Observable<NavNodeDto> {
        return this.api.post<NavNodeDto>(ApiEndpoints.LAYOUT_NAVIGATION_MODULE_SAVE, request);
    }

    saveCategory(request: LayoutNavigationNodeRequestDto): Observable<NavNodeDto> {
        return this.api.post<NavNodeDto>(ApiEndpoints.LAYOUT_NAVIGATION_CATEGORY_SAVE, request);
    }

    reorderCategories(request: LayoutNavigationCategoryOrderRequestDto): Observable<void> {
        return this.api.post<void>(ApiEndpoints.LAYOUT_NAVIGATION_CATEGORY_REORDER, request);
    }

    saveFeatureGroup(request: LayoutNavigationNodeRequestDto): Observable<NavNodeDto> {
        return this.api.post<NavNodeDto>(ApiEndpoints.LAYOUT_NAVIGATION_FEATURE_GROUP_SAVE, request);
    }

    saveFeature(request: LayoutNavigationNodeRequestDto): Observable<NavNodeDto> {
        return this.api.post<NavNodeDto>(ApiEndpoints.LAYOUT_NAVIGATION_FEATURE_SAVE, request);
    }
}
