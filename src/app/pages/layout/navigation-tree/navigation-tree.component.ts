import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, of } from 'rxjs';
import {
    ButtonComponent,
    DropdownOption,
    DynamicDropdownComponent,
    DynamicFormComponent,
    DynamicListComponent,
    DynamicListLoader,
    ListColumnConfig,
    ModalComponent,
    AssignmentChecklistComponent,
    ReplacementSummaryComponent
} from '@nexacore/shared';
import { LayoutService } from '../../../core/services/layout.service';
import { ApplicationContextService, AuthorizedUiDirective } from '@nexacore/platform';
import { PrivilegeService } from '../../../core/services/privilege.service';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { UserService } from '../../../core/services/user.service';
import { PrivilegeDto } from '../../access-control/privileges/privileges.model';
import {
    LayoutNavigationNodeRequestDto,
    NavNodeDto,
    categoryFields,
    featureFields,
    featureGroupFields,
    moduleFields,
    moduleGroupFields,
    navNodeInitialValue,
} from '../layout.model';

type Level = 'groups' | 'modules' | 'categories' | 'featureGroups' | 'features';

@Component({
    selector: 'app-navigation-tree',
    standalone: true,
    imports: [ButtonComponent, DynamicFormComponent, DynamicListComponent, ModalComponent, AuthorizedUiDirective,
        AssignmentChecklistComponent, ReplacementSummaryComponent, DynamicDropdownComponent, FormsModule, NgTemplateOutlet],
    templateUrl: './navigation-tree.component.html',
    styleUrl: './navigation-tree.component.scss'
})
export class NavigationTreeComponent {
    private readonly service = inject(LayoutService);
    private readonly privilegeService = inject(PrivilegeService);
    private readonly clientAppService = inject(ClientApplicationService);
    private readonly userService = inject(UserService);
    private readonly applicationContext = inject(ApplicationContextService);

    protected readonly activeLevel = signal<Level>('groups');
    protected readonly previewToolsActive = signal(false);
    protected readonly previewClientCode = signal('SYSTEM_ADMIN_WEB');
    protected readonly previewUsername = signal('');
    protected readonly previewClientOptions = signal<DropdownOption<string>[]>([]);
    protected readonly previewUsernameOptions = signal<DropdownOption<string>[]>([]);
    protected readonly previewTree = signal<NavNodeDto[] | null>(null);
    protected readonly previewOpen = signal(false);
    protected readonly previewLoading = signal(false);
    protected readonly integrity = signal<import('../layout.model').LayoutNavigationIntegrityDto | null>(null);
    protected readonly previewFeatureCount = computed(() => this.countFeatures(this.previewTree() ?? []));

    protected readonly groups = signal<NavNodeDto[]>([]);
    protected readonly modules = signal<NavNodeDto[]>([]);
    protected readonly categories = signal<NavNodeDto[]>([]);
    protected readonly featureGroups = signal<NavNodeDto[]>([]);
    protected readonly features = signal<NavNodeDto[]>([]);

    protected readonly groupOptions = computed<DropdownOption<unknown>[]>(() =>
        this.groups().map((node) => ({ label: `${node.label} (${node.code})`, value: node.id })));
    protected readonly moduleOptions = computed<DropdownOption<unknown>[]>(() =>
        this.modules().map((node) => ({ label: `${node.label} (${node.code})`, value: node.id })));
    protected readonly categoryOptions = computed<DropdownOption<unknown>[]>(() =>
        this.categories().map((node) => ({ label: `${node.label} (${node.code})`, value: node.id })));
    protected readonly featureGroupOptions = computed<DropdownOption<unknown>[]>(() =>
        this.featureGroups().map((node) => ({ label: `${node.label} (${node.code})`, value: node.id })));

    /** Sourced from the same active-privilege catalog already loaded for the feature
     * privilege checklist below — every privilege carries its module/submodule/feature-type/
     * feature code+name, so the distinct set of each across all privileges is exactly the
     * "physical" catalog these codes need to reference. No dedicated catalog endpoint exists. */
    protected readonly physicalModuleOptions = computed<DropdownOption<unknown>[]>(() =>
        this.distinctOptions(this.privileges(), (item) => item.moduleCode, (item) => item.moduleName));
    protected readonly physicalSubmoduleOptions = computed<DropdownOption<unknown>[]>(() =>
        this.distinctOptions(this.privileges(), (item) => item.submoduleCode, (item) => item.submoduleName));
    protected readonly physicalFeatureTypeOptions = computed<DropdownOption<unknown>[]>(() =>
        this.distinctOptions(this.privileges(), (item) => item.featureTypeCode, (item) => item.featureTypeName));
    protected readonly physicalFeatureOptions = computed<DropdownOption<unknown>[]>(() =>
        this.distinctOptions(this.privileges(), (item) => item.featureCode, (item) => item.featureName));

