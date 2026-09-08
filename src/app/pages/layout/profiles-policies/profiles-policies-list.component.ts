import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ButtonComponent,
    DropdownOption,
    DynamicFormComponent,
    DynamicListComponent,
    DynamicListLoader,
    ListColumnConfig,
    ModalComponent,
    AssignmentChecklistComponent,
    ReplacementSummaryComponent
} from '@nexacore/shared';
import { LayoutService } from '../../../core/services/layout.service';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { PrivilegeService } from '../../../core/services/privilege.service';
import { PrivilegeDto } from '../../access-control/privileges/privileges.model';
import { ApplicationContextService, AuthorizedUiDirective, AuthorizationPolicyService } from '@nexacore/platform';
import {
    CLIENT_ASSIGNMENT_FIELDS,
    ClientLayoutAssignmentDto,
    ClientLayoutAssignmentRequestDto,
    LayoutProfileDto,
    LayoutProfileRequestDto,
    LayoutRoutePolicyRequestDto,
    LayoutThemeChromeOverrides,
    LayoutThemeColorPrimaries,
    LayoutThemeConfig,
    PROFILE_FIELDS,
    buildRoutePolicyFields,
    buildUiPolicyFields,
    RoutePrivilegePolicyDto,
    UiPrivilegePolicyDto,
    LayoutUiPolicyRequestDto,
    clientAssignmentInitialValue,
    defaultThemeConfig,
    emptyChromeOverrides,
    profileInitialValue,
    routePolicyInitialValue,
    uiPolicyInitialValue,
    unflattenFonts,
    unflattenSizes
} from '../layout.model';

type Tab = 'profiles' | 'uiPolicies' | 'routePolicies' | 'clientAssignment';

@Component({
    selector: 'app-profiles-policies-list',
    standalone: true,
    imports: [ButtonComponent, DynamicFormComponent, DynamicListComponent, ModalComponent, AuthorizedUiDirective,
        AssignmentChecklistComponent, ReplacementSummaryComponent],
    templateUrl: './profiles-policies-list.component.html',
    styleUrl: './profiles-policies-list.component.scss'
})
export class ProfilesPoliciesListComponent {
    private readonly service = inject(LayoutService);
    private readonly clientAppService = inject(ClientApplicationService);
    private readonly privilegeService = inject(PrivilegeService);
    private readonly policy = inject(AuthorizationPolicyService);
    private readonly applicationContext = inject(ApplicationContextService);
    /** `layout/client/list` and `layout/client/assign` both require an explicit
     * tenantId (the backend has no client-registered-tenant fallback) — this is
     * the signed-in admin's own effective tenant, same source `user-list.component.ts` uses. */
    private readonly currentTenantId = computed(() => this.applicationContext.effectiveTenant()?.tenantId ?? null);

    protected readonly activeTab = signal<Tab>('profiles');

    private readonly profileList = viewChild<DynamicListComponent<LayoutProfileDto>>('profileList');
    private readonly uiPolicyList = viewChild<DynamicListComponent<UiPrivilegePolicyDto>>('uiPolicyList');
    private readonly clientAssignmentList = viewChild<DynamicListComponent<ClientLayoutAssignmentDto>>('clientAssignmentList');

    // -- Profiles --
    protected readonly profileFields = PROFILE_FIELDS;
    protected readonly profileEditorOpen = signal(false);
    protected readonly profileEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly themes = signal<LayoutThemeConfig[]>([]);
    protected readonly previewProfile = signal<LayoutProfileDto | null>(null);
    protected readonly previewThemeId = signal('');
    protected readonly previewTheme = computed(() => {
        const profile = this.previewProfile();
        return profile?.themes.find(theme => theme.id === this.previewThemeId()) ?? profile?.themes[0] ?? null;
    });
    private editingProfileId: number | null = null;

    protected readonly loadProfiles: DynamicListLoader<LayoutProfileDto> = (params) =>
        this.service.profileList().pipe(
            map((rows) => {
                const query = params.query.trim().toLowerCase();
                const filtered = query
                    ? rows.filter((row) => row.code.toLowerCase().includes(query) || row.name.toLowerCase().includes(query))
                    : rows;
                const start = (params.page - 1) * params.pageSize;
                return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
            })
        );

