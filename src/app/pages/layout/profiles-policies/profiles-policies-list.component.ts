import { Component, inject, signal, viewChild } from '@angular/core';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ButtonComponent,
    DropdownOption,
    DynamicFormComponent,
    DynamicListComponent,
    DynamicListLoader,
    ListColumnConfig,
    ModalComponent
} from '@nexacore/shared';
import { LayoutService } from '../../../core/services/layout.service';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { AuthorizedUiDirective, AuthorizationPolicyService } from '@nexacore/platform';
import {
    CLIENT_ASSIGNMENT_FIELDS,
    ClientLayoutAssignmentDto,
    ClientLayoutAssignmentRequestDto,
    LayoutProfileDto,
    LayoutProfileRequestDto,
    LayoutThemeChromeOverrides,
    LayoutThemeColorPrimaries,
    LayoutThemeConfig,
    PROFILE_FIELDS,
    UI_POLICY_FIELDS,
    UiPrivilegePolicyDto,
    LayoutUiPolicyRequestDto,
    clientAssignmentInitialValue,
    defaultThemeConfig,
    emptyChromeOverrides,
    profileInitialValue,
    splitPrivilegeCodes,
    uiPolicyInitialValue,
    unflattenFonts,
    unflattenSizes
} from '../layout.model';

type Tab = 'profiles' | 'uiPolicies' | 'clientAssignment';

@Component({
    selector: 'app-profiles-policies-list',
    standalone: true,
    imports: [ButtonComponent, DynamicFormComponent, DynamicListComponent, ModalComponent, AuthorizedUiDirective],
    templateUrl: './profiles-policies-list.component.html',
    styleUrl: './profiles-policies-list.component.scss'
})
export class ProfilesPoliciesListComponent {
    private readonly service = inject(LayoutService);
    private readonly clientAppService = inject(ClientApplicationService);
    private readonly policy = inject(AuthorizationPolicyService);

    protected readonly activeTab = signal<Tab>('profiles');

    private readonly profileList = viewChild<DynamicListComponent<LayoutProfileDto>>('profileList');
    private readonly uiPolicyList = viewChild<DynamicListComponent<UiPrivilegePolicyDto>>('uiPolicyList');
    private readonly clientAssignmentList = viewChild<DynamicListComponent<ClientLayoutAssignmentDto>>('clientAssignmentList');

    // -- Profiles --
    protected readonly profileFields = PROFILE_FIELDS;
    protected readonly profileEditorOpen = signal(false);
    protected readonly profileEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly themes = signal<LayoutThemeConfig[]>([]);
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
            actions: [{ icon: 'edit', label: 'Edit', permissionKey: 'layout.manage', onClick: (row) => this.openProfileEditor(row) }]
        }
    ];

    // -- UI Policies --
    protected readonly uiPolicyFields = UI_POLICY_FIELDS;
    protected readonly uiPolicyEditorOpen = signal(false);
    protected readonly uiPolicyEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly uiPolicyFilterClientCode = signal('');

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

    // -- Client Assignment --
    protected readonly clientAssignmentFields = CLIENT_ASSIGNMENT_FIELDS;
    protected readonly clientAssignmentEditorOpen = signal(false);
    protected readonly clientAssignmentEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly clientOptions = signal<DropdownOption<unknown>[]>([]);
    protected readonly assignmentFilterClientCode = signal('');
    private editingAssignmentId: number | null = null;

    protected readonly loadClientAssignments: DynamicListLoader<ClientLayoutAssignmentDto> = (params) => {
        const clientCode = this.assignmentFilterClientCode();
        if (!clientCode) {
            return of({ items: [], total: 0 });
        }
        return this.service.clientAssignList(clientCode).pipe(
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

    constructor() {
        if (this.policy.hasPrivilege('11020100101')) this.clientAppService.list().subscribe((clients) => {
            this.clientOptions.set(clients.map((client) => ({ label: `${client.clientName} (${client.clientCode})`, value: client.clientCode })));
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
        this.uiPolicyEditorOpen.set(true);
    }
    protected closeUiPolicyEditor(): void {
        this.uiPolicyEditorOpen.set(false);
    }
    protected saveUiPolicyEditor(value: Record<string, unknown>): void {
        const request: LayoutUiPolicyRequestDto = {
            clientCode: (value['clientCode'] as string) || null,
            actionCode: value['actionCode'] as string,
            matchMode: value['matchMode'] as LayoutUiPolicyRequestDto['matchMode'],
            active: !!value['active'],
            privilegeCodes: splitPrivilegeCodes((value['privilegeCodesText'] as string) || '')
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
        this.clientAssignmentEditorOpen.set(true);
    }
    protected closeClientAssignmentEditor(): void {
        this.clientAssignmentEditorOpen.set(false);
    }
    protected saveClientAssignmentEditor(value: Record<string, unknown>): void {
        const request: ClientLayoutAssignmentRequestDto = {
            id: this.editingAssignmentId,
            clientApplicationId: null,
            clientCode: this.assignmentFilterClientCode(),
            layoutProfileId: null,
            profileCode: value['profileCode'] as string,
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
