import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { CitiesService } from '../cities/services/cities.service';
import { ServicesService } from '../services/services/services.service';
import { AppUsersService } from '../app-users/services/app-users.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly citiesService = inject(CitiesService);
  private readonly servicesService = inject(ServicesService);
  private readonly appUsersService = inject(AppUsersService);

  protected readonly isLoading = signal(true);
  protected readonly citiesCount = signal(0);
  protected readonly servicesCount = signal(0);
  protected readonly usersCount = signal(0);

  protected readonly greeting = this.resolveGreeting();

  constructor() {
    forkJoin({
      cities: this.citiesService.list(),
      services: this.servicesService.list(),
      users: this.appUsersService.list(),
    }).subscribe({
      next: ({ cities, services, users }) => {
        this.citiesCount.set(cities.length);
        this.servicesCount.set(services.length);
        this.usersCount.set(users.length);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private resolveGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  }
}