    private distinctOptions(items: PrivilegeDto[], codeOf: (item: PrivilegeDto) => string, nameOf: (item: PrivilegeDto) => string): DropdownOption<unknown>[] {
        const seen = new Map<string, string>();
        for (const item of items) {
            if (!seen.has(codeOf(item))) seen.set(codeOf(item), nameOf(item));
        }
        return [...seen.entries()].map(([code, name]) => ({ label: `${name} (${code})`, value: code }));
    }

    protected readonly groupFields = moduleGroupFields();
    protected readonly moduleFieldsComputed = computed(() => moduleFields(this.groupOptions(), this.physicalModuleOptions()));
    protected readonly categoryFieldsComputed = computed(() => categoryFields(this.moduleOptions(), this.physicalFeatureTypeOptions()));
    protected readonly featureGroupFieldsComputed = computed(() => featureGroupFields(
        this.moduleOptions(), this.physicalFeatureTypeOptions()));
    protected readonly featureFieldsComputed = computed(() => featureFields(this.featureGroupOptions(),
        this.physicalModuleOptions(), this.physicalSubmoduleOptions(), this.physicalFeatureTypeOptions(), this.physicalFeatureOptions()));

    private readonly groupList = viewChild<DynamicListComponent<NavNodeDto>>('groupList');
    private readonly moduleList = viewChild<DynamicListComponent<NavNodeDto>>('moduleList');
    private readonly categoryList = viewChild<DynamicListComponent<NavNodeDto>>('categoryList');
    private readonly featureGroupList = viewChild<DynamicListComponent<NavNodeDto>>('featureGroupList');
    private readonly featureList = viewChild<DynamicListComponent<NavNodeDto>>('featureList');

    protected readonly editorOpen = signal(false);
    protected readonly editorInitialValue = signal<Record<string, unknown>>({});
    protected editingLevel: Level = 'groups';
    private editingId: number | null = null;
    protected editingVersion: number | null = null;
    protected readonly privileges = signal<PrivilegeDto[]>([]);
    protected readonly featureSelectedCodes = signal<ReadonlySet<string>>(new Set());
    private readonly featureOriginalCodes = signal<ReadonlySet<string>>(new Set());
    protected readonly privilegeKey = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly privilegeLabel = (item: PrivilegeDto) => `${item.featureName} — ${item.actionName}`;
    protected readonly privilegeDetail = (item: PrivilegeDto) => item.privilegeCode;
    protected readonly privilegeGroup = (item: PrivilegeDto) => `${item.moduleName} — ${item.submoduleName}`;
    protected readonly featurePrivilegeSummary = computed(() => {
        const original = this.featureOriginalCodes();
        const selected = this.featureSelectedCodes();
        return { additions: [...selected].filter(code => !original.has(code)), removals: [...original].filter(code => !selected.has(code)),
            unchanged: [...selected].filter(code => original.has(code)) };
    });
    protected editingVersionLabel(): string | null { return this.editingVersion === null ? null : `${this.editingVersion}`; }

    constructor() {
        this.privilegeService.list().subscribe(privileges => this.privileges.set(privileges.filter(item => item.active)));
        this.clientAppService.list().subscribe(clients =>
            this.previewClientOptions.set(clients.map(client => ({ label: `${client.clientName} (${client.clientCode})`, value: client.clientCode }))));
        this.userService.list(this.applicationContext.effectiveTenant()?.tenantId ?? null).subscribe(users =>
            this.previewUsernameOptions.set(users.map(user => ({
                label: user.personName ? `${user.username} — ${user.personName}` : user.username,
                value: user.username
            }))));
        this.reload();
    }

