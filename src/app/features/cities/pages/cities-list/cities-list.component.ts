import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { createPagedList } from '../../../../core/utils/paged-list.util';
import { withLocalSearch } from '../../../../core/utils/local-search.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { CitiesService } from '../../services/cities.service';
import { City } from '../../models/city.model';
import { CityFormModalComponent } from '../../components/city-form-modal/city-form-modal.component';

@Component({
  selector: 'app-cities-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CityFormModalComponent, PaginationComponent, RefreshButtonComponent],
  templateUrl: './cities-list.component.html',
  styleUrl: './cities-list.component.scss',
})
export class CitiesListComponent {
  private readonly citiesService = inject(CitiesService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly list = createPagedList(
    withLocalSearch((query) => this.citiesService.list(query), (city) => [city.name]),
  );

  protected readonly isModalOpen = signal(false);
  protected readonly editingCity = signal<City | null>(null);

  protected openCreateModal(): void {
    this.editingCity.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditModal(city: City): void {
    this.editingCity.set(city);
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

  protected async onDelete(city: City): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'حذف المدينة',
      message: `هل أنت متأكد من حذف مدينة "${city.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      type: 'danger',
    });
    if (!confirmed) return;

    this.citiesService.delete(city.id).subscribe({
      next: () => {
        this.toast.success('تم حذف المدينة بنجاح');
        this.list.reload();
      },
      error: (err: ApiError) => this.toast.error(err.message),
    });
  }
}
