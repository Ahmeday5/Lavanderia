import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { toDashboardStatistics } from '../models/dashboard-statistics.model';

const ENDPOINT = 'dashboard/statistics';

/**
 * Platform KPIs for the home page. Short cache TTL (see `cache-policy.ts`) —
 * the numbers move with every order placed from the apps; the page's refresh
 * button forces a fresh fetch.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  statistics() {
    return this.api.get<unknown>(ENDPOINT).pipe(map(toDashboardStatistics));
  }
}
