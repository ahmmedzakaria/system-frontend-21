import { FieldConfig, DropdownOption } from '@nexacore/shared';

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
    subMenuId: number | null;
    subMenuName: string | null;
    subMenuUrl: string | null;
    active: boolean;
}

export interface PrivilegeRequestDto {
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
    subMenuId: number | null;
    active: boolean | null;
}

export interface SubMenuDto {
    id: number;
    name: string;
    url: string;
    icon: string;
    moduleCode: string;
    moduleName: string;
    submoduleCode: string;
    submoduleName: string;
    featureTypeCode: string;
    featureTypeName: string;
    featureCode: string;
    featureName: string;
    active: boolean;
    menuOrder: number;
    subMenuOrder: number;
}

export interface SubMenuRequestDto {
    id: number | null;
    name: string;
    url: string;
    icon: string;
    moduleCode: string;
    moduleName: string;
    submoduleCode: string;
    submoduleName: string;
    featureTypeCode: string;
    featureTypeName: string;
    featureCode: string;
    featureName: string;
    active: boolean | null;
    menuOrder: number | null;
    subMenuOrder: number | null;
}

export function privilegeFields(subMenuOptions: DropdownOption<unknown>[]): FieldConfig[] {
    return [
        { type: 'text', key: 'moduleCode', label: 'Module Code', required: true },
        { type: 'text', key: 'moduleName', label: 'Module Name', required: true },
        { type: 'text', key: 'submoduleCode', label: 'Submodule Code', required: true },
        { type: 'text', key: 'submoduleName', label: 'Submodule Name', required: true },
        { type: 'text', key: 'featureTypeCode', label: 'Feature Type Code', required: true },
        { type: 'text', key: 'featureTypeName', label: 'Feature Type Name', required: true },
        { type: 'text', key: 'featureCode', label: 'Feature Code', required: true },
        { type: 'text', key: 'featureName', label: 'Feature Name', required: true },
        { type: 'text', key: 'actionCode', label: 'Action Code', required: true },
        { type: 'text', key: 'actionName', label: 'Action Name', required: true },
        { type: 'dropdown', key: 'subMenuId', label: 'Sub Menu', options: subMenuOptions, colSpan: 2 },
        { type: 'checkbox', key: 'active', label: 'Active' }
    ];
}

export function privilegeInitialValue(row: PrivilegeDto | null): Record<string, unknown> {
    if (!row) {
        return { active: true, subMenuId: null };
    }
    return {
        moduleCode: row.moduleCode,
        moduleName: row.moduleName,
        submoduleCode: row.submoduleCode,
        submoduleName: row.submoduleName,
        featureTypeCode: row.featureTypeCode,
        featureTypeName: row.featureTypeName,
        featureCode: row.featureCode,
        featureName: row.featureName,
        actionCode: row.actionCode,
        actionName: row.actionName,
        subMenuId: row.subMenuId,
        active: row.active
    };
}

export const SUB_MENU_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'name', label: 'Name', required: true },
    { type: 'text', key: 'url', label: 'URL', required: true },
    { type: 'text', key: 'icon', label: 'Icon', required: true },
    { type: 'text', key: 'moduleCode', label: 'Module Code', required: true },
    { type: 'text', key: 'moduleName', label: 'Module Name', required: true },
    { type: 'text', key: 'submoduleCode', label: 'Submodule Code', required: true },
    { type: 'text', key: 'submoduleName', label: 'Submodule Name', required: true },
    { type: 'text', key: 'featureTypeCode', label: 'Feature Type Code', required: true },
    { type: 'text', key: 'featureTypeName', label: 'Feature Type Name', required: true },
    { type: 'text', key: 'featureCode', label: 'Feature Code', required: true },
    { type: 'text', key: 'featureName', label: 'Feature Name', required: true },
    { type: 'number', key: 'menuOrder', label: 'Menu Order' },
    { type: 'number', key: 'subMenuOrder', label: 'Sub Menu Order' },
    { type: 'checkbox', key: 'active', label: 'Active' }
];

export function subMenuInitialValue(row: SubMenuDto | null): Record<string, unknown> {
    if (!row) {
        return { active: true, menuOrder: 0, subMenuOrder: 0 };
    }
    return {
        name: row.name,
        url: row.url,
        icon: row.icon,
        moduleCode: row.moduleCode,
        moduleName: row.moduleName,
        submoduleCode: row.submoduleCode,
        submoduleName: row.submoduleName,
        featureTypeCode: row.featureTypeCode,
        featureTypeName: row.featureTypeName,
        featureCode: row.featureCode,
        featureName: row.featureName,
        menuOrder: row.menuOrder,
        subMenuOrder: row.subMenuOrder,
        active: row.active
    };
}
