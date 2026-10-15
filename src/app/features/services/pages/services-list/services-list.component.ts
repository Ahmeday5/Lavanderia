import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ConfirmDialogConfig, DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { createPagedList } from '../../../../core/utils/paged-list.util';
import { withLocalSearch } from '../../../../core/utils/local-search.util';
import { parseRouteId } from '../../../../core/utils/record-loader.util';
import { bindListSearchToUrl } from '../../../../core/utils/url-search-sync.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ThumbComponent } from '../../../../shared/components/thumb/thumb.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { PageRefreshService } from '../../../../core/services/page-refresh.service';
import { ServicesService } from '../../services/services.service';
import { ServiceItemsService } from '../../services/service-items.service';
import { Service } from '../../models/service.model';
import { ServiceItem, hasSubItems, isRootItem } from '../../models/service-item.model';
import { ServiceFormModalComponent } from '../../components/service-form-modal/service-form-modal.component';
import { ServiceItemFormModalComponent } from '../../components/service-item-form-modal/service-item-form-modal.component';
import { ServiceItemTreeComponent } from '../../components/service-item-tree/service-item-tree.component';
import { formatSubItemCount } from '../../utils/service-item-labels.util';

@Component({
  selector: 'app-services-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ServiceFormModalComponent,
    ServiceItemFormModalComponent,
    ServiceItemTreeComponent,
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

  /** Router-bound `?open=` — a service id to expand on arrival. */
  readonly open = input<string>();
  private autoOpenedId: number | null = null;

  // Started at the end of the constructor (by the URL binding): a cache hit
  // resolves synchronously, so `onPage` must not fire before `countsRequest$` is wired.
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
  /** Root items of the open service whose sub-items (types) are revealed. */
  protected readonly expandedItemIds = signal<ReadonlySet<number>>(new Set());

  protected readonly isServiceModalOpen = signal(false);
  protected readonly editingService = signal<Service | null>(null);

  protected readonly isItemModalOpen = signal(false);
  protected readonly editingItem = signal<ServiceItem | null>(null);
  protected readonly newItemServiceId = signal<number | null>(null);
  protected readonly newItemParentId = signal<number | null>(null);

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

    // `?open=<serviceId>` (global-search links) expands that service once it is on the page.
    effect(() => {
      const id = parseRouteId(this.open());
      const visible = this.list.items().some((service) => service.id === id);
      if (id === null || !visible || this.autoOpenedId === id) return;
      untracked(() => {
        this.autoOpenedId = id;
        if (this.expandedServiceId() !== id) {
          const service = this.list.items().find((s) => s.id === id);
          if (service) this.toggleExpand(service);
        }
      });
    });

    // The URL's `?search=` drives the first load (and keeps later searches shareable).
    bindListSearchToUrl(this.list);
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
    this.expandedItemIds.set(new Set());
    this.loadExpandedItems();
  }

  protected toggleItemExpand(item: ServiceItem): void {
    this.expandedItemIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(item.id)) next.add(item.id);
      return next;
    });
  }

  private revealItem(itemId: number): void {
    this.expandedItemIds.update((ids) => (ids.has(itemId) ? ids : new Set(ids).add(itemId)));
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

  // ── service item CRUD (root items and their sub-items share one form) ──

  protected openCreateItemModal(service: Service): void {
    this.openItemModal(null, service.id, null);
  }

  /**
   * The first type of an item wipes its laundry prices server-side (an item
   * with types isn't priced itself), so that case is confirmed up front.
   */
  protected async openCreateSubItemModal(parent: ServiceItem): Promise<void> {
    if (!hasSubItems(parent)) {
      const confirmed = await this.dialog.confirm({
        title: 'إضافة أول نوع',
        message: `إضافة نوع ستلغي أسعار المغاسل الحالية على هذا الصنف ("${parent.name}"). هل تريد المتابعة؟`,
        confirmText: 'متابعة',
        type: 'warning',
      });
      if (!confirmed) return;
    }
    this.openItemModal(null, parent.serviceId, parent.id);
  }

  protected openEditItemModal(item: ServiceItem): void {
    this.openItemModal(item, null, null);
  }

  private openItemModal(
    item: ServiceItem | null,
    serviceId: number | null,
    parentItemId: number | null,
  ): void {
    this.editingItem.set(item);
    this.newItemServiceId.set(serviceId);
    this.newItemParentId.set(parentItemId);
    this.isItemModalOpen.set(true);
  }

  protected closeItemModal(): void {
    this.isItemModalOpen.set(false);
  }

  protected onItemSaved(item: ServiceItem): void {
    this.isItemModalOpen.set(false);
    // Keep a freshly added/moved type visible under its parent.
    if (item.parentItemId !== null) this.revealItem(item.parentItemId);
    this.refreshItems();
  }

  protected async onDeleteItem(item: ServiceItem): Promise<void> {
    const confirmed = await this.dialog.confirm(deleteItemConfirmation(item));
    if (!confirmed) return;

    const label = isRootItem(item) ? 'الصنف' : 'النوع';
    this.serviceItemsService.delete(item.id).subscribe({
      next: () => {
        this.toast.success(`تم حذف ${label} بنجاح`);
        this.refreshItems();
      },
      error: (err: ApiError) => this.toast.error(apiErrorToMessage(err, `تعذّر حذف ${label}.`)),
    });
  }
}

/** Deleting a root item cascades to its types server-side — say so explicitly. */
function deleteItemConfirmation(item: ServiceItem): ConfirmDialogConfig {
  const base = { confirmText: 'حذف', type: 'danger' } as const;
  if (!isRootItem(item)) {
    return { ...base, title: 'حذف النوع', message: `هل أنت متأكد من حذف نوع "${item.name}"؟` };
  }
  if (hasSubItems(item)) {
    return {
      ...base,
      title: 'حذف الصنف وأنواعه',
      message: `سيتم حذف الصنف "${item.name}" وجميع أنواعه (${formatSubItemCount(item.subItems.length)}). هل أنت متأكد؟`,
    };
  }
  return { ...base, title: 'حذف الصنف', message: `هل أنت متأكد من حذف صنف "${item.name}"؟` };
}
