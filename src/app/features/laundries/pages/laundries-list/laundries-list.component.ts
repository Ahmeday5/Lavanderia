import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { LaundriesService } from '../../services/laundries.service';
import { Laundry } from '../../models/laundry.model';

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 10;

@Component({
  selector: 'app-laundries-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './laundries-list.component.html',
  styleUrl: './laundries-list.component.scss',
})
export class LaundriesListComponent {
  private readonly laundriesService = inject(LaundriesService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly isLoading = signal(true);
  protected readonly laundries = signal<Laundry[]>([]);
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
    this.laundriesService
      .list({
        pageIndex: this.pageIndex(),
        pageSize: this.pageSize(),
        search: this.searchTerm() || undefined,
      })
      .subscribe({
        next: (page) => {
          this.laundries.set(page.data);
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

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
    this.load();
  }

  protected async onToggleBan(laundry: Laundry): Promise<void> {
    const willBan = !laundry.isBanned;

    const confirmed = await this.dialog.confirm({
      title: willBan ? 'حظر المغسلة' : 'إلغاء حظر المغسلة',
      message: willBan
        ? `هل أنت متأكد من حظر مغسلة "${laundry.name}"؟ لن تتمكن من استقبال أي طلبات جديدة حتى يتم إلغاء الحظر.`
        : `هل تريد إلغاء حظر مغسلة "${laundry.name}"؟ ستتمكن من العمل على المنصة فورًا.`,
      confirmText: willBan ? 'حظر' : 'إلغاء الحظر',
      type: willBan ? 'danger' : 'info',
    });
    if (!confirmed) return;

    this.pendingIds.update((set) => new Set(set).add(laundry.id));

    const request$ = willBan
      ? this.laundriesService.ban(laundry.id)
      : this.laundriesService.unban(laundry.id);

    request$.subscribe({
      next: () => {
        this.laundries.update((list) =>
          list.map((l) => (l.id === laundry.id ? { ...l, isBanned: willBan } : l)),
        );
        this.pendingIds.update((set) => {
          const next = new Set(set);
          next.delete(laundry.id);
          return next;
        });
        this.toast.success(willBan ? 'تم حظر المغسلة بنجاح' : 'تم تفعيل المغسلة بنجاح');
      },
      error: (err: ApiError) => {
        this.pendingIds.update((set) => {
          const next = new Set(set);
          next.delete(laundry.id);
          return next;
        });
        this.toast.error(err.message);
      },
    });
  }

  protected isPending(laundry: Laundry): boolean {
    return this.pendingIds().has(laundry.id);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
