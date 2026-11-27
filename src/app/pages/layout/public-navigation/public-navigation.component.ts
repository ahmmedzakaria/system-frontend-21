import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthorizedUiDirective } from '@nexacore/platform';
import { AuthorizedScopeService } from '../../../core/services/authorized-scope.service';
import { ClientApplicationService } from '../../../core/services/client-application.service';
import { PublicNavigationService } from '../../../core/services/public-navigation.service';
import { PublicNavigationContext, PublicNavigationGroup, PublicNavigationIntegrity, PublicNavigationItem } from './public-navigation.model';

@Component({
  selector: 'app-public-navigation', standalone: true, imports: [FormsModule, JsonPipe, AuthorizedUiDirective],
  templateUrl: './public-navigation.component.html', styleUrl: './public-navigation.component.scss'
})
export class PublicNavigationComponent {
  private readonly api = inject(PublicNavigationService);
  private readonly scopes = inject(AuthorizedScopeService);
  private readonly clientsApi = inject(ClientApplicationService);
  protected readonly tenants = signal<readonly { id: number; label: string }[]>([]);
  protected readonly clients = signal<{ clientCode: string; clientName: string }[]>([]);
  protected readonly tenantId = signal<number | null>(null);
  protected readonly clientCode = signal('');
  protected readonly surface = signal('PRIMARY');
  protected readonly groups = signal<PublicNavigationGroup[]>([]);
  protected readonly items = signal<PublicNavigationItem[]>([]);
  protected readonly selected = signal<ReadonlySet<number>>(new Set());
  protected readonly preview = signal<PublicNavigationContext | null>(null);
  protected readonly integrity = signal<PublicNavigationIntegrity | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly assignable = computed(() => this.items().filter(item => item.active && item.itemType !== 'GROUP'));
  protected groupForm: Record<string, unknown> = this.newGroup();
  protected itemForm: Record<string, unknown> = this.newItem();

  constructor() {
    this.scopes.tenants().subscribe(rows => this.tenants.set(rows));
    this.clientsApi.list().subscribe(rows => this.clients.set(rows.filter(row => row.status === 'ACTIVE')));
  }

  protected selectTenant(raw: string): void {
    const value = Number(raw);
    this.tenantId.set(Number.isFinite(value) && value > 0 ? value : null);
    this.clientCode.set(''); this.groups.set([]); this.items.set([]); this.selected.set(new Set());
    this.preview.set(null); this.integrity.set(null); this.groupForm = this.newGroup(); this.itemForm = this.newItem();
    if (this.tenantId()) this.reload();
  }
  protected selectClient(value: string): void {
    this.clientCode.set(value); this.selected.set(new Set()); this.preview.set(null);
    if (value) this.api.assignments(this.requiredTenant(), value).subscribe(result => this.selected.set(new Set(result.itemIds)));
  }
  protected reload(): void {
    const tenantId = this.requiredTenant(); this.loading.set(true); this.error.set('');
    forkJoin({ groups: this.api.groups(tenantId), items: this.api.items(tenantId), integrity: this.api.integrity(tenantId) })
      .subscribe({ next: result => { this.groups.set(result.groups); this.items.set(result.items); this.integrity.set(result.integrity); this.loading.set(false); },
        error: () => { this.error.set('Unable to load public navigation.'); this.loading.set(false); } });
  }
  protected editGroup(group?: PublicNavigationGroup): void { this.groupForm = group ? { ...group } : this.newGroup(); }
  protected saveGroup(): void {
    this.api.saveGroup({ ...this.groupForm, tenantId: this.requiredTenant() }).subscribe(() => { this.editGroup(); this.reload(); });
  }
  protected editItem(item?: PublicNavigationItem): void { this.itemForm = item ? { ...item } : this.newItem(); }
  protected saveItem(): void {
    const type = String(this.itemForm['itemType']);
    if (type === 'GROUP') { this.itemForm['routePath'] = null; this.itemForm['externalUrl'] = null; }
    if (type === 'INTERNAL_ROUTE') this.itemForm['externalUrl'] = null;
    if (type === 'EXTERNAL_URL') this.itemForm['routePath'] = null;
    this.api.saveItem({ ...this.itemForm, tenantId: this.requiredTenant() }).subscribe(() => { this.editItem(); this.reload(); });
  }
  protected toggle(id: number, checked: boolean): void {
    const next = new Set(this.selected()); checked ? next.add(id) : next.delete(id); this.selected.set(next);
  }
  protected saveAssignments(): void {
    this.api.replaceAssignments(this.requiredTenant(), this.clientCode(), [...this.selected()]).subscribe(() => this.loadPreview());
  }
  protected loadPreview(): void {
    this.api.preview(this.requiredTenant(), this.clientCode(), [this.surface()]).subscribe(value => this.preview.set(value));
  }
  protected groupName(id: number): string { return this.groups().find(group => group.id === id)?.groupName ?? `#${id}`; }
  private requiredTenant(): number { const value = this.tenantId(); if (!value) throw new Error('Tenant is required'); return value; }
  private newGroup(): Record<string, unknown> { return { groupCode: '', groupName: '', surface: this.surface(), displayOrder: 100, active: true, version: null }; }
  private newItem(): Record<string, unknown> { return { navigationGroupId: null, parentId: null, itemCode: '', itemType: 'INTERNAL_ROUTE', label: '', routePath: '/', externalUrl: null, target: 'SELF', displayOrder: 100, active: true, version: null }; }
}
