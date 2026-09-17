import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { tap } from 'rxjs/operators';
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
    PrivilegeFeatureDefinitionDto,
    PrivilegeRequestDto,
    privilegeFields,
    privilegeInitialValue, PrivilegeImpactDto
} from './privileges.model';
import { PageOperationService } from '../../../core/authorization/page-operation.service';

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
    protected readonly definitions=signal<PrivilegeFeatureDefinitionDto[]>([]);

    protected readonly catalogEditorOpen = signal(false);
    protected readonly catalogEditorInitialValue = signal<Record<string, unknown>>({});
    protected readonly privilegeFields = computed(() => privilegeFields(this.definitions(), this.catalogEditorInitialValue()));
    private editingPrivilegeId: number | null = null;

    private readonly catalogList = viewChild<DynamicListComponent<PrivilegeDto>>('catalogList');

    constructor() {
        this.service.definitions().subscribe({
            next: definitions => this.definitions.set(definitions),
            error: error => this.fail(error, 'Privilege dropdown options could not be loaded.')
        });
    }

    protected readonly loadCatalog: DynamicListLoader<PrivilegeDto> = params =>
        this.service.search(params.query,params.page-1,params.pageSize).pipe(tap(result=>this.catalogRows.set(result.items)));

    protected readonly catalogColumns=computed<ListColumnConfig<PrivilegeDto>[]>(() => [
        { key: 'privilegeCode', header: 'Privilege Code' },
        { key: 'moduleName', header: 'Module' },
        { key: 'submoduleName', header: 'Submodule' },
        { key: 'featureName', header: 'Feature' },
        { key: 'actionName', header: 'Action' },
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

    protected catalogEditorChanged(value: Record<string, unknown>): void {
        const previous = this.catalogEditorInitialValue();
        const next = { ...value };
        const hierarchy = ['moduleCode', 'submoduleCode', 'featureTypeCode', 'featureCode'] as const;
        const changedAt = hierarchy.findIndex(key => previous[key] !== next[key]);
        if (changedAt >= 0) {
            hierarchy.slice(changedAt + 1).forEach(key => next[key] = null);
            next['actionCode'] = null;
        }
        this.catalogEditorInitialValue.set(next);
        this.codePreview.set(['moduleCode', 'submoduleCode', 'featureTypeCode', 'featureCode', 'actionCode']
            .map(key => String(next[key] ?? '')).join(''));
    }

    protected saveCatalogEditor(value: Record<string, unknown>): void {
        if(!this.canManage() || !this.mutation.begin())return;
        const code=`${value['moduleCode']??''}${value['submoduleCode']??''}${value['featureTypeCode']??''}${value['featureCode']??''}${value['actionCode']??''}`;
        this.codePreview.set(code);
        if(!/^\d{11}$/.test(code)){this.mutation.fail('Privilege code must contain 2+2+2+3+2 digits.');this.error.set(this.mutation.error());return;}
        if(this.catalogRows().some(row=>row.privilegeCode===code && row.id!==this.editingPrivilegeId)){
            this.mutation.fail('Privilege code collides with an existing catalog entry.');this.error.set(this.mutation.error());return;}
        const definition=this.definitions().find(item=>item.moduleCode===value['moduleCode'] && item.submoduleCode===value['submoduleCode']
            && item.featureTypeCode===value['featureTypeCode'] && item.featureCode===value['featureCode']);
        const action=definition?.actions.find(item=>item.actionCode===value['actionCode']);
        if(!definition || !action){this.mutation.fail('Select a valid module, submodule, feature type, feature, and action.');this.error.set(this.mutation.error());return;}
        const request: PrivilegeRequestDto = {
            id:this.editingPrivilegeId,
            moduleCode: value['moduleCode'] as string,
            moduleName: definition.moduleName,
            submoduleCode: value['submoduleCode'] as string,
            submoduleName: definition.submoduleName,
            featureTypeCode: value['featureTypeCode'] as string,
            featureTypeName: definition.featureTypeName,
            featureCode: value['featureCode'] as string,
            featureName: definition.featureName,
            actionCode: value['actionCode'] as string,
            actionName: action.actionName,
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

}
