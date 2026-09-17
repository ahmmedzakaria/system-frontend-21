import { FieldConfig } from '@nexacore/shared';

// Mirrors backend DTOs 1:1 (com.nexacore.authmodule.core.dto.PrivilegeRequestDto/PrivilegeDto,
// com.nexacore.authmodule.core.dto.SubMenuRequestDto/SubMenuDto) — field names/casing match the
// JSON the backend actually sends/receives.

export interface PrivilegeDto {
    id: number;
    privilegeCode: string;
    moduleCode: string;
    moduleName: string;
    submoduleCode: string;
    submoduleName: string;
    featureTypeCode: string;
    featureTypeName: string;
    featureCode: string;
    featureName: string;
    actionCode: string;
    actionName: string;
    active: boolean;
}

export interface PrivilegeImpactDto { privilegeId:number; privilegeCode:string; version:string; activeDependencies:Record<string,number>; totalActiveDependencies:number; }
export interface PrivilegeDeactivateResultDto { deactivated:boolean; impact:PrivilegeImpactDto; }

export interface PrivilegeActionDefinitionDto {
    actionCode: string;
    actionName: string;
    privilegeCode: string;
}

export interface PrivilegeFeatureDefinitionDto {
    moduleCode: string;
    moduleName: string;
    submoduleCode: string;
    submoduleName: string;
    featureTypeCode: string;
    featureTypeName: string;
    featureCode: string;
    featureName: string;
    actions: PrivilegeActionDefinitionDto[];
}

export interface PrivilegeRequestDto {
    id:number|null;
    moduleCode: string;
    moduleName: string;
    submoduleCode: string;
    submoduleName: string;
    featureTypeCode: string;
    featureTypeName: string;
    featureCode: string;
    featureName: string;
    actionCode: string;
    actionName: string;
    active: boolean | null;
}

export const PRIVILEGE_PRIVILEGES = {
    view: '11010100101',
    manage: '11010100180',
    assign: '11010100181'
} as const;

type PrivilegeSelection = Partial<Record<'moduleCode' | 'submoduleCode' | 'featureTypeCode' | 'featureCode' | 'actionCode', unknown>>;

function options(rows: PrivilegeFeatureDefinitionDto[], code: keyof PrivilegeFeatureDefinitionDto, name: keyof PrivilegeFeatureDefinitionDto) {
    const unique = new Map<string, string>();
    rows.forEach(row => unique.set(String(row[code]), String(row[name])));
    return [...unique].map(([value, label]) => ({ label: `${label} (${value})`, value }));
}

export function privilegeFields(definitions: PrivilegeFeatureDefinitionDto[], selection: PrivilegeSelection): FieldConfig[] {
    const moduleCode = String(selection.moduleCode ?? '');
    const submoduleCode = String(selection.submoduleCode ?? '');
    const featureTypeCode = String(selection.featureTypeCode ?? '');
    const featureCode = String(selection.featureCode ?? '');
    const moduleRows = definitions.filter(row => row.moduleCode === moduleCode);
    const submoduleRows = moduleRows.filter(row => row.submoduleCode === submoduleCode);
    const featureTypeRows = submoduleRows.filter(row => row.featureTypeCode === featureTypeCode);
    const featureRows = featureTypeRows.filter(row => row.featureCode === featureCode);
    const actionOptions = featureRows.flatMap(row => row.actions ?? [])
        .filter((action, index, all) => all.findIndex(candidate => candidate.actionCode === action.actionCode) === index)
        .map(action => ({ label: `${action.actionName} (${action.actionCode})`, value: action.actionCode }));
    return [
        { type: 'dropdown', key: 'moduleCode', label: 'Module', placeholder: 'Select a module', required: true, options: options(definitions, 'moduleCode', 'moduleName') },
        { type: 'dropdown', key: 'submoduleCode', label: 'Submodule', placeholder: moduleCode ? 'Select a submodule' : 'Select a module first', required: true, options: options(moduleRows, 'submoduleCode', 'submoduleName') },
        { type: 'dropdown', key: 'featureTypeCode', label: 'Feature Type', placeholder: submoduleCode ? 'Select a feature type' : 'Select a submodule first', required: true, options: options(submoduleRows, 'featureTypeCode', 'featureTypeName') },
        { type: 'dropdown', key: 'featureCode', label: 'Feature', placeholder: featureTypeCode ? 'Select a feature' : 'Select a feature type first', required: true, options: options(featureTypeRows, 'featureCode', 'featureName') },
        { type: 'dropdown', key: 'actionCode', label: 'Action', placeholder: featureCode ? 'Select an action' : 'Select a feature first', required: true, options: actionOptions },
        // Deactivation is intentionally excluded from ordinary save; it requires an impact review.
    ];
}

export function privilegeInitialValue(row: PrivilegeDto | null): Record<string, unknown> {
    if (!row) {
        return { active: true };
    }
    return {
        moduleCode: row.moduleCode,
        submoduleCode: row.submoduleCode,
        featureTypeCode: row.featureTypeCode,
        featureCode: row.featureCode,
        actionCode: row.actionCode,
        active: row.active
    };
}
