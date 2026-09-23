import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { CustomersService } from '../../services/customers.service';
import { Customer } from '../../models/customer.model';

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 10;

@Component({
  selector: 'app-customers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss',
})
export class CustomersListComponent {
  private readonly customersService = inject(CustomersService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly isLoading = signal(true);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly count = signal(0);
  protected readonly totalPages = signal(0);

  /** ids currently mid-ban/unban request — disables their row action while in flight. */
  protected readonly pendingIds = signal<ReadonlySet<number>>(new Set());

  protected readonly rangeStart = computed(() =>
    this.count() === 0 ? 0 : (this.pageIndex() - 1) * this.pageSize() + 1,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min(this.pageIndex() * this.pageSize(), this.count()),
  );

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.pageIndex.set(1);
        this.load();
      });

    this.load();
  }

  protected onSearchInput(term: string): void {
    this.searchInput$.next(term);
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
    this.pageIndex.set(1);
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.customersService
      .list({
        pageIndex: this.pageIndex(),
        pageSize: this.pageSize(),
        search: this.searchTerm() || undefined,
      })
      .subscribe({
        next: (page) => {
          this.customers.set(page.data);
          this.count.set(page.count);
          this.totalPages.set(page.totalPages);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  protected onPageChange(page: number): void {
    this.pageIndex.set(page);
    this.load();
  }

  protected async onToggleBan(customer: Customer): Promise<void> {
    const willBan = !customer.isBanned;

    const confirmed = await this.dialog.confirm({
      title: willBan ? 'حظر العميل' : 'إلغاء حظر العميل',
      message: willBan
        ? `هل أنت متأكد من حظر "${customer.name}"؟ لن يتمكن من إنشاء طلبات جديدة حتى يتم إلغاء الحظر.`
        : `هل تريد إلغاء حظر "${customer.name}"؟ سيتمكن من استخدام التطبيق فورًا.`,
      confirmText: willBan ? 'حظر' : 'إلغاء الحظر',
      type: willBan ? 'danger' : 'info',
    });
    if (!confirmed) return;

    this.pendingIds.update((set) => new Set(set).add(customer.id));

    const request$ = willBan
      ? this.customersService.ban(customer.id)
      : this.customersService.unban(customer.id);

    request$.subscribe({
      next: () => {
        this.customers.update((list) =>
          list.map((c) => (c.id === customer.id ? { ...c, isBanned: willBan } : c)),
        );
        this.pendingIds.update((set) => {
          const next = new Set(set);
          next.delete(customer.id);
          return next;
        });
        this.toast.success(willBan ? 'تم حظر العميل بنجاح' : 'تم تفعيل العميل بنجاح');
      },
      error: (err: ApiError) => {
        this.pendingIds.update((set) => {
          const next = new Set(set);
          next.delete(customer.id);
          return next;
        });
        this.toast.error(err.message);
      },
    });
  }

  protected isPending(customer: Customer): boolean {
    return this.pendingIds().has(customer.id);
  }

  protected initials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
