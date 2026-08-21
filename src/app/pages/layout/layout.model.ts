import { FieldConfig, DropdownOption } from '@nexacore/shared';

// Mirrors backend DTOs 1:1 (com.nexacore.systemmodule.layout.dto.*).

export type LayoutType = 'SIDEBAR' | 'HORIZONTAL' | 'RAIL' | 'COMPACT' | 'PUBLIC';
export type NavigationMode = 'MODULE_LIST' | 'MODULE_GROUP_MEGA_PANEL';
export type ThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';
export type LayoutDensity = 'COMFORTABLE' | 'COMPACT' | 'DENSE';
export type AssignmentScope = 'CLIENT' | 'ROLE' | 'PRIVILEGE' | 'DEVICE' | 'MODULE';
export type DeviceTarget = 'ANY' | 'DESKTOP' | 'TABLET' | 'MOBILE';
export type PrivilegeMatchMode = 'ANY' | 'ALL';

export interface LayoutBrandDto {
    displayName: string | null;
    shortName: string | null;
    logoUrl: string | null;
    logoDarkUrl: string | null;
    faviconUrl: string | null;
    supportUrl: string | null;
}

export type FontSource = 'SYSTEM' | 'ASSET' | 'GOOGLE' | 'URL';

export interface LayoutThemeColorPrimaries {
    text: string;
    paper: string;
    card: string;
    accent: string;
    amber: string;
    red: string;
    success: string;
    info: string;
}

export interface LayoutThemeChromeOverrides {
    accentSoft: string | null;
    bg: string | null;
    border: string | null;
    borderStrong: string | null;
    hoverBg: string | null;
    activeBg: string | null;
    searchBg: string | null;
    searchBorder: string | null;
    searchText: string | null;
    searchPlaceholder: string | null;
}

export interface LayoutThemeConfig {
    id: string;
    label: string;
    base: string;
    swatch: string;
    primaries: LayoutThemeColorPrimaries;
    chromeOverrides: LayoutThemeChromeOverrides | null;
}

export interface LayoutSizeConfig {
    spaceUnit: number;
    radiusBase: number;
    fontSizeBase: number;
    headerHeight: number;
    statusBarHeight: number;
    railWidthCollapsed: number;
    railWidthExpanded: number;
}

export interface LayoutFontConfig {
    bodyFamily: string;
    headingFamily: string | null;
    monoFamily: string | null;
    fontSource: FontSource;
    fontUrl: string | null;
    fallbackStack: string;
}

export interface LayoutProfileDto {
    id: number;
    code: string;
    name: string;
    description: string | null;
    layoutType: LayoutType;
    navigationMode: NavigationMode;
    themeMode: ThemeMode;
    density: LayoutDensity;
    topbarEnabled: boolean;
    sidebarEnabled: boolean;
    sidebarCollapsed: boolean;
    footerEnabled: boolean;
    breadcrumbEnabled: boolean;
    commandBarEnabled: boolean;
    rtlEnabled: boolean;
    active: boolean;
    brand: LayoutBrandDto | null;
    themes: LayoutThemeConfig[];
    sizes: LayoutSizeConfig | null;
    fonts: LayoutFontConfig | null;
}

export interface LayoutProfileRequestDto {
    id: number | null;
    profileCode: string;
    profileName: string;
    description: string | null;
    layoutType: LayoutType;
    navigationMode: NavigationMode;
    themeMode: ThemeMode;
    density: LayoutDensity;
    topbarEnabled: boolean;
    sidebarEnabled: boolean;
    sidebarCollapsed: boolean;
    footerEnabled: boolean;
    breadcrumbEnabled: boolean;
    commandBarEnabled: boolean;
    rtlEnabled: boolean;
    active: boolean;
    themes: LayoutThemeConfig[];
    sizes: LayoutSizeConfig;
    fonts: LayoutFontConfig;
}

export interface UiPrivilegePolicyDto {
    id: number;
    version: number;
    clientApplicationId: number | null;
    clientCode: string | null;
    actionCode: string;
    matchMode: string;
    active: boolean;
    privilegeCodes: string[];
}