    private reload(): void {
        this.service.navigationTreeAdmin().subscribe((tree) => {
            const groups: NavNodeDto[] = [];
            const modules: NavNodeDto[] = [];
            const categories: NavNodeDto[] = [];
            const featureGroups: NavNodeDto[] = [];
            const features: NavNodeDto[] = [];
            for (const group of tree) {
                groups.push(group);
                for (const module of group.children) {
                    modules.push(module);
                    for (const category of module.children) {
                        categories.push(category);
                        for (const featureGroup of category.children) {
                            featureGroups.push(featureGroup);
                            for (const feature of featureGroup.children) {
                                features.push(feature);
                            }
                        }
                    }
                }
            }
            this.groups.set(groups);
            this.modules.set(modules);
            this.categories.set(categories);
            this.featureGroups.set(featureGroups);
            this.features.set(features);

            this.groupList()?.reload();
            this.moduleList()?.reload();
            this.categoryList()?.reload();
            this.featureGroupList()?.reload();
            this.featureList()?.reload();
        });
    }

    private makeLoader(source: () => NavNodeDto[], textOf: (row: NavNodeDto) => string): DynamicListLoader<NavNodeDto> {
        return (params) => {
            const rows = source();
            const query = params.query.trim().toLowerCase();
            const filtered = query ? rows.filter((row) => textOf(row).toLowerCase().includes(query)) : rows;
            const start = (params.page - 1) * params.pageSize;
            return of({ items: filtered.slice(start, start + params.pageSize), total: filtered.length });
        };
    }

    protected readonly loadGroups = this.makeLoader(this.groups, (row) => `${row.code} ${row.label}`);
    protected readonly loadModules = this.makeLoader(this.modules, (row) => `${row.code} ${row.label}`);
    protected readonly loadCategories = this.makeLoader(this.categories, (row) => `${row.code} ${row.label}`);
    protected readonly loadFeatureGroups = this.makeLoader(this.featureGroups, (row) => `${row.code} ${row.label}`);
    protected readonly loadFeatures = this.makeLoader(this.features, (row) => `${row.code} ${row.label} ${row.route ?? ''}`);

