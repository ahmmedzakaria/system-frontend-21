import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { map, tap } from 'rxjs/operators';
import {
    ButtonComponent,
    DynamicFormComponent,
    DynamicListComponent,
    DynamicListLoader,
    ListColumnConfig,
    ModalComponent
    ,ConfirmDialogComponent,MutationState
} from '@nexacore/shared';
import { PrivilegeService } from '../../../core/services/privilege.service';
import { AuthorizedUiDirective,AuthorizationPolicyService } from '@nexacore/platform';
import {
    PrivilegeDto,
    PrivilegeRequestDto,
    SUB_MENU_FIELDS,
    SubMenuDto,
    SubMenuRequestDto,
    privilegeFields,
    privilegeInitialValue, PrivilegeImpactDto,
    subMenuInitialValue
} from './privileges.model';
import { PageOperationService } from '../../../core/authorization/page-operation.service';

type Tab = 'catalog' | 'subMenus';

@Component({
    selector: 'app-privileges-list',
    standalone: true,
    imports: [ButtonComponent, DynamicFormComponent, DynamicListComponent, ModalComponent, AuthorizedUiDirective,ConfirmDialogComponent],
    templateUrl: './privileges-list.component.html',
    styleUrl: './privileges-list.component.scss'
})
export class PrivilegesListComponent {
    private readonly service = inject(PrivilegeService);
    private readonly policy=inject(AuthorizationPolicyService);
    private readonly operations=inject(PageOperationService);
    protected readonly canManage=this.policy.privilegeAllowed('11010100180');
    protected readonly mutation=new MutationState();
    protected readonly error=signal<string|null>(null);
    protected readonly catalogRows=signal<PrivilegeDto[]>([]);
    protected readonly impact=signal<PrivilegeImpactDto|null>(null);
    protected readonly impactOpen=signal(false);
    protected readonly deactivateConfirmOpen=signal(false);
    protected readonly dependencyEntries=computed(()=>Object.entries(this.impact()?.activeDependencies??{}));
    protected readonly codePreview=signal('');

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

    protected readonly loadCatalog: DynamicListLoader<PrivilegeDto> = params =>
        this.service.search(params.query,params.page-1,params.pageSize).pipe(tap(result=>this.catalogRows.set(result.items)));

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

    protected readonly catalogColumns=computed<ListColumnConfig<PrivilegeDto>[]>(() => [
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
            actions: [
                {icon:'eye',label:'Dependency impact',onClick:(row:PrivilegeDto)=>this.openImpact(row)},
                ...(this.canManage() ? [{ icon: 'edit', label: 'Edit', onClick: (row:PrivilegeDto) => this.openCatalogEditor(row) },
                    {icon:'ban',label:'Deactivate safely',danger:true,onClick:(row:PrivilegeDto)=>this.openDeactivate(row)}] : [])
            ]
        }
    ]);

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
            actions: [{ icon: 'edit', label: 'Edit', permissionKey: 'privileges.assign', onClick: (row) => this.openSubMenuEditor(row) }]
        }
    ];

    protected setTab(tab: Tab): void {
        this.activeTab.set(tab);
    }

    private reloadSubMenus(): void {
        this.service.subMenuList().subscribe((rows) => this.subMenus.set(rows));
    }

    protected openCatalogEditor(row: PrivilegeDto | null): void {
        if(!this.canManage())return;
        this.editingPrivilegeId = row?.id ?? null;
        this.catalogEditorInitialValue.set(privilegeInitialValue(row));
        this.catalogEditorOpen.set(true);
        this.codePreview.set(row?.privilegeCode??''); this.error.set(null);
    }

    protected closeCatalogEditor(): void {
        this.catalogEditorOpen.set(false);
    }

    protected saveCatalogEditor(value: Record<string, unknown>): void {
        if(!this.canManage() || !this.mutation.begin())return;
        const code=`${value['moduleCode']??''}${value['submoduleCode']??''}${value['featureTypeCode']??''}${value['featureCode']??''}${value['actionCode']??''}`;
        this.codePreview.set(code);
        if(!/^\d{11}$/.test(code)){this.mutation.fail('Privilege code must contain 2+2+2+3+2 digits.');this.error.set(this.mutation.error());return;}
        if(this.catalogRows().some(row=>row.privilegeCode===code && row.id!==this.editingPrivilegeId)){
            this.mutation.fail('Privilege code collides with an existing catalog entry.');this.error.set(this.mutation.error());return;}
        const request: PrivilegeRequestDto = {
            id:this.editingPrivilegeId,
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
            active: true
        };
        this.service.save(request).subscribe({next:() => {this.mutation.succeed();
            this.catalogEditorOpen.set(false);
            this.editingPrivilegeId = null;
            this.catalogList()?.reload();
        },error:error=>this.fail(error,'Privilege save was rejected.')});
    }

    protected openImpact(row:PrivilegeDto):void {this.service.impact(row.privilegeCode).subscribe({next:value=>{this.impact.set(value);this.impactOpen.set(true);},error:error=>this.fail(error,'Privilege impact could not be loaded.')});}
    protected openDeactivate(row:PrivilegeDto):void {if(!this.canManage())return;this.service.impact(row.privilegeCode).subscribe({next:value=>{this.impact.set(value);this.deactivateConfirmOpen.set(true);},error:error=>this.fail(error,'Privilege impact could not be loaded.')});}
    protected confirmDeactivate():void {const impact=this.impact();if(!impact||!this.mutation.begin())return;this.service.deactivate(impact.privilegeCode,impact.version).subscribe({next:result=>{
        this.mutation.succeed();this.deactivateConfirmOpen.set(false);this.impact.set(result.impact);this.catalogList()?.reload();},error:error=>this.fail(error,'Privilege deactivation was rejected.')});}
    protected cancelDeactivate():void {this.deactivateConfirmOpen.set(false);this.impact.set(null);}
    private fail(error:unknown,fallback:string):void {const failure=this.operations.failure(error,fallback);if(this.mutation.pending())this.mutation.failStructured(failure.message,failure.code,failure.traceId);this.error.set(this.operations.display(failure));}

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
