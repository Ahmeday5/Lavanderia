import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { createPagedList } from '../../../../core/utils/paged-list.util';
import { withLocalSearch } from '../../../../core/utils/local-search.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ThumbComponent } from '../../../../shared/components/thumb/thumb.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { PageRefreshService } from '../../../../core/services/page-refresh.service';
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
  imports: [
    FormsModule,
    ServiceFormModalComponent,
    ServiceItemFormModalComponent,
    PaginationComponent,
    ThumbComponent,
    RefreshButtonComponent,
  ],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.scss',
})
export class ServicesListComponent {
  private readonly servicesService = inject(ServicesService);
  private readonly serviceItemsService = inject(ServiceItemsService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  // Started manually at the end of the constructor: a cache hit resolves
  // synchronously, so `onPage` must not fire before `countsRequest$` is wired.
  protected readonly list = createPagedList(
    withLocalSearch((query) => this.servicesService.list(query), (service) => [service.name]),
    {
      immediate: false,
      onPage: (page) => this.countsRequest$.next(page.data),
    },
  );

  /** Item count per service id, for the services on the visible page. */
  protected readonly itemCounts = signal<ReadonlyMap<number, number>>(new Map());
  private readonly countsRequest$ = new Subject<Service[]>();

  /** id of the service whose items panel is currently expanded, if any. */
  protected readonly expandedServiceId = signal<number | null>(null);
  protected readonly expandedItems = signal<ServiceItem[]>([]);
  protected readonly isItemsLoading = signal(false);
  protected readonly itemsError = signal(false);
  private readonly itemsRequest$ = new Subject<number>();

  protected readonly isServiceModalOpen = signal(false);
  protected readonly editingService = signal<Service | null>(null);

  protected readonly isItemModalOpen = signal(false);
  protected readonly editingItem = signal<ServiceItem | null>(null);
  protected readonly newItemServiceId = signal<number | null>(null);

  protected readonly pageItemsCount = computed(() => {
    let sum = 0;
    for (const count of this.itemCounts().values()) sum += count;
    return sum;
  });

  constructor() {
    // One count request per visible service (a 1-row page each). A failed
    // count just leaves that row's counter blank instead of failing the page.
    this.countsRequest$
      .pipe(
        switchMap((services) =>
          services.length === 0
            ? of([])
            : forkJoin(
                services.map((s) =>
                  this.serviceItemsService.countByService(s.id).pipe(
                    map((count) => [s.id, count] as const),
                    catchError(() => of(null)),
                  ),
                ),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((entries) => {
        this.itemCounts.set(
          new Map(entries.filter((e): e is readonly [number, number] => e !== null)),
        );
      });

    this.itemsRequest$
      .pipe(
        switchMap((serviceId) =>
          this.serviceItemsService.listAllByService(serviceId).pipe(
            map((items) => ({ ok: true as const, items })),
            catchError(() => of({ ok: false as const, items: [] as ServiceItem[] })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ ok, items }) => {
        this.expandedItems.set(items);
        this.itemsError.set(!ok);
        this.isItemsLoading.set(false);
      });

    // The list (and, through `onPage`, the counts) refetches by itself on a
    // page refresh; the open items panel is this component's own data.
    inject(PageRefreshService)
      .refreshes$.pipe(takeUntilDestroyed())
      .subscribe(() => this.loadExpandedItems());

    this.list.reload();
  }

  protected itemCount(serviceId: number): number | null {
    return this.itemCounts().get(serviceId) ?? null;
  }

  // ── expand / collapse (master-detail) ──

  protected toggleExpand(service: Service): void {
    if (this.expandedServiceId() === service.id) {
      this.expandedServiceId.set(null);
      return;
    }
    this.expandedServiceId.set(service.id);
    this.expandedItems.set([]);
    this.loadExpandedItems();
  }

  protected loadExpandedItems(): void {
    const id = this.expandedServiceId();
    if (id === null) return;
    this.isItemsLoading.set(true);
    this.itemsError.set(false);
    this.itemsRequest$.next(id);
  }

  /** After an item mutation: refresh the open panel and the visible counts. */
  private refreshItems(): void {
    this.loadExpandedItems();
    this.countsRequest$.next(this.list.items());
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

  protected onServiceSaved(): void {
    this.isServiceModalOpen.set(false);
    this.list.reload();
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
        if (this.expandedServiceId() === service.id) this.expandedServiceId.set(null);
        this.toast.success('تم حذف الخدمة بنجاح');
        this.list.reload();
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

  protected onItemSaved(): void {
    this.isItemModalOpen.set(false);
    this.refreshItems();
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
        this.toast.success('تم حذف الصنف بنجاح');
        this.refreshItems();
      },
      error: (err: ApiError) => this.toast.error(err.message),
    });
  }
}
