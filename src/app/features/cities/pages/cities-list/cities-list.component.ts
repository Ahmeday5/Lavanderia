import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { CitiesService } from '../../services/cities.service';
import { City } from '../../models/city.model';
import { CityFormModalComponent } from '../../components/city-form-modal/city-form-modal.component';

@Component({
  selector: 'app-cities-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CityFormModalComponent],
  templateUrl: './cities-list.component.html',
  styleUrl: './cities-list.component.scss',
})
export class CitiesListComponent {
  private readonly citiesService = inject(CitiesService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly isLoading = signal(true);
  protected readonly cities = signal<City[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly isModalOpen = signal(false);
  protected readonly editingCity = signal<City | null>(null);

  protected readonly filteredCities = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.cities();
    if (!term) return all;
    return all.filter((c) => c.name.toLowerCase().includes(term));
  });

  constructor() {
    this.loadCities();
  }

  protected loadCities(): void {
    this.isLoading.set(true);
    this.citiesService.list().subscribe({
      next: (cities) => {
        this.cities.set(cities);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

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

  protected onSaved(city: City): void {
    this.isModalOpen.set(false);
    const current = this.editingCity();
    this.cities.update((list) =>
      current
        ? list.map((c) => (c.id === city.id ? city : c))
        : [...list, city],
    );
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
        this.cities.update((list) => list.filter((c) => c.id !== city.id));
        this.toast.success('تم حذف المدينة بنجاح');
      },
      error: (err: ApiError) => this.toast.error(err.message),
    });
  }
}