    private columnsFor(level: Level): ListColumnConfig<NavNodeDto>[] {
        const base: ListColumnConfig<NavNodeDto>[] = [
            { key: 'code', header: 'Code' },
            { key: 'label', header: 'Name' }
        ];
        if (level === 'features') {
            base.push({ key: 'route', header: 'Route', format: (row) => row.route ?? '—' });
            base.push({ key: 'tCode', header: 'T-Code', format: (row) => row.tCode ?? '—' });
        }
        base.push({ key: 'displayOrder', header: 'Order' });
        base.push({ key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') });
        base.push({
            key: 'actions', header: '', align: 'end', type: 'actions',
            actions: [
                { icon: 'edit', label: 'Edit', permissionKey: 'layout.manage', onClick: (row) => this.openEditor(level, row) },
                ...(level === 'categories' ? [
                    { icon: 'chevron-up', label: 'Move up', permissionKey: 'layout.manage', onClick: (row: NavNodeDto) => this.moveCategory(row, -1) },
                    { icon: 'chevron-down', label: 'Move down', permissionKey: 'layout.manage', onClick: (row: NavNodeDto) => this.moveCategory(row, 1) }
                ] : [])
            ]
        });
        return base;
    }

    protected readonly groupColumns = this.columnsFor('groups');
    protected readonly moduleColumns = this.columnsFor('modules');
    protected readonly categoryColumns = this.columnsFor('categories');
    protected readonly featureGroupColumns = this.columnsFor('featureGroups');
    protected readonly featureColumns = this.columnsFor('features');

    protected setLevel(level: Level): void {
        this.activeLevel.set(level);
        this.previewToolsActive.set(false);
    }

    protected showPreviewTools(): void { this.previewToolsActive.set(true); }

    protected loadPreview(): void {
        if (!this.previewClientCode().trim() || !this.previewUsername().trim()) return;
        this.previewTree.set(null);
        this.previewOpen.set(true);
        this.previewLoading.set(true);
        this.service.navigationPreview(this.previewClientCode().trim(), this.previewUsername().trim())
            .pipe(finalize(() => this.previewLoading.set(false)))
            .subscribe(tree => this.previewTree.set(tree));
    }
    protected closePreview(): void { this.previewOpen.set(false); }
    protected loadIntegrity(): void { this.service.navigationIntegrity().subscribe(report => this.integrity.set(report)); }
    private countFeatures(nodes: NavNodeDto[]): number {
        return nodes.reduce((count, node) => count + (node.type === 'feature' ? 1 : 0) + this.countFeatures(node.children), 0);
    }

    protected fieldsForActiveLevel() {
        switch (this.editingLevel) {
            case 'groups': return this.groupFields;
            case 'modules': return this.moduleFieldsComputed();
            case 'categories': return this.categoryFieldsComputed();
            case 'featureGroups': return this.featureGroupFieldsComputed();
            case 'features': return this.featureFieldsComputed();
        }
    }

    protected titleForActiveLevel(): string {
        switch (this.editingLevel) {
            case 'groups': return 'Module Group';
            case 'modules': return 'Module';
            case 'categories': return 'Category';
            case 'featureGroups': return 'Feature Group';
            case 'features': return 'Feature';
        }
    }

    protected openEditor(level: Level, row: NavNodeDto | null): void {
        this.editingLevel = level;
        this.editingId = row?.id ?? null;
        this.editingVersion = row?.version ?? null;
        const codes = new Set(row?.privilegeCodes ?? []);
        this.featureOriginalCodes.set(codes);
        this.featureSelectedCodes.set(new Set(codes));
        const initialValue = navNodeInitialValue(row);
        if (level === 'featureGroups' && row?.parentId != null) {
            const category = this.categories().find(candidate => candidate.id === row.parentId);
            initialValue['parentId'] = category?.parentId ?? null;
            initialValue['featureTypeCode'] = category?.featureTypeCode ?? '';
        }
        this.editorInitialValue.set(initialValue);
        this.editorOpen.set(true);
    }

    protected closeEditor(): void {
        this.editorOpen.set(false);
    }

    protected toggleFeaturePrivilege(change: { item: PrivilegeDto; selected: boolean }): void {
        const next = new Set(this.featureSelectedCodes());
        change.selected ? next.add(change.item.privilegeCode) : next.delete(change.item.privilegeCode);
        this.featureSelectedCodes.set(next);
    }

    protected moveCategory(row: NavNodeDto, direction: -1 | 1): void {
        const siblings = this.categories().filter(item => item.parentId === row.parentId)
            .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id);
        const index = siblings.findIndex(item => item.id === row.id);
        const target = siblings[index + direction];
        if (!target) return;
        const currentOrder = row.displayOrder;
        this.service.reorderCategories({ categories: [
                { id: row.id, displayOrder: target.displayOrder },
                { id: target.id, displayOrder: currentOrder }
            ] }).subscribe(() => this.reload());
    }

    protected saveEditor(value: Record<string, unknown>): void {
        const request: LayoutNavigationNodeRequestDto = {
            id: this.editingId,
            version: this.editingVersion,
            parentId: (value['parentId'] as number) ?? null,
            code: (value['code'] as string) || '',
            tCode: (value['tCode'] as string) || null,
            name: value['name'] as string,
            categoryKind: (value['categoryKind'] as string) || null,
            featureTypeCode: (value['featureTypeCode'] as string) || null,
            route: (value['route'] as string) || null,
            icon: (value['icon'] as string) || null,
            description: (value['description'] as string) || null,
            physicalModuleCode: (value['physicalModuleCode'] as string) || null,
            modulePrivCode: (value['modulePrivCode'] as string) || null,
            navigationEnabled: value['navigationEnabled'] == null ? null : !!value['navigationEnabled'],
            physicalSubmoduleCode: (value['physicalSubmoduleCode'] as string) || null,
            physicalFeatureTypeCode: (value['physicalFeatureTypeCode'] as string) || null,
            physicalFeatureCode: (value['physicalFeatureCode'] as string) || null,
            displayOrder: (value['displayOrder'] as number) ?? 100,
            active: !!value['active'],
            privilegeCodes: this.editingLevel === 'features' ? [...this.featureSelectedCodes()] : []
        };

        const save$ = (() => {
            switch (this.editingLevel) {
                case 'groups': return this.service.saveGroup(request);
                case 'modules': return this.service.saveModule(request);
                case 'categories': return this.service.saveCategory(request);
                case 'featureGroups': return this.service.saveFeatureGroup(request);
                case 'features': return this.service.saveFeature(request);
            }
        })();

        save$.subscribe(() => {
            this.editorOpen.set(false);
            this.reload();
        });
    }
}