export interface LayoutUiPolicyRequestDto {
    version: number | null;
    clientCode: string | null;
    actionCode: string;
    matchMode: PrivilegeMatchMode;
    active: boolean;
    privilegeCodes: string[];
}

/** No `id`/`version`/`active` — the backend's LayoutRoutePolicyService.synchronizePolicy()
 * always upserts-to-active by (clientCode, routeUrl), no separate deactivate path. */
export interface RoutePrivilegePolicyDto {
    routeUrl: string;
    matchMode: string;
    privilegeCodes: string[];
}

export interface LayoutRoutePolicyRequestDto {
    clientCode: string | null;
    routeUrl: string;
    matchMode: PrivilegeMatchMode;
    privilegeCodes: string[];
}

export interface ClientLayoutAssignmentDto {
    id: number;
    clientApplicationId: number | null;
    clientCode: string | null;
    layoutProfileId: number | null;
    profileCode: string | null;
    assignmentScope: AssignmentScope;
    roleCode: string | null;
    privilegeCode: string | null;
    deviceTarget: DeviceTarget;
    moduleCode: string | null;
    defaultProfile: boolean;
    selectable: boolean;
    displayOrder: number;
    active: boolean;
}

export interface ClientLayoutAssignmentRequestDto {
    id: number | null;
    tenantId: number | null;
    clientApplicationId: number | null;
    clientCode: string | null;
    layoutProfileId: number | null;
    profileCode: string | null;
    assignmentScope: AssignmentScope;
    roleCode: string | null;
    privilegeCode: string | null;
    deviceTarget: DeviceTarget;
    moduleCode: string | null;
    defaultProfile: boolean;
    selectable: boolean;
    displayOrder: number;
    active: boolean;
}

// Nav-tree node — widened backend response (id/parentId/active/displayOrder added
// this session specifically so the frontend can resolve parent ids for cascading
// creates and correctly pre-fill edit forms; see V28 migration + LayoutNavigationServiceImpl).
export interface NavNodeDto {
    id: number;
    version: number | null;
    parentId: number | null;
    code: string;
    tCode: string | null;
    label: string;
    type: 'group' | 'module' | 'category' | 'featureGroup' | 'feature';
    icon: string | null;
    description: string | null;
    route: string | null;
    active: boolean;
    displayOrder: number;
    privilegeCodes: string[];
    children: NavNodeDto[];
}

export interface LayoutNavigationNodeRequestDto {
    id: number | null;
    version: number | null;
    parentId: number | null;
    code: string;
    tCode: string | null;
    name: string;
    categoryKind: string | null;
    route: string | null;
    icon: string | null;
    description: string | null;
    physicalModuleCode: string | null;
    physicalSubmoduleCode: string | null;
    physicalFeatureTypeCode: string | null;
    physicalFeatureCode: string | null;
    displayOrder: number | null;
    active: boolean | null;
    privilegeCodes: string[];
}

export interface LayoutNavigationCategoryOrderRequestDto {
    categories: Array<{ id: number; displayOrder: number }>;
}

export interface LayoutNavigationIntegrityDto {
    valid: boolean;
    invalidParents: string[];
    duplicateCodes: string[];
    duplicateRoutes: string[];
    unknownRoutes: string[];
    invalidPrivilegeReferences: string[];
}

// ---- Field configs ----

