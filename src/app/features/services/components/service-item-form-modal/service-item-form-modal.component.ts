import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { ImagePickerComponent } from '../../../../shared/components/image-picker/image-picker.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { SavePhase, saveWithImage } from '../../../../core/utils/save-with-image.util';
import { ServiceItemsService } from '../../services/service-items.service';
import { ServicesService } from '../../services/services.service';
import { ServiceItem, hasSubItems } from '../../models/service-item.model';
import { Service } from '../../models/service.model';
import { formatSubItemCount } from '../../utils/service-item-labels.util';

/** Result of loading the candidate parents (root items) of the selected service. */
interface ParentsState {
  serviceId: number;
  items: ServiceItem[];
  failed: boolean;
}

/**
 * Add/edit modal for a service item — a root item ("صنف") or a sub-item
 * ("نوع"): name, service, optional parent item, optional image. `item` input
 * drives the mode — `null` means "create".
 *
 * Hierarchy rules mirrored from the backend (which stays the authority and
 * answers 400 with an Arabic message when one is broken):
 *  - the parent must be a root item of the same service, never the item itself;
 *  - an item that already has sub-items can neither become a sub-item nor move
 *    to another service, so both selectors are locked for it;
 *  - giving a root item its first sub-item wipes the laundry prices set on it,
 *    which the form warns about inline before saving.
 *
 * Like the service modal, a failed image upload after a successful save
 * keeps the modal open on the saved item so only the upload is retried.
 */
