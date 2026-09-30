import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, merge, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../../core/auth/services/auth.service';
import { ApiError } from '../../core/models/api-response.model';
import { PageRefreshService } from '../../core/services/page-refresh.service';
import { RefreshButtonComponent } from '../../shared/components/refresh-button/refresh-button.component';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { formatInteger, formatMoney } from '../../shared/utils/number-format.util';
import { AccountsHealthCardComponent } from './components/accounts-health-card/accounts-health-card.component';
import { KpiCardComponent, Kpi } from './components/kpi-card/kpi-card.component';
import { FinanceCardComponent } from './components/finance-card/finance-card.component';
import { OrdersDistributionCardComponent } from './components/orders-distribution-card/orders-distribution-card.component';
import { PerformanceCardComponent } from './components/performance-card/performance-card.component';
import { StatusBreakdownCardComponent } from './components/status-breakdown-card/status-breakdown-card.component';
import { buildDashboardInsights } from './models/dashboard-insights';
import { DashboardStatistics } from './models/dashboard-statistics.model';
import { DashboardService } from './services/dashboard.service';

const TODAY_FMT = new Intl.DateTimeFormat('ar-LY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const SKELETON_CARDS = [1, 2, 3, 4, 5];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RefreshButtonComponent,
    CountUpDirective,
    KpiCardComponent,
    OrdersDistributionCardComponent,
    StatusBreakdownCardComponent,
    PerformanceCardComponent,
    FinanceCardComponent,
    AccountsHealthCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  protected readonly stats = signal<DashboardStatistics | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<ApiError | null>(null);

  /** Everything the loaded view draws; `null` until the first successful load. */
  protected readonly insights = computed(() => {
    const stats = this.stats();
    return stats ? { ...buildDashboardInsights(stats), stats } : null;
  });

  protected readonly kpis = computed<Kpi[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      {
        key: 'orders',
        label: 'إجمالي الطلبات',
        icon: 'fa-basket-shopping',
        tone: 'blue',
        value: s.totalOrders,
        format: formatInteger,
        note: s.ordersToday > 0 ? `+${formatInteger(s.ordersToday)} طلب اليوم` : 'لا طلبات جديدة اليوم',
        noteAlert: false,
        route: null,
      },
      {
        key: 'revenue',
        label: 'إجمالي الإيرادات',
        icon: 'fa-sack-dollar',
        tone: 'teal',
        value: s.totalRevenue,
        format: formatMoney,
        note: `${formatMoney(s.revenueToday)} اليوم`,
        noteAlert: false,
        route: null,
      },
      {
        key: 'customers',
        label: 'العملاء',
        icon: 'fa-users',
        tone: 'purple',
        value: s.totalCustomers,
        format: formatInteger,
        note: s.bannedCustomers > 0 ? `${formatInteger(s.bannedCustomers)} محظور` : 'لا يوجد محظورون',
        noteAlert: s.bannedCustomers > 0,
        route: '/customers',
      },
      {
        key: 'laundries',
        label: 'المغاسل',
        icon: 'fa-store',
        tone: 'pink',
        value: s.totalLaundries,
        format: formatInteger,
        note: s.bannedLaundries > 0 ? `${formatInteger(s.bannedLaundries)} محظورة` : 'جميعها نشطة',
        noteAlert: s.bannedLaundries > 0,
        route: '/laundries',
      },
      {
        key: 'drivers',
        label: 'السائقون',
        icon: 'fa-motorcycle',
        tone: 'amber',
        value: s.totalDrivers,
        format: formatInteger,
        note:
          s.pendingDriverApprovals > 0
            ? `${formatInteger(s.pendingDriverApprovals)} بانتظار الموافقة`
            : 'لا طلبات انضمام معلّقة',
        noteAlert: s.pendingDriverApprovals > 0,
        route: '/drivers',
      },
    ];
  });

  protected readonly greeting = resolveGreeting();
  protected readonly today = TODAY_FMT.format(new Date());
  protected readonly skeletonCards = SKELETON_CARDS;

  protected readonly int = formatInteger;
  protected readonly money = formatMoney;

  private readonly retry$ = new Subject<void>();

  constructor() {
    // Initial load, page-refresh button, and manual retry — `switchMap` drops
    // a superseded load. Last good numbers stay on screen while refetching.
    merge(of(undefined), inject(PageRefreshService).refreshes$, this.retry$)
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.dashboardService.statistics().pipe(
            map((stats) => ({ ok: true as const, stats })),
            catchError((err: ApiError) => of({ ok: false as const, err })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.ok) this.stats.set(result.stats);
        else this.error.set(result.err);
        this.isLoading.set(false);
      });
  }

  protected retry(): void {
    this.retry$.next();
  }
}

function resolveGreeting(): string {
  return new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
}