const LAYOUT_TYPE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Sidebar', value: 'SIDEBAR' },
    { label: 'Horizontal', value: 'HORIZONTAL' },
    { label: 'Rail', value: 'RAIL' },
    { label: 'Compact', value: 'COMPACT' },
    { label: 'Public', value: 'PUBLIC' }
];
const NAVIGATION_MODE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Module List', value: 'MODULE_LIST' },
    { label: 'Module Group Mega Panel', value: 'MODULE_GROUP_MEGA_PANEL' }
];
const THEME_MODE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Light', value: 'LIGHT' },
    { label: 'Dark', value: 'DARK' },
    { label: 'System', value: 'SYSTEM' }
];
const DENSITY_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Comfortable', value: 'COMFORTABLE' },
    { label: 'Compact', value: 'COMPACT' },
    { label: 'Dense', value: 'DENSE' }
];
const ASSIGNMENT_SCOPE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Client', value: 'CLIENT' },
    { label: 'Role', value: 'ROLE' },
    { label: 'Privilege', value: 'PRIVILEGE' },
    { label: 'Device', value: 'DEVICE' },
    { label: 'Module', value: 'MODULE' }
];
const DEVICE_TARGET_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Any', value: 'ANY' },
    { label: 'Desktop', value: 'DESKTOP' },
    { label: 'Tablet', value: 'TABLET' },
    { label: 'Mobile', value: 'MOBILE' }
];
export const MATCH_MODE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'Any', value: 'ANY' },
    { label: 'All', value: 'ALL' }
];
const FONT_SOURCE_OPTIONS: DropdownOption<unknown>[] = [
    { label: 'System', value: 'SYSTEM' },
    { label: 'Asset (bundled)', value: 'ASSET' },
    { label: 'Google Fonts', value: 'GOOGLE' },
    { label: 'URL', value: 'URL' }
];
export const PROFILE_FIELDS: FieldConfig[] = [
    { type: 'text', key: 'profileCode', label: 'Code', required: true },
    { type: 'text', key: 'profileName', label: 'Name', required: true },
    { type: 'textarea', key: 'description', label: 'Description', colSpan: 2 },
    { type: 'dropdown', key: 'layoutType', label: 'Layout Type', options: LAYOUT_TYPE_OPTIONS },
    { type: 'dropdown', key: 'navigationMode', label: 'Navigation Mode', options: NAVIGATION_MODE_OPTIONS },
    { type: 'dropdown', key: 'themeMode', label: 'Theme Mode', options: THEME_MODE_OPTIONS },
    { type: 'dropdown', key: 'density', label: 'Density', options: DENSITY_OPTIONS },
    { type: 'checkbox', key: 'topbarEnabled', label: 'Topbar Enabled' },
    { type: 'checkbox', key: 'sidebarEnabled', label: 'Sidebar Enabled' },
    { type: 'checkbox', key: 'sidebarCollapsed', label: 'Sidebar Collapsed' },
    { type: 'checkbox', key: 'footerEnabled', label: 'Footer Enabled' },
    { type: 'checkbox', key: 'breadcrumbEnabled', label: 'Breadcrumb Enabled' },
    { type: 'checkbox', key: 'commandBarEnabled', label: 'Command Bar Enabled' },
    { type: 'checkbox', key: 'rtlEnabled', label: 'RTL Enabled' },
    { type: 'checkbox', key: 'active', label: 'Active' },
    { type: 'number', key: 'sizeSpaceUnit', label: 'Size: Space Unit (px)' },
    { type: 'number', key: 'sizeRadiusBase', label: 'Size: Radius Base (px)' },
    { type: 'number', key: 'sizeFontSizeBase', label: 'Size: Font Size Base (px)' },
    { type: 'number', key: 'sizeHeaderHeight', label: 'Size: Header Height (px)' },
    { type: 'number', key: 'sizeStatusBarHeight', label: 'Size: Status Bar Height (px)' },
    { type: 'number', key: 'sizeRailWidthCollapsed', label: 'Size: Rail Width Collapsed (px)' },
    { type: 'number', key: 'sizeRailWidthExpanded', label: 'Size: Rail Width Expanded (px)' },
    { type: 'text', key: 'fontBodyFamily', label: 'Font: Body Family' },
    { type: 'text', key: 'fontHeadingFamily', label: 'Font: Heading Family' },
    { type: 'text', key: 'fontMonoFamily', label: 'Font: Mono Family' },
    { type: 'dropdown', key: 'fontSource', label: 'Font: Source', options: FONT_SOURCE_OPTIONS },
    { type: 'text', key: 'fontUrl', label: 'Font: URL (source = URL/GOOGLE)' },
    { type: 'text', key: 'fontFallbackStack', label: 'Font: Fallback Stack', colSpan: 2 }
];

/** Seed values mirroring LayoutContextServiceImpl.defaultSizes()/defaultFonts()/defaultTheme()
 * on the backend — used to pre-fill a brand-new profile with sensible, working defaults. */
