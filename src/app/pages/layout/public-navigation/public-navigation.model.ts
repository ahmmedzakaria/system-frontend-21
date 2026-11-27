export interface PublicNavigationGroup {
  id: number; tenantId: number; groupCode: string; groupName: string; surface: string;
  displayOrder: number; active: boolean; version: number;
}
export interface PublicNavigationItem {
  id: number; tenantId: number; navigationGroupId: number; parentId: number | null;
  itemCode: string; itemType: 'GROUP' | 'INTERNAL_ROUTE' | 'EXTERNAL_URL'; label: string;
  description: string | null; ariaLabel: string | null; routePath: string | null;
  externalUrl: string | null; target: 'SELF' | 'BLANK'; icon: string | null;
  displayOrder: number; active: boolean; version: number;
}
export interface PublicNavigationTreeItem {
  code: string; type: string; label: string; routePath: string | null; externalUrl: string | null;
  target: string; children: PublicNavigationTreeItem[];
}
export interface PublicNavigationContext {
  clientCode: string;
  regions: { surface: string; groups: { code: string; label: string; items: PublicNavigationTreeItem[] }[] }[];
}
export interface PublicNavigationIntegrity { valid: boolean; issues: string[]; }
