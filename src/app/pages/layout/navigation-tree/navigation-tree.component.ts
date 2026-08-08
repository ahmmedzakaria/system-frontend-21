import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { of } from 'rxjs';
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
import {
    LayoutNavigationNodeRequestDto,
    NavNodeDto,
    categoryFields,
    featureFields,
    featureGroupFields,
    moduleFields,
    moduleGroupFields,
    navNodeInitialValue,
    splitPrivilegeCodes
} from '../layout.model';

type Level = 'groups' | 'modules' | 'categories' | 'featureGroups' | 'features';

@Component({
    selector: 'app-navigation-tree',
    standalone: true,
    imports: [ButtonComponent, DynamicFormComponent, DynamicListComponent, ModalComponent],
    templateUrl: './navigation-tree.component.html',
    styleUrl: './navigation-tree.component.scss'
})
export class NavigationTreeComponent {
    private readonly service = inject(LayoutService);

    protected readonly activeLevel = signal<Level>('groups');

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

    protected readonly groupFields = moduleGroupFields();
    protected readonly moduleFieldsComputed = computed(() => moduleFields(this.groupOptions()));
    protected readonly categoryFieldsComputed = computed(() => categoryFields(this.moduleOptions()));
    protected readonly featureGroupFieldsComputed = computed(() => featureGroupFields(this.categoryOptions()));
    protected readonly featureFieldsComputed = computed(() => featureFields(this.featureGroupOptions()));

    private readonly groupList = viewChild<DynamicListComponent<NavNodeDto>>('groupList');
    private readonly moduleList = viewChild<DynamicListComponent<NavNodeDto>>('moduleList');
    private readonly categoryList = viewChild<DynamicListComponent<NavNodeDto>>('categoryList');
    private readonly featureGroupList = viewChild<DynamicListComponent<NavNodeDto>>('featureGroupList');
    private readonly featureList = viewChild<DynamicListComponent<NavNodeDto>>('featureList');

    protected readonly editorOpen = signal(false);
    protected readonly editorInitialValue = signal<Record<string, unknown>>({});
    private editingLevel: Level = 'groups';
    private editingId: number | null = null;

    constructor() {
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
            actions: [{ icon: 'edit', label: 'Edit', onClick: (row) => this.openEditor(level, row) }]
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
        this.editorInitialValue.set(navNodeInitialValue(row));
        this.editorOpen.set(true);
    }

    protected closeEditor(): void {
        this.editorOpen.set(false);
    }

    protected saveEditor(value: Record<string, unknown>): void {
        const request: LayoutNavigationNodeRequestDto = {
            id: this.editingId,
            parentId: (value['parentId'] as number) ?? null,
            code: (value['code'] as string) || '',
            tCode: (value['tCode'] as string) || null,
            name: value['name'] as string,
            categoryKind: (value['categoryKind'] as string) || null,
            route: (value['route'] as string) || null,
            icon: (value['icon'] as string) || null,
            description: (value['description'] as string) || null,
            physicalModuleCode: (value['physicalModuleCode'] as string) || null,
            physicalSubmoduleCode: (value['physicalSubmoduleCode'] as string) || null,
            physicalFeatureTypeCode: (value['physicalFeatureTypeCode'] as string) || null,
            physicalFeatureCode: (value['physicalFeatureCode'] as string) || null,
            displayOrder: (value['displayOrder'] as number) ?? 100,
            active: !!value['active'],
            privilegeCodes: splitPrivilegeCodes((value['privilegeCodesText'] as string) || '')
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
