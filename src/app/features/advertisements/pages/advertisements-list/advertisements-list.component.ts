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
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { createPagedList } from '../../../../core/utils/paged-list.util';
import { withLocalSearch } from '../../../../core/utils/local-search.util';
import { pendingSet } from '../../../../core/utils/pending-set.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { ThumbComponent } from '../../../../shared/components/thumb/thumb.component';
import { AdvertisementsService } from '../../services/advertisements.service';
import {
  AD_TARGET_META,
  AdTargetType,
  Advertisement,
  isAdTargetType,
} from '../../models/advertisement.model';
import { AdFormModalComponent } from '../../components/ad-form-modal/ad-form-modal.component';
import { AdTargetBadgeComponent } from '../../components/ad-target-badge/ad-target-badge.component';
import { AdTargetFilterComponent } from '../../components/ad-target-filter/ad-target-filter.component';

const SKELETON_CARDS = [1, 2, 3, 4, 5, 6];

/**
 * Advertisements — `/advertisements?target=Customer`.
 *
 * The audience filter lives in the URL (single source of truth), so filtered
 * views survive a reload and can be shared. The endpoint has no server-side
 * search, so title search runs locally (see `withLocalSearch`).
 */
@Component({
  selector: 'app-advertisements-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PaginationComponent,
    RefreshButtonComponent,
    ThumbComponent,
    AdFormModalComponent,
    AdTargetBadgeComponent,
    AdTargetFilterComponent,
  ],
  templateUrl: './advertisements-list.component.html',
  styleUrl: './advertisements-list.component.scss',
})
export class AdvertisementsListComponent {
  private readonly adsService = inject(AdvertisementsService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Router-bound `?target=` (`withComponentInputBinding`). */
  readonly target = input<string | undefined>();

  /** An unknown `?target=` is ignored rather than sent to the API. */
  protected readonly targetFilter = computed<AdTargetType | null>(() => {
    const target = this.target();
    return isAdTargetType(target) ? target : null;
  });

  protected readonly list = createPagedList(
    withLocalSearch(
      (query) => this.adsService.list({ targetType: this.targetFilter() }, query),
      (ad) => [ad.title],
    ),
    { immediate: false },
  );

  protected readonly isModalOpen = signal(false);
  protected readonly editingAd = signal<Advertisement | null>(null);
  protected readonly deleting = pendingSet<number>();

  protected readonly skeletonCards = SKELETON_CARDS;

  protected readonly statLabel = computed(() => {
    const target = this.targetFilter();
    return target ? `إعلان لـ${AD_TARGET_META[target].label}` : 'إعلان منشور';
  });

  protected readonly emptyState = computed(() => {
    if (this.list.search()) {
      return { icon: 'fa-magnifying-glass', title: 'لا توجد نتائج مطابقة', subtitle: 'جرّب كلمة بحث أخرى', canCreate: false };
    }
    const target = this.targetFilter();
    if (target) {
      return {
        icon: AD_TARGET_META[target].icon,
        title: `لا توجد إعلانات موجّهة لـ${AD_TARGET_META[target].label}`,
        subtitle: `أضف إعلانًا ليظهر في ${AD_TARGET_META[target].audience}`,
        canCreate: true,
      };
    }
    return { icon: 'fa-bullhorn', title: 'لا توجد إعلانات بعد', subtitle: 'ابدأ بإضافة أول إعلان لعرضه في التطبيقات', canCreate: true };
  });

  constructor() {
    // (Re)load from page 1 whenever the audience filter changes — including
    // the first run, once router inputs are bound.
    effect(() => {
      this.targetFilter();
      untracked(() => this.list.restart());
    });
  }

  protected setTarget(target: AdTargetType | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { target },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected openCreateModal(): void {
    this.editingAd.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditModal(ad: Advertisement): void {
    this.editingAd.set(ad);
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  /** The server owns ordering and totals, so refetch the page instead of patching it locally. */
  protected onSaved(): void {
    this.isModalOpen.set(false);
    this.list.reload();
  }

  protected async onDelete(ad: Advertisement): Promise<void> {
    if (this.deleting.has(ad.id)) return;

    const confirmed = await this.dialog.confirm({
      title: 'حذف الإعلان',
      message: `هل أنت متأكد من حذف إعلان "${ad.title}"؟ سيختفي فورًا من التطبيق ولا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      type: 'danger',
    });
    if (!confirmed) return;

    this.deleting.add(ad.id);
    this.adsService.delete(ad.id).subscribe({
      next: () => {
        this.deleting.delete(ad.id);
        this.toast.success('تم حذف الإعلان بنجاح');
        this.list.reload();
      },
      error: (err: ApiError) => {
        this.deleting.delete(ad.id);
        this.toast.error(apiErrorToMessage(err, 'تعذّر حذف الإعلان. حاول مرة أخرى.'));
      },
    });
  }
}
