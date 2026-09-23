import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { AppUsersService } from '../../services/app-users.service';
import { AppUser } from '../../models/app-user.model';
import { AppUserFormModalComponent } from '../../components/app-user-form-modal/app-user-form-modal.component';

@Component({
  selector: 'app-app-users-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AppUserFormModalComponent],
  templateUrl: './app-users-list.component.html',
  styleUrl: './app-users-list.component.scss',
})
export class AppUsersListComponent {
  private readonly appUsersService = inject(AppUsersService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly users = signal<AppUser[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly isModalOpen = signal(false);
  protected readonly editingUser = signal<AppUser | null>(null);

  protected readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  protected readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.users();
    if (!term) return all;
    return all.filter((u) => u.email.toLowerCase().includes(term));
  });

  constructor() {
    this.loadUsers();
  }

  protected loadUsers(): void {
    this.isLoading.set(true);
    this.appUsersService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected initials(email: string): string {
    return email.trim().charAt(0).toUpperCase() || '?';
  }

  protected isSelf(user: AppUser): boolean {
    return user.id === this.currentUserId();
  }

  protected openCreateModal(): void {
    this.editingUser.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditModal(user: AppUser): void {
    this.editingUser.set(user);
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected onSaved(user: AppUser): void {
    this.isModalOpen.set(false);
    const current = this.editingUser();
    this.users.update((list) =>
      current
        ? list.map((u) => (u.id === user.id ? user : u))
        : [...list, user],
    );
  }

  protected async onDelete(user: AppUser): Promise<void> {
    if (this.isSelf(user)) {
      this.toast.warning('لا يمكنك حذف حسابك الخاص أثناء تسجيل الدخول به');
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'حذف المستخدم',
      message: `هل أنت متأكد من حذف المستخدم "${user.email}"؟ سيفقد هذا المستخدم صلاحية الوصول للوحة التحكم فورًا.`,
      confirmText: 'حذف',
      type: 'danger',
    });
    if (!confirmed) return;

    this.appUsersService.delete(user.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== user.id));
        this.toast.success('تم حذف المستخدم بنجاح');
      },
      error: (err: ApiError) => this.toast.error(err.message),
    });
  }
}