@Component({
  selector: 'app-service-item-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
    ImagePickerComponent,
  ],
  templateUrl: './service-item-form-modal.component.html',
  styleUrl: './service-item-form-modal.component.scss',
})
export class ServiceItemFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly serviceItemsService = inject(ServiceItemsService);
  private readonly servicesService = inject(ServicesService);
  private readonly toast = inject(ToastService);

  readonly open = input.required<boolean>();
  readonly item = input<ServiceItem | null>(null);
  /** Preselected service when creating a new item from a specific service row. */
  readonly defaultServiceId = input<number | null>(null);
  /** Preselected parent when creating a sub-item from a specific root item. */
  readonly defaultParentItemId = input<number | null>(null);

  readonly closed = output<void>();
  /** Emitted whenever the server state changed, including a partial (image-failed) save. */
  readonly saved = output<ServiceItem>();

  private readonly picker = viewChild(ImagePickerComponent);

  protected readonly phase = signal<SavePhase | null>(null);
  protected readonly isSubmitting = computed(() => this.phase() !== null);
  protected readonly serverError = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly pendingImage = signal<File | null>(null);

  private readonly persisted = signal<ServiceItem | null>(null);
  protected readonly target = computed(() => this.persisted() ?? this.item());
  protected readonly isEditMode = computed(() => this.target() !== null);

  /**
   * Every service (all pages) for the selector — the parent list is
   * paginated, so its visible rows aren't a complete option set.
   */
  private readonly services = signal<Service[]>([]);
  protected readonly isServicesLoading = signal(false);

  protected readonly serviceOptions = computed<SearchableSelectOption[]>(() =>
    this.services().map((s) => ({ value: s.id, label: s.name })),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    // `0` = nothing selected, which `Validators.required` would accept.
    serviceId: [0, [(c: AbstractControl) => (Number(c.value) > 0 ? null : { required: true })]],
    // `null` = root item.
    parentItemId: this.fb.control<number | null>(null),
  });

  // ── parent (root item) candidates of the selected service ──

  private readonly parentsRequest$ = new Subject<number>();
  private readonly parents = signal<ParentsState>({ serviceId: 0, items: [], failed: false });
  protected readonly isParentsLoading = signal(false);
  protected readonly parentsFailed = computed(() => this.parents().failed);

  private readonly selectedParentId = toSignal(
    this.form.controls.parentItemId.valueChanges.pipe(map(normalizeParentId)),
    { initialValue: null },
  );

  protected readonly isSubItem = computed(() => this.selectedParentId() !== null);
  protected readonly entityLabel = computed(() => (this.isSubItem() ? 'النوع' : 'الصنف'));

  /** An item with sub-items must stay a root item of its current service. */
  protected readonly isHierarchyLocked = computed(() => {
    const target = this.target();
    return target !== null && hasSubItems(target);
  });

  /** Root items the edited item may be moved under — never itself. */
  protected readonly parentOptions = computed<SearchableSelectOption[]>(() => {
    const selfId = this.target()?.id;
    return this.parents()
      .items.filter((root) => root.id !== selfId)
      .map((root) => ({
        value: root.id,
        label: root.name,
        hint: hasSubItems(root) ? formatSubItemCount(root.subItems.length) : 'بدون أنواع',
      }));
  });

  /**
   * True when saving would give the chosen parent its first sub-item — the
   * backend then clears every laundry price set on that parent.
   */
  protected readonly willResetParentPrices = computed(() => {
    const parentId = this.selectedParentId();
    if (parentId === null || parentId === this.target()?.parentItemId) return false;
    const parent = this.parents().items.find((root) => root.id === parentId);
    return parent !== undefined && !hasSubItems(parent);
  });

  constructor() {
    this.parentsRequest$
      .pipe(
        switchMap((serviceId) =>
          serviceId > 0
            ? this.serviceItemsService.listAllByService(serviceId).pipe(
                map((items): ParentsState => ({ serviceId, items, failed: false })),
                catchError(() => of<ParentsState>({ serviceId, items: [], failed: true })),
              )
            : of<ParentsState>({ serviceId, items: [], failed: false }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        this.parents.set(state);
        this.isParentsLoading.set(false);
        this.dropForeignParent(state);
      });

    // Fires on every reset as well as on user picks, so it also covers the
    // initial load on open. A service switch reloads the candidates; a
    // parent from the previous service is then dropped by `dropForeignParent`.
    this.form.controls.serviceId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((serviceId) => this.loadParents(Number(serviceId)));

    // `allowSignalWrites` is required because `form.reset()` synchronously
    // triggers `FormErrorComponent`'s internal tick signal via `ctrl.events`
    // — without it Angular throws NG0600 and the reset silently never runs,
    // leaving the previous item's value stuck in the form.
    effect(
      () => {
        if (!this.open()) return;
        const current = this.item();
        const defaultServiceId = this.defaultServiceId();
        const defaultParentItemId = this.defaultParentItemId();
        untracked(() => {
          this.persisted.set(null);
          this.serverError.set(null);
          this.uploadError.set(null);
          this.pendingImage.set(null);
          this.phase.set(null);
          this.picker()?.reset();
          this.form.reset({
            name: current?.name ?? '',
            serviceId: current?.serviceId ?? defaultServiceId ?? 0,
            parentItemId: current ? current.parentItemId : defaultParentItemId,
          });
          this.loadServices();
        });
      },
      { allowSignalWrites: true },
    );
  }

  /** Refreshed on every open (cheap: list pages are HTTP-cached and invalidated on mutation). */
  private loadServices(): void {
    this.isServicesLoading.set(true);
    this.servicesService.listAll().subscribe({
      next: (services) => {
        this.services.set(services);
        this.isServicesLoading.set(false);
      },
      error: () => this.isServicesLoading.set(false),
    });
  }

  private loadParents(serviceId: number): void {
    this.parents.set({ serviceId, items: [], failed: false });
    this.isParentsLoading.set(serviceId > 0);
    this.parentsRequest$.next(serviceId);
  }

  protected retryParents(): void {
    this.loadParents(this.form.controls.serviceId.value);
  }

  /**
   * Clears a selected parent that isn't a root item of the loaded service
   * (left over from a service switch). Skipped when the load failed — an
   * empty candidate list then says nothing about the selection.
   */
  private dropForeignParent(state: ParentsState): void {
    if (state.failed) return;
    const parentId = normalizeParentId(this.form.controls.parentItemId.value);
    if (parentId !== null && !state.items.some((root) => root.id === parentId)) {
      this.form.controls.parentItemId.setValue(null);
    }
  }

  protected onImageChange(file: File | null): void {
    this.pendingImage.set(file);
    this.uploadError.set(null);
  }

  protected onSubmit(): void {
    if (this.isSubmitting() || this.isParentsLoading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const name = raw.name.trim();
    const serviceId = Number(raw.serviceId);
    const parentItemId = normalizeParentId(raw.parentItemId);
    const target = this.target();
    const file = this.pendingImage();
    const detailsChanged =
      !target ||
      name !== target.name ||
      serviceId !== target.serviceId ||
      parentItemId !== target.parentItemId;

    if (target && !detailsChanged && !file) {
      this.onClose();
      return;
    }

    const payload = { serviceId, parentItemId, name };
    const label = this.entityLabel();

    this.serverError.set(null);
    this.uploadError.set(null);

    saveWithImage<ServiceItem>({
      save: () => {
        if (!target) return this.serviceItemsService.create(payload);
        if (!detailsChanged) return of(target);
        return this.serviceItemsService
          .update(target.id, payload)
          .pipe(map((res) => mergeSaved(target, payload, res)));
      },
      file,
      upload: (id, image) => this.serviceItemsService.uploadImage(id, image),
      onPhase: (phase) => this.phase.set(phase),
    }).subscribe({
      next: ({ entity, image, imageError }) => {
        this.phase.set(null);

        if (image === 'failed') {
          this.persisted.set(entity);
          this.form.reset({
            name: entity.name,
            serviceId: entity.serviceId,
            parentItemId: entity.parentItemId,
          });
          this.uploadError.set(apiErrorToMessage(imageError, 'تعذّر رفع الصورة. حاول مرة أخرى.'));
          return;
        }

        if (image === 'no-id') {
          this.toast.warning(
            `تم إضافة ${label}، لكن تعذّر إرفاق الصورة تلقائيًا. افتح ${label} للتعديل ثم ارفع الصورة.`,
          );
        } else if (!target) {
          this.toast.success(`تم إضافة ${label} بنجاح`);
        } else if (image === 'uploaded' && !detailsChanged) {
          this.toast.success(`تم تحديث صورة ${label} بنجاح`);
        } else {
          this.toast.success('تم حفظ التعديلات بنجاح');
        }
        this.saved.emit(entity);
      },
      error: (err: ApiError) => {
        this.phase.set(null);
        // Hierarchy-rule violations come back as 400 with a ready Arabic message.
        this.serverError.set(apiErrorToMessage(err, `تعذّر حفظ ${label}. حاول مرة أخرى.`));
      },
    });
  }

  protected onClose(): void {
    if (this.isSubmitting()) return;
    const persisted = this.persisted();
    if (persisted) {
      this.saved.emit(persisted);
      return;
    }
    this.closed.emit();
  }
}

/** The select reports `null`/`''` when cleared; anything non-positive means "root item". */
function normalizeParentId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * The PUT response may be partial (or empty): fall back to what was sent, and
 * keep the known sub-items when the response doesn't carry them so the
 * hierarchy lock survives a partial (image-failed) save.
 */
function mergeSaved(
  target: ServiceItem,
  payload: Pick<ServiceItem, 'serviceId' | 'parentItemId' | 'name'>,
  res: ServiceItem,
): ServiceItem {
  if (!res.id) return { ...target, ...payload };
  return {
    ...target,
    ...res,
    subItems: hasSubItems(res) ? res.subItems : target.subItems,
  };
}