export function defaultSizeConfig(): LayoutSizeConfig {
    return { spaceUnit: 2, radiusBase: 8, fontSizeBase: 13.5, headerHeight: 58, statusBarHeight: 28, railWidthCollapsed: 64, railWidthExpanded: 230 };
}
export function defaultFontConfig(): LayoutFontConfig {
    return {
        bodyFamily: 'Inter', headingFamily: 'Inter', monoFamily: 'JetBrains Mono', fontSource: 'SYSTEM', fontUrl: null,
        fallbackStack: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    };
}
export function defaultThemeConfig(): LayoutThemeConfig {
    return {
        id: 'purple', label: 'Purple Corporate', base: 'light', swatch: '#6b3fa0',
        primaries: { text: '#1a222c', paper: '#f3f5f7', card: '#ffffff', accent: '#6b3fa0', amber: '#a8630b', red: '#9f2b2b', success: '#1c7a4c', info: '#2f7dd1' },
        chromeOverrides: null
    };
}
export function emptyChromeOverrides(): LayoutThemeChromeOverrides {
    return { accentSoft: null, bg: null, border: null, borderStrong: null, hoverBg: null, activeBg: null, searchBg: null, searchBorder: null, searchText: null, searchPlaceholder: null };
}

export function profileInitialValue(row: LayoutProfileDto | null): Record<string, unknown> {
    if (!row) {
        const sizes = defaultSizeConfig();
        const fonts = defaultFontConfig();
        return {
            layoutType: 'RAIL', navigationMode: 'MODULE_GROUP_MEGA_PANEL', themeMode: 'LIGHT', density: 'COMFORTABLE',
            topbarEnabled: true, sidebarEnabled: true, sidebarCollapsed: false, footerEnabled: true,
            breadcrumbEnabled: true, commandBarEnabled: true, rtlEnabled: false, active: true,
            ...flattenSizes(sizes), ...flattenFonts(fonts)
        };
    }
    const sizes = row.sizes ?? defaultSizeConfig();
    const fonts = row.fonts ?? defaultFontConfig();
    return {
        profileCode: row.code, profileName: row.name, description: row.description ?? '',
        layoutType: row.layoutType, navigationMode: row.navigationMode, themeMode: row.themeMode, density: row.density,
        topbarEnabled: row.topbarEnabled, sidebarEnabled: row.sidebarEnabled, sidebarCollapsed: row.sidebarCollapsed,
        footerEnabled: row.footerEnabled, breadcrumbEnabled: row.breadcrumbEnabled, commandBarEnabled: row.commandBarEnabled,
        rtlEnabled: row.rtlEnabled, active: row.active,
        ...flattenSizes(sizes), ...flattenFonts(fonts)
    };
}

function flattenSizes(sizes: LayoutSizeConfig): Record<string, unknown> {
    return {
        sizeSpaceUnit: sizes.spaceUnit, sizeRadiusBase: sizes.radiusBase, sizeFontSizeBase: sizes.fontSizeBase,
        sizeHeaderHeight: sizes.headerHeight, sizeStatusBarHeight: sizes.statusBarHeight,
        sizeRailWidthCollapsed: sizes.railWidthCollapsed, sizeRailWidthExpanded: sizes.railWidthExpanded
    };
}

function flattenFonts(fonts: LayoutFontConfig): Record<string, unknown> {
    return {
        fontBodyFamily: fonts.bodyFamily, fontHeadingFamily: fonts.headingFamily ?? '', fontMonoFamily: fonts.monoFamily ?? '',
        fontSource: fonts.fontSource, fontUrl: fonts.fontUrl ?? '', fontFallbackStack: fonts.fallbackStack
    };
}

/** Reads the flat sizeXxx form keys (see PROFILE_FIELDS) back into a LayoutSizeConfig for save. */
export function unflattenSizes(value: Record<string, unknown>): LayoutSizeConfig {
    return {
        spaceUnit: Number(value['sizeSpaceUnit']) || 0,
        radiusBase: Number(value['sizeRadiusBase']) || 0,
        fontSizeBase: Number(value['sizeFontSizeBase']) || 0,
        headerHeight: Number(value['sizeHeaderHeight']) || 0,
        statusBarHeight: Number(value['sizeStatusBarHeight']) || 0,
        railWidthCollapsed: Number(value['sizeRailWidthCollapsed']) || 0,
        railWidthExpanded: Number(value['sizeRailWidthExpanded']) || 0
    };
}