    protected readonly profileColumns: ListColumnConfig<LayoutProfileDto>[] = [
        { key: 'code', header: 'Code' },
        { key: 'name', header: 'Name' },
        { key: 'layoutType', header: 'Layout Type' },
        { key: 'themeMode', header: 'Theme' },
        { key: 'density', header: 'Density' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [
                { icon: 'eye', label: 'Preview', onClick: (row) => this.openProfilePreview(row) },
                { icon: 'edit', label: 'Edit', permissionKey: 'layout.manage', onClick: (row) => this.openProfileEditor(row) }
            ]
        }
    ];

    // -- UI Policies --
    protected readonly uiPolicyFields = computed(() => buildUiPolicyFields(this.clientOptions()));
    protected readonly uiPolicyEditorOpen = signal(false);
    protected readonly uiPolicyEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly uiPolicyFilterClientCode = signal('');
    protected readonly privileges = signal<PrivilegeDto[]>([]);
    protected readonly uiPolicySelectedCodes = signal<ReadonlySet<string>>(new Set());
    private readonly uiPolicyOriginalCodes = signal<ReadonlySet<string>>(new Set());
    protected readonly editingUiPolicyVersion = signal<number | null>(null);
    protected readonly privilegeKey = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly privilegeLabel = (item: PrivilegeDto) => `${item.featureName} — ${item.actionName}`;
    protected readonly privilegeDetail = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly privilegeGroup = (item: PrivilegeDto) => `${item.moduleName} — ${item.submoduleName}`;
    protected readonly uiPolicySummary = computed(() => {
        const original = this.uiPolicyOriginalCodes();
        const selected = this.uiPolicySelectedCodes();
        return {
            additions: [...selected].filter(code => !original.has(code)),
            removals: [...original].filter(code => !selected.has(code)),
            unchanged: [...selected].filter(code => original.has(code))
        };
    });
    protected readonly editingUiPolicyVersionLabel = computed(() => {
        const version = this.editingUiPolicyVersion();
        return version === null ? null : `${version}`;
    });

    protected readonly loadUiPolicies: DynamicListLoader<UiPrivilegePolicyDto> = (params) =>
        this.service.uiPolicyList(this.uiPolicyFilterClientCode() || null).pipe(
            map((rows) => {
                const query = params.query.trim().toLowerCase();
                const filtered = query ? rows.filter((row) => row.actionCode.toLowerCase().includes(query)) : rows;
                const start = (params.page - 1) * params.pageSize;
                return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
            })
        );

