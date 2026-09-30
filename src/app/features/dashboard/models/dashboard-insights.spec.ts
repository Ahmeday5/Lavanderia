import { buildDashboardInsights } from './dashboard-insights';
import { toDashboardStatistics } from './dashboard-statistics.model';

// The sample payload returned by `GET dashboard/statistics`.
const SAMPLE = {
  totalCustomers: 7,
  totalLaundries: 3,
  totalDrivers: 2,
  pendingDriverApprovals: 0,
  bannedCustomers: 0,
  bannedLaundries: 0,
  totalOrders: 6,
  ordersToday: 2,
  ordersByStatus: {
    New: 0,
    AwaitingPickup: 1,
    AtLaundryPendingMatch: 0,
    AdjustmentPendingApproval: 0,
    InProgress: 0,
    Ready: 1,
    OutForDelivery: 0,
    Delivered: 0,
    Rejected: 1,
  },
  totalRevenue: 0,
  revenueToday: 0,
  totalDriverWalletBalance: 0,
  totalLaundryWalletBalance: 27,
};

describe('buildDashboardInsights', () => {
  const insights = buildDashboardInsights(toDashboardStatistics(SAMPLE));
  const phase = (key: string) => insights.phases.find((p) => p.key === key);

  it('groups statuses into lifecycle phases', () => {
    expect(phase('pending')?.value).toBe(1);
    expect(phase('active')?.value).toBe(1);
    expect(phase('completed')?.value).toBe(0);
    expect(phase('rejected')?.value).toBe(1);
  });

  it('surfaces orders the status buckets do not cover as "unclassified"', () => {
    expect(phase('unclassified')?.value).toBe(3);
    const shares = insights.phases.reduce((sum, p) => sum + p.share, 0);
    expect(shares).toBeCloseTo(1, 5);
  });

  it('computes rates against total orders', () => {
    expect(insights.rejectionRate).toBeCloseTo(1 / 6, 5);
    expect(insights.completionRate).toBe(0);
    expect(insights.openOrders).toBe(2);
  });

  it('splits wallet balances without dividing by zero', () => {
    expect(insights.walletsTotal).toBe(27);
    expect(insights.wallets.find((w) => w.key === 'laundries')?.share).toBe(1);
    expect(insights.wallets.find((w) => w.key === 'drivers')?.share).toBe(0);
  });

  it('tolerates an empty payload', () => {
    const empty = buildDashboardInsights(toDashboardStatistics(null));
    expect(empty.phases.every((p) => p.value === 0 && p.share === 0)).toBeTrue();
    expect(empty.audiences.every((a) => a.healthyShare === 1)).toBeTrue();
  });
});
