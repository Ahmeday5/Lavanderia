import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, merge, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { PageRefreshService } from '../../core/services/page-refresh.service';
import { RefreshButtonComponent } from '../../shared/components/refresh-button/refresh-button.component';
import { PagedResponse } from '../../core/models/api-response.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { CitiesService } from '../cities/services/cities.service';
import { ServicesService } from '../services/services/services.service';
import { AppUsersService } from '../app-users/services/app-users.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RefreshButtonComponent],
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
    // Initial load + every page refresh; `switchMap` drops a superseded load.
    merge(of(undefined), inject(PageRefreshService).refreshes$)
      .pipe(
        tap(() => this.isLoading.set(true)),
        switchMap(() => this.loadCounts()),
        takeUntilDestroyed(),
      )
      .subscribe(({ cities, services, users }) => {
        this.citiesCount.set(cities);
        this.servicesCount.set(services);
        this.usersCount.set(users);
        this.isLoading.set(false);
      });
  }

  private loadCounts() {
    // Only the totals are needed, so ask for a 1-row page and read `count`.
    // Each stat degrades to 0 on its own — one failing endpoint must not
    // blank the other cards (a bare forkJoin would error out entirely).
    const countOf = (source: Observable<PagedResponse<unknown>>) =>
      source.pipe(
        map((page) => page.count),
        catchError(() => of(0)),
      );
    const firstRow = { pageIndex: 1, pageSize: 1 };

    return forkJoin({
      cities: countOf(this.citiesService.list(firstRow)),
      services: countOf(this.servicesService.list(firstRow)),
      users: countOf(this.appUsersService.list(firstRow)),
    });
  }

  private resolveGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  }
}