    protected readonly uiPolicyColumns: ListColumnConfig<UiPrivilegePolicyDto>[] = [
        { key: 'actionCode', header: 'Action Code' },
        { key: 'matchMode', header: 'Match Mode' },
        { key: 'privilegeCodes', header: 'Privileges', format: (row) => row.privilegeCodes.join(', ') || '—' },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', permissionKey: 'layout.manage', onClick: (row) => this.openUiPolicyEditor(row) }]
        }
    ];

    // -- Route Policies --
    // Drives the frontend's own routePrivilegeGuard — separate from UI Policies
    // (button/action visibility) and from the nav tree's own feature-privilege
    // links (sidebar visibility only). A route with no policy here is only
    // reachable by users the client's own guard otherwise leaves unrestricted.
    protected readonly routePolicyFields = computed(() => buildRoutePolicyFields(this.clientOptions()));
    protected readonly routePolicyEditorOpen = signal(false);
    protected readonly routePolicyEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly routePolicyFilterClientCode = signal('');
    protected readonly routePolicySelectedCodes = signal<ReadonlySet<string>>(new Set());
    private readonly routePolicyOriginalCodes = signal<ReadonlySet<string>>(new Set());
    protected readonly routePolicySummary = computed(() => {
        const original = this.routePolicyOriginalCodes();
        const selected = this.routePolicySelectedCodes();
        return {
            additions: [...selected].filter(code => !original.has(code)),
            removals: [...original].filter(code => !selected.has(code)),
            unchanged: [...selected].filter(code => original.has(code))
        };
    });

    private readonly routePolicyList = viewChild<DynamicListComponent<RoutePrivilegePolicyDto>>('routePolicyList');

    protected onRoutePolicyClientChange(event: Event): void {
        this.routePolicyFilterClientCode.set((event.target as HTMLSelectElement).value);
        this.routePolicyList()?.reload();
    }

    protected readonly loadRoutePolicies: DynamicListLoader<RoutePrivilegePolicyDto> = (params) =>
        this.service.routePolicyList(this.routePolicyFilterClientCode() || null).pipe(
            map((rows) => {
                const query = params.query.trim().toLowerCase();
                const filtered = query ? rows.filter((row) => row.routeUrl.toLowerCase().includes(query)) : rows;
                const start = (params.page - 1) * params.pageSize;
                return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
            })
        );

    protected readonly routePolicyColumns: ListColumnConfig<RoutePrivilegePolicyDto>[] = [
        { key: 'routeUrl', header: 'Route URL' },
        { key: 'matchMode', header: 'Match Mode' },
        { key: 'privilegeCodes', header: 'Privileges', format: (row) => row.privilegeCodes.join(', ') || '—' },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', permissionKey: 'layout.manage', onClick: (row) => this.openRoutePolicyEditor(row) }]
        }
    ];

    protected openRoutePolicyEditor(row: RoutePrivilegePolicyDto | null): void {
        this.routePolicyEditorInitialValue.set(routePolicyInitialValue(row, this.routePolicyFilterClientCode(), row?.routeUrl ?? null));
        const codes = new Set(row?.privilegeCodes ?? []);
        this.routePolicyOriginalCodes.set(codes);
        this.routePolicySelectedCodes.set(new Set(codes));
        this.routePolicyEditorOpen.set(true);
    }
    protected closeRoutePolicyEditor(): void {
        this.routePolicyEditorOpen.set(false);
    }
    protected toggleRoutePolicyPrivilege(change: { item: PrivilegeDto; selected: boolean }): void {
        const next = new Set(this.routePolicySelectedCodes());
        change.selected ? next.add(change.item.privilegeCode) : next.delete(change.item.privilegeCode);
        this.routePolicySelectedCodes.set(next);
    }
    protected saveRoutePolicyEditor(value: Record<string, unknown>): void {
        const request: LayoutRoutePolicyRequestDto = {
            clientCode: (value['clientCode'] as string) || null,
            routeUrl: value['routeUrl'] as string,
            matchMode: value['matchMode'] as LayoutRoutePolicyRequestDto['matchMode'],
            privilegeCodes: [...this.routePolicySelectedCodes()]
        };
        this.service.routePolicySave(request).subscribe(() => {
            this.routePolicyEditorOpen.set(false);
            this.routePolicyList()?.reload();
        });
    }

    // -- Client Assignment --
    protected readonly clientAssignmentFields = CLIENT_ASSIGNMENT_FIELDS;
    protected readonly clientAssignmentEditorOpen = signal(false);
    protected readonly clientAssignmentEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly clientOptions = signal<DropdownOption<unknown>[]>([]);
    protected readonly assignmentFilterClientCode = signal('');
    protected readonly profileCatalog = signal<LayoutProfileDto[]>([]);
    protected readonly selectedAssignmentProfileCode = signal('');
    protected readonly selectedAssignmentProfile = computed(() => this.profileCatalog()
        .find(profile => profile.code === this.selectedAssignmentProfileCode()) ?? null);
    private editingAssignmentId: number | null = null;

    protected readonly loadClientAssignments: DynamicListLoader<ClientLayoutAssignmentDto> = (params) => {
        const clientCode = this.assignmentFilterClientCode();
        if (!clientCode) {
            return of({ items: [], total: 0 });
        }
        return this.service.clientAssignList(clientCode, this.currentTenantId()).pipe(
            map((rows) => {
                const start = (params.page - 1) * params.pageSize;
                return { items: rows.slice(start, start + params.pageSize), total: rows.length };
            })
        );
    };

    protected readonly clientAssignmentColumns: ListColumnConfig<ClientLayoutAssignmentDto>[] = [
        { key: 'profileCode', header: 'Profile Code' },
        { key: 'assignmentScope', header: 'Scope' },
        { key: 'deviceTarget', header: 'Device' },
        { key: 'defaultProfile', header: 'Default', type: 'badge', status: (row) => (row.defaultProfile ? 'verified' : 'draft') },
        { key: 'displayOrder', header: 'Order' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', permissionKey: 'layout.manage', onClick: (row) => this.openClientAssignmentEditor(row) }]
        }
    ];

    private clientOptionsRequested = false;

    constructor() {
        this.privilegeService.list().subscribe(privileges => this.privileges.set(privileges.filter(item => item.active)));
        this.service.profileList().subscribe(profiles => this.profileCatalog.set(profiles.filter(profile => profile.active)));
        /** `hasPrivilege` reads the async-loaded authorization context — a one-time
         * check here could race ahead of that load and permanently skip the fetch
         * even though the privilege is actually present. `effect()` re-evaluates
         * once the context resolves. */
        effect(() => {
            if (this.clientOptionsRequested || !this.policy.hasPrivilege('11020100101')) return;
            this.clientOptionsRequested = true;
            this.clientAppService.list().subscribe((clients) => {
                this.clientOptions.set(clients.map((client) => ({ label: `${client.clientName} (${client.clientCode})`, value: client.clientCode })));
            });
        });
    }

    protected setTab(tab: Tab): void {
        this.activeTab.set(tab);
    }

    protected onAssignmentClientChange(event: Event): void {
        this.assignmentFilterClientCode.set((event.target as HTMLSelectElement).value);
    }

    // -- Profiles --
    protected openProfileEditor(row: LayoutProfileDto | null): void {
        this.editingProfileId = row?.id ?? null;
        this.profileEditorInitialValue.set(profileInitialValue(row));
        this.themes.set(row?.themes?.length ? row.themes : [defaultThemeConfig()]);
        this.profileEditorOpen.set(true);
    }
    protected closeProfileEditor(): void {
        this.profileEditorOpen.set(false);
    }
    protected openProfilePreview(profile: LayoutProfileDto): void {
        this.previewProfile.set(profile);
        this.previewThemeId.set(profile.themes[0]?.id ?? '');
    }
    protected closeProfilePreview(): void { this.previewProfile.set(null); }
    protected saveProfileEditor(value: Record<string, unknown>): void {
        const request: LayoutProfileRequestDto = {
            id: this.editingProfileId,
            profileCode: (value['profileCode'] as string) || '',
            profileName: value['profileName'] as string,
            description: (value['description'] as string) || null,
            layoutType: value['layoutType'] as LayoutProfileRequestDto['layoutType'],
            navigationMode: value['navigationMode'] as LayoutProfileRequestDto['navigationMode'],
            themeMode: value['themeMode'] as LayoutProfileRequestDto['themeMode'],
            density: value['density'] as LayoutProfileRequestDto['density'],
            topbarEnabled: !!value['topbarEnabled'],
            sidebarEnabled: !!value['sidebarEnabled'],
            sidebarCollapsed: !!value['sidebarCollapsed'],
            footerEnabled: !!value['footerEnabled'],
            breadcrumbEnabled: !!value['breadcrumbEnabled'],
            commandBarEnabled: !!value['commandBarEnabled'],
            rtlEnabled: !!value['rtlEnabled'],
            active: !!value['active'],
            sizes: unflattenSizes(value),
            fonts: unflattenFonts(value),
            themes: this.themes()
        };
        this.service.profileSave(request).subscribe(() => {
            this.profileEditorOpen.set(false);
            this.profileList()?.reload();
        });
    }

    // -- Profiles: Themes --
    protected addTheme(): void {
        this.themes.update((list) => [...list, defaultThemeConfig()]);
    }
    protected removeTheme(index: number): void {
        this.themes.update((list) => list.filter((_, i) => i !== index));
    }
    protected updateTheme(index: number, patch: Partial<LayoutThemeConfig>): void {
        this.themes.update((list) => list.map((theme, i) => (i === index ? { ...theme, ...patch } : theme)));
    }
    protected updatePrimaries(index: number, patch: Partial<LayoutThemeColorPrimaries>): void {
        this.themes.update((list) => list.map((theme, i) => (i === index ? { ...theme, primaries: { ...theme.primaries, ...patch } } : theme)));
    }
    protected updateChromeOverrides(index: number, patch: Partial<LayoutThemeChromeOverrides>): void {
        this.themes.update((list) => list.map((theme, i) =>
            i === index ? { ...theme, chromeOverrides: { ...(theme.chromeOverrides ?? emptyChromeOverrides()), ...patch } } : theme));
    }
    protected themeFieldInput(index: number, key: keyof LayoutThemeConfig, event: Event): void {
        this.updateTheme(index, { [key]: (event.target as HTMLInputElement | HTMLSelectElement).value } as Partial<LayoutThemeConfig>);
    }
    protected primariesFieldInput(index: number, key: keyof LayoutThemeColorPrimaries, event: Event): void {
        this.updatePrimaries(index, { [key]: (event.target as HTMLInputElement).value } as Partial<LayoutThemeColorPrimaries>);
    }
    protected chromeFieldInput(index: number, key: keyof LayoutThemeChromeOverrides, event: Event): void {
        this.updateChromeOverrides(index, { [key]: (event.target as HTMLInputElement).value } as Partial<LayoutThemeChromeOverrides>);
    }

    // -- UI Policies --
    protected openUiPolicyEditor(row: UiPrivilegePolicyDto | null): void {
        this.uiPolicyEditorInitialValue.set(uiPolicyInitialValue(row, this.uiPolicyFilterClientCode()));
        const codes = new Set(row?.privilegeCodes ?? []);
        this.uiPolicyOriginalCodes.set(codes);
        this.uiPolicySelectedCodes.set(new Set(codes));
        this.editingUiPolicyVersion.set(row?.version ?? null);
        this.uiPolicyEditorOpen.set(true);
    }
    protected closeUiPolicyEditor(): void {
        this.uiPolicyEditorOpen.set(false);
    }
    protected toggleUiPolicyPrivilege(change: { item: PrivilegeDto; selected: boolean }): void {
        const next = new Set(this.uiPolicySelectedCodes());
        change.selected ? next.add(change.item.privilegeCode) : next.delete(change.item.privilegeCode);
        this.uiPolicySelectedCodes.set(next);
    }
    protected saveUiPolicyEditor(value: Record<string, unknown>): void {
        const request: LayoutUiPolicyRequestDto = {
            version: this.editingUiPolicyVersion(),
            clientCode: (value['clientCode'] as string) || null,
            actionCode: value['actionCode'] as string,
            matchMode: value['matchMode'] as LayoutUiPolicyRequestDto['matchMode'],
            active: !!value['active'],
            privilegeCodes: [...this.uiPolicySelectedCodes()]
        };
        this.service.uiPolicySave(request).subscribe(() => {
            this.uiPolicyEditorOpen.set(false);
            this.uiPolicyList()?.reload();
        });
    }

    // -- Client Assignment --
    protected openClientAssignmentEditor(row: ClientLayoutAssignmentDto | null): void {
        this.editingAssignmentId = row?.id ?? null;
        this.clientAssignmentEditorInitialValue.set(clientAssignmentInitialValue(row));
        this.selectedAssignmentProfileCode.set(row?.profileCode ?? '');
        this.clientAssignmentEditorOpen.set(true);
    }
    protected closeClientAssignmentEditor(): void {
        this.clientAssignmentEditorOpen.set(false);
    }
    protected selectAssignmentProfile(event: Event): void {
        this.selectedAssignmentProfileCode.set((event.target as HTMLSelectElement).value);
    }
    protected saveClientAssignmentEditor(value: Record<string, unknown>): void {
        const request: ClientLayoutAssignmentRequestDto = {
            id: this.editingAssignmentId,
            tenantId: this.currentTenantId(),
            clientApplicationId: null,
            clientCode: this.assignmentFilterClientCode(),
            layoutProfileId: null,
            profileCode: this.selectedAssignmentProfileCode(),
            assignmentScope: value['assignmentScope'] as ClientLayoutAssignmentRequestDto['assignmentScope'],
            roleCode: (value['roleCode'] as string) || null,
            privilegeCode: (value['privilegeCode'] as string) || null,
            deviceTarget: value['deviceTarget'] as ClientLayoutAssignmentRequestDto['deviceTarget'],
            moduleCode: (value['moduleCode'] as string) || null,
            defaultProfile: !!value['defaultProfile'],
            selectable: !!value['selectable'],
            displayOrder: (value['displayOrder'] as number) ?? 100,
            active: !!value['active']
        };
        this.service.clientAssignSave(request).subscribe(() => {
            this.clientAssignmentEditorOpen.set(false);
            this.clientAssignmentList()?.reload();
        });
    }
}
