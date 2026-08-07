import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import {
    ButtonComponent,
    DynamicFormComponent,
    DynamicListComponent,
    DynamicListLoader,
    ListColumnConfig,
    ModalComponent
} from '@nexacore/shared';
import { PrivilegeService } from '../../../core/services/privilege.service';
import {
    PrivilegeDto,
    PrivilegeRequestDto,
    SUB_MENU_FIELDS,
    SubMenuDto,
    SubMenuRequestDto,
    privilegeFields,
    privilegeInitialValue,
    subMenuInitialValue
} from './privileges.model';

type Tab = 'catalog' | 'subMenus';

@Component({
    selector: 'app-privileges-list',
    standalone: true,
    imports: [ButtonComponent, DynamicFormComponent, DynamicListComponent, ModalComponent],
    templateUrl: './privileges-list.component.html',
    styleUrl: './privileges-list.component.scss'
})
export class PrivilegesListComponent {
    private readonly service = inject(PrivilegeService);

    protected readonly activeTab = signal<Tab>('catalog');

    protected readonly subMenus = signal<SubMenuDto[]>([]);
    protected readonly subMenuOptions = computed(() => [
        { label: 'None', value: null },
        ...this.subMenus().map((subMenu) => ({ label: subMenu.name, value: subMenu.id }))
    ]);
    protected readonly privilegeFields = computed(() => privilegeFields(this.subMenuOptions()));

    protected readonly catalogEditorOpen = signal(false);
    protected readonly catalogEditorInitialValue = signal<Record<string, unknown>>({});
    private editingPrivilegeId: number | null = null;

    protected readonly subMenuEditorOpen = signal(false);
    protected readonly subMenuFields = SUB_MENU_FIELDS;
    protected readonly subMenuEditorInitialValue = signal<Record<string, unknown>>({});
    private editingSubMenuId: number | null = null;

    private readonly catalogList = viewChild<DynamicListComponent<PrivilegeDto>>('catalogList');
    private readonly subMenuList = viewChild<DynamicListComponent<SubMenuDto>>('subMenuList');

    constructor() {
        this.reloadSubMenus();
    }

    protected readonly loadCatalog: DynamicListLoader<PrivilegeDto> = (params) =>
        this.service.list().pipe(
            map((rows) => {
                const query = params.query.trim().toLowerCase();
                const filtered = query
                    ? rows.filter((row) =>
                          row.privilegeCode.toLowerCase().includes(query) ||
                          row.moduleName.toLowerCase().includes(query) ||
                          row.featureName.toLowerCase().includes(query)
                      )
                    : rows;
                const start = (params.page - 1) * params.pageSize;
                return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
            })
        );

    protected readonly loadSubMenus: DynamicListLoader<SubMenuDto> = (params) =>
        this.service.subMenuList().pipe(
            map((rows) => {
                const query = params.query.trim().toLowerCase();
                const filtered = query
                    ? rows.filter((row) => row.name.toLowerCase().includes(query) || row.url.toLowerCase().includes(query))
                    : rows;
                const start = (params.page - 1) * params.pageSize;
                return { items: filtered.slice(start, start + params.pageSize), total: filtered.length };
            })
        );

    protected readonly catalogColumns: ListColumnConfig<PrivilegeDto>[] = [
        { key: 'privilegeCode', header: 'Privilege Code' },
        { key: 'moduleName', header: 'Module' },
        { key: 'submoduleName', header: 'Submodule' },
        { key: 'featureName', header: 'Feature' },
        { key: 'actionName', header: 'Action' },
        { key: 'subMenuName', header: 'Sub Menu', format: (row) => row.subMenuName ?? '—' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions',
            header: '',
            align: 'end',
            type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', onClick: (row) => this.openCatalogEditor(row) }]
        }
    ];

    protected readonly subMenuColumns: ListColumnConfig<SubMenuDto>[] = [
        { key: 'name', header: 'Name' },
        { key: 'url', header: 'URL' },
        { key: 'menuOrder', header: 'Menu Order' },
        { key: 'subMenuOrder', header: 'Sub Menu Order' },
        { key: 'active', header: 'Status', type: 'badge', status: (row) => (row.active ? 'verified' : 'draft') },
        {
            key: 'actions',
            header: '',
            align: 'end',
            type: 'actions',
            actions: [{ icon: 'edit', label: 'Edit', onClick: (row) => this.openSubMenuEditor(row) }]
        }
    ];

    protected setTab(tab: Tab): void {
        this.activeTab.set(tab);
    }

    private reloadSubMenus(): void {
        this.service.subMenuList().subscribe((rows) => this.subMenus.set(rows));
    }

    protected openCatalogEditor(row: PrivilegeDto | null): void {
        this.editingPrivilegeId = row?.id ?? null;
        this.catalogEditorInitialValue.set(privilegeInitialValue(row));
        this.catalogEditorOpen.set(true);
    }

    protected closeCatalogEditor(): void {
        this.catalogEditorOpen.set(false);
    }

    protected saveCatalogEditor(value: Record<string, unknown>): void {
        const request: PrivilegeRequestDto = {
            moduleCode: value['moduleCode'] as string,
            moduleName: value['moduleName'] as string,
            submoduleCode: value['submoduleCode'] as string,
            submoduleName: value['submoduleName'] as string,
            featureTypeCode: value['featureTypeCode'] as string,
            featureTypeName: value['featureTypeName'] as string,
            featureCode: value['featureCode'] as string,
            featureName: value['featureName'] as string,
            actionCode: value['actionCode'] as string,
            actionName: value['actionName'] as string,
            subMenuId: (value['subMenuId'] as number | null) ?? null,
            active: !!value['active']
        };
        this.service.save(request).subscribe(() => {
            this.catalogEditorOpen.set(false);
            this.editingPrivilegeId = null;
            this.catalogList()?.reload();
        });
    }

    protected openSubMenuEditor(row: SubMenuDto | null): void {
        this.editingSubMenuId = row?.id ?? null;
        this.subMenuEditorInitialValue.set(subMenuInitialValue(row));
        this.subMenuEditorOpen.set(true);
    }

    protected closeSubMenuEditor(): void {
        this.subMenuEditorOpen.set(false);
    }

    protected saveSubMenuEditor(value: Record<string, unknown>): void {
        const request: SubMenuRequestDto = {
            id: this.editingSubMenuId,
            name: value['name'] as string,
            url: value['url'] as string,
            icon: value['icon'] as string,
            moduleCode: value['moduleCode'] as string,
            moduleName: value['moduleName'] as string,
            submoduleCode: value['submoduleCode'] as string,
            submoduleName: value['submoduleName'] as string,
            featureTypeCode: value['featureTypeCode'] as string,
            featureTypeName: value['featureTypeName'] as string,
            featureCode: value['featureCode'] as string,
            featureName: value['featureName'] as string,
            active: !!value['active'],
            menuOrder: (value['menuOrder'] as number) ?? 0,
            subMenuOrder: (value['subMenuOrder'] as number) ?? 0
        };
        this.service.subMenuSave(request).subscribe(() => {
            this.subMenuEditorOpen.set(false);
            this.editingSubMenuId = null;
            this.subMenuList()?.reload();
            this.reloadSubMenus();
        });
    }
}