/** Reads the flat fontXxx form keys (see PROFILE_FIELDS) back into a LayoutFontConfig for save. */
export function unflattenFonts(value: Record<string, unknown>): LayoutFontConfig {
    return {
        bodyFamily: (value['fontBodyFamily'] as string) || 'Inter',
        headingFamily: (value['fontHeadingFamily'] as string) || null,
        monoFamily: (value['fontMonoFamily'] as string) || null,
        fontSource: (value['fontSource'] as FontSource) || 'SYSTEM',
        fontUrl: (value['fontUrl'] as string) || null,
        fallbackStack: (value['fontFallbackStack'] as string) || "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    };
}

/** Comma-separated privilege codes ↔ string[] — the backend full-replaces a policy's
 * privilege links on every save, so this must round-trip the existing codes on edit
 * (an empty array here would silently wipe them). */
export function joinPrivilegeCodes(codes: string[]): string {
    return codes.join(', ');
}
export function splitPrivilegeCodes(text: string): string[] {
    return text.split(',').map((code) => code.trim()).filter((code) => code.length > 0);
}

export function uiPolicyInitialValue(row: UiPrivilegePolicyDto | null, filterClientCode: string): Record<string, unknown> {
    if (!row) {
        return { clientCode: filterClientCode, matchMode: 'ANY', active: true };
    }
    return {
        clientCode: row.clientCode ?? filterClientCode, actionCode: row.actionCode, matchMode: row.matchMode,
        active: row.active
    };
}

const GLOBAL_CLIENT_OPTION: DropdownOption<unknown> = { label: 'Global (all clients)', value: '' };

export function buildRoutePolicyFields(clientOptions: DropdownOption<unknown>[]): FieldConfig[] {
    return [
        { type: 'dropdown', key: 'clientCode', label: 'Client Code (blank = global)', options: [GLOBAL_CLIENT_OPTION, ...clientOptions] },
        { type: 'text', key: 'routeUrl', label: 'Route URL', required: true },
        { type: 'dropdown', key: 'matchMode', label: 'Match Mode', options: MATCH_MODE_OPTIONS }
    ];
}

export function buildUiPolicyFields(clientOptions: DropdownOption<unknown>[]): FieldConfig[] {
    return [
        { type: 'dropdown', key: 'clientCode', label: 'Client Code (blank = global)', options: [GLOBAL_CLIENT_OPTION, ...clientOptions] },
        { type: 'text', key: 'actionCode', label: 'Action Code', required: true },
        { type: 'dropdown', key: 'matchMode', label: 'Match Mode', options: MATCH_MODE_OPTIONS },
        { type: 'checkbox', key: 'active', label: 'Active' }
    ];
}

export function routePolicyInitialValue(row: RoutePrivilegePolicyDto | null, filterClientCode: string, routeUrl: string | null): Record<string, unknown> {
    if (!row) {
        return { clientCode: filterClientCode, routeUrl: routeUrl ?? '', matchMode: 'ANY' };
    }
    return { clientCode: filterClientCode, routeUrl: row.routeUrl, matchMode: row.matchMode };
}

export const CLIENT_ASSIGNMENT_FIELDS: FieldConfig[] = [
    { type: 'dropdown', key: 'assignmentScope', label: 'Scope', options: ASSIGNMENT_SCOPE_OPTIONS },
    { type: 'text', key: 'roleCode', label: 'Role Code' },
    { type: 'text', key: 'privilegeCode', label: 'Privilege Code' },
    { type: 'dropdown', key: 'deviceTarget', label: 'Device Target', options: DEVICE_TARGET_OPTIONS },
    { type: 'text', key: 'moduleCode', label: 'Module Code' },
    { type: 'number', key: 'displayOrder', label: 'Display Order' },
    { type: 'checkbox', key: 'defaultProfile', label: 'Default Profile' },
    { type: 'checkbox', key: 'selectable', label: 'Selectable' },
    { type: 'checkbox', key: 'active', label: 'Active' }
];

export function clientAssignmentInitialValue(row: ClientLayoutAssignmentDto | null): Record<string, unknown> {
    if (!row) {
        return { assignmentScope: 'CLIENT', deviceTarget: 'ANY', displayOrder: 100, defaultProfile: false, selectable: true, active: true };
    }
    return {
        profileCode: row.profileCode ?? '', assignmentScope: row.assignmentScope, roleCode: row.roleCode ?? '',
        privilegeCode: row.privilegeCode ?? '', deviceTarget: row.deviceTarget, moduleCode: row.moduleCode ?? '',
        displayOrder: row.displayOrder, defaultProfile: row.defaultProfile, selectable: row.selectable, active: row.active
    };
}

function navNodeFields(includeParent: boolean, parentOptions: DropdownOption<unknown>[], extra: FieldConfig[]): FieldConfig[] {
    const fields: FieldConfig[] = [
        { type: 'text', key: 'code', label: 'Code' },
        { type: 'text', key: 'name', label: 'Name', required: true }
    ];
    if (includeParent) {
        fields.push({ type: 'dropdown', key: 'parentId', label: 'Parent', options: parentOptions, colSpan: 2 });
    }
    fields.push(...extra);
    fields.push(
        { type: 'number', key: 'displayOrder', label: 'Display Order' },
        { type: 'checkbox', key: 'active', label: 'Active' }
    );
    return fields;
}

export function moduleGroupFields(): FieldConfig[] {
    return navNodeFields(false, [], [{ type: 'text', key: 'icon', label: 'Icon' }]);
}
export function moduleFields(parentOptions: DropdownOption<unknown>[], physicalModuleOptions: DropdownOption<unknown>[]): FieldConfig[] {
    return navNodeFields(true, parentOptions, [
        { type: 'text', key: 'icon', label: 'Icon' },
        { type: 'text', key: 'description', label: 'Description', colSpan: 2 },
        { type: 'dropdown', key: 'physicalModuleCode', label: 'Physical Module Code', options: physicalModuleOptions }
    ]);
}
export function categoryFields(parentOptions: DropdownOption<unknown>[]): FieldConfig[] {
    return navNodeFields(true, parentOptions, [
        { type: 'text', key: 'icon', label: 'Icon' },
        { type: 'text', key: 'categoryKind', label: 'Category Kind' }
    ]);
}
export function featureGroupFields(parentOptions: DropdownOption<unknown>[]): FieldConfig[] {
    return navNodeFields(true, parentOptions, []);
}
export function featureFields(
    parentOptions: DropdownOption<unknown>[],
    physicalModuleOptions: DropdownOption<unknown>[],
    physicalSubmoduleOptions: DropdownOption<unknown>[],
    physicalFeatureTypeOptions: DropdownOption<unknown>[],
    physicalFeatureOptions: DropdownOption<unknown>[]
): FieldConfig[] {
    return navNodeFields(true, parentOptions, [
        { type: 'text', key: 'route', label: 'Route', required: true },
        { type: 'text', key: 'tCode', label: 'T-Code (generated automatically)', readonly: true, placeholder: 'Assigned when saved' },
        { type: 'text', key: 'icon', label: 'Icon' },
        { type: 'dropdown', key: 'physicalModuleCode', label: 'Physical Module Code', options: physicalModuleOptions },
        { type: 'dropdown', key: 'physicalSubmoduleCode', label: 'Physical Submodule Code', options: physicalSubmoduleOptions },
        { type: 'dropdown', key: 'physicalFeatureTypeCode', label: 'Physical Feature Type Code', options: physicalFeatureTypeOptions },
        { type: 'dropdown', key: 'physicalFeatureCode', label: 'Physical Feature Code', options: physicalFeatureOptions },
        // Privileges are selected through the validated searchable catalog in the editor.
    ]);
}

export function navNodeInitialValue(row: NavNodeDto | null): Record<string, unknown> {
    if (!row) {
        return { displayOrder: 100, active: true };
    }
    return {
        code: row.code, name: row.label, parentId: row.parentId, icon: row.icon ?? '',
        description: row.description ?? '', route: row.route ?? '', tCode: row.tCode ?? '',
        displayOrder: row.displayOrder, active: row.active
    };
}
