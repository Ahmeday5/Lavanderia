import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { ServicesService } from '../../services/services.service';
import { ServiceItemsService } from '../../services/service-items.service';
import { Service } from '../../models/service.model';
import { ServiceItem } from '../../models/service-item.model';
import { ServiceFormModalComponent } from '../../components/service-form-modal/service-form-modal.component';
import { ServiceItemFormModalComponent } from '../../components/service-item-form-modal/service-item-form-modal.component';

@Component({
  selector: 'app-services-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ServiceFormModalComponent, ServiceItemFormModalComponent],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.scss',
})
export class ServicesListComponent {
  private readonly servicesService = inject(ServicesService);
  private readonly serviceItemsService = inject(ServiceItemsService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly isLoading = signal(true);
  protected readonly services = signal<Service[]>([]);
  protected readonly searchTerm = signal('');

  /** id of the service whose items panel is currently expanded, if any. */
  protected readonly expandedServiceId = signal<number | null>(null);
  protected readonly isItemsLoading = signal(false);

  protected readonly isServiceModalOpen = signal(false);
  protected readonly editingService = signal<Service | null>(null);

  protected readonly isItemModalOpen = signal(false);
  protected readonly editingItem = signal<ServiceItem | null>(null);
  protected readonly newItemServiceId = signal<number | null>(null);

  protected readonly filteredServices = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.services();
    if (!term) return all;
    return all.filter((s) => s.name.toLowerCase().includes(term));
  });

  protected readonly expandedService = computed(() => {
    const id = this.expandedServiceId();
    if (id === null) return null;
    return this.services().find((s) => s.id === id) ?? null;
  });

  protected readonly totalItemsCount = computed(() =>
    this.services().reduce((sum, s) => sum + s.items.length, 0),
  );

  constructor() {
    this.loadServices();
  }

  protected loadServices(): void {
    this.isLoading.set(true);
    this.servicesService.list().subscribe({
      next: (services) => {
        this.services.set(services);
        this.isLoading.set(false);
        this.loadAllItemCounts(services);
      },
      error: () => this.isLoading.set(false),
    });
  }

  /**
   * `GET /services` always returns `items: []` — the real per-service item
   * list only comes back from `GET /services/:id/items`. Fetch every
   * service's items once up front so row counts ("N صنف مرتبط") are correct
   * before the user expands anything, instead of showing a misleading 0.
   */
  private loadAllItemCounts(services: Service[]): void {
    if (services.length === 0) return;

    const requests = services.map((s) =>
      this.serviceItemsService.listByService(s.id).pipe(
        catchError(() => of<ServiceItem[]>([])),
      ),
    );

    forkJoin(requests).subscribe((itemLists) => {
      this.services.update((list) =>
        list.map((s, i) => ({ ...s, items: itemLists[i] })),
      );
    });
  }

  // ── expand / collapse (master-detail) ──

  protected toggleExpand(service: Service): void {
    if (this.expandedServiceId() === service.id) {
      this.expandedServiceId.set(null);
      return;
    }
    this.expandedServiceId.set(service.id);
    this.loadItems(service.id);
  }

  private loadItems(serviceId: number): void {
    this.isItemsLoading.set(true);
    this.serviceItemsService.listByService(serviceId).subscribe({
      next: (items) => {
        this.services.update((list) =>
          list.map((s) => (s.id === serviceId ? { ...s, items } : s)),
        );
        this.isItemsLoading.set(false);
      },
      error: () => this.isItemsLoading.set(false),
    });
  }

  // ── service CRUD ──

  protected openCreateServiceModal(): void {
    this.editingService.set(null);
    this.isServiceModalOpen.set(true);
  }

  protected openEditServiceModal(service: Service): void {
    this.editingService.set(service);
    this.isServiceModalOpen.set(true);
  }

  protected closeServiceModal(): void {
    this.isServiceModalOpen.set(false);
  }

  protected onServiceSaved(service: Service): void {
    this.isServiceModalOpen.set(false);
    const current = this.editingService();
    this.services.update((list) => {
      if (!current) return [...list, service];
      return list.map((s) => (s.id === service.id ? { ...s, ...service, items: s.items } : s));
    });
  }

  protected async onDeleteService(service: Service): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'حذف الخدمة',
      message: `هل أنت متأكد من حذف خدمة "${service.name}"؟ سيتم حذف جميع الأصناف المرتبطة بها.`,
      confirmText: 'حذف',
      type: 'danger',
    });
    if (!confirmed) return;

    this.servicesService.delete(service.id).subscribe({
      next: () => {
        this.services.update((list) => list.filter((s) => s.id !== service.id));
        if (this.expandedServiceId() === service.id) this.expandedServiceId.set(null);
        this.toast.success('تم حذف الخدمة بنجاح');
      },
      error: (err: ApiError) => this.toast.error(err.message),
    });
  }

  // ── service item CRUD ──

  protected openCreateItemModal(service: Service): void {
    this.editingItem.set(null);
    this.newItemServiceId.set(service.id);
    this.isItemModalOpen.set(true);
  }

  protected openEditItemModal(item: ServiceItem): void {
    this.editingItem.set(item);
    this.newItemServiceId.set(null);
    this.isItemModalOpen.set(true);
  }

  protected closeItemModal(): void {
    this.isItemModalOpen.set(false);
  }

  protected onItemSaved(item: ServiceItem): void {
    this.isItemModalOpen.set(false);
    const previousServiceId = this.editingItem()?.serviceId;

    this.services.update((list) =>
      list.map((s) => {
        if (s.id === item.serviceId) {
          // Item now belongs here — update in place or append if moved in.
          const exists = s.items.some((i) => i.id === item.id);
          return {
            ...s,
            items: exists
              ? s.items.map((i) => (i.id === item.id ? item : i))
              : [...s.items, item],
          };
        }
        if (s.id === previousServiceId) {
          // Item moved away from this service — drop it from the old list.
          return { ...s, items: s.items.filter((i) => i.id !== item.id) };
        }
        return s;
      }),
    );
  }

  protected async onDeleteItem(item: ServiceItem): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'حذف الصنف',
      message: `هل أنت متأكد من حذف صنف "${item.name}"؟`,
      confirmText: 'حذف',
      type: 'danger',
    });
    if (!confirmed) return;

    this.serviceItemsService.delete(item.id).subscribe({
      next: () => {
        this.services.update((list) =>
          list.map((s) =>
            s.id === item.serviceId
              ? { ...s, items: s.items.filter((i) => i.id !== item.id) }
              : s,
          ),
        );
        this.toast.success('تم حذف الصنف بنجاح');
      },
      error: (err: ApiError) => this.toast.error(err.message),
    });
  }
}
