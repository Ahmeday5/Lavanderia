import { asNumber, asRecord } from '../../../core/utils/coerce.util';
import { ORDER_STATUSES, OrderStatus } from '../../orders/models/order-status.model';

/** Platform-wide KPIs behind the dashboard home (`GET dashboard/statistics`). */
export interface DashboardStatistics {
  totalCustomers: number;
  totalLaundries: number;
  totalDrivers: number;
  pendingDriverApprovals: number;
  bannedCustomers: number;
  bannedLaundries: number;
  totalOrders: number;
  ordersToday: number;
  /** Always has every known status (missing ones → 0). */
  ordersByStatus: Record<OrderStatus, number>;
  totalRevenue: number;
  revenueToday: number;
  totalDriverWalletBalance: number;
  totalLaundryWalletBalance: number;
}

export function toDashboardStatistics(raw: unknown): DashboardStatistics {
  const r = asRecord(raw);
  const byStatus = asRecord(r['ordersByStatus']);

  return {
    totalCustomers: asNumber(r['totalCustomers']),
    totalLaundries: asNumber(r['totalLaundries']),
    totalDrivers: asNumber(r['totalDrivers']),
    pendingDriverApprovals: asNumber(r['pendingDriverApprovals']),
    bannedCustomers: asNumber(r['bannedCustomers']),
    bannedLaundries: asNumber(r['bannedLaundries']),
    totalOrders: asNumber(r['totalOrders']),
    ordersToday: asNumber(r['ordersToday']),
    ordersByStatus: Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, asNumber(byStatus[status])]),
    ) as Record<OrderStatus, number>,
    totalRevenue: asNumber(r['totalRevenue']),
    revenueToday: asNumber(r['revenueToday']),
    totalDriverWalletBalance: asNumber(r['totalDriverWalletBalance']),
    totalLaundryWalletBalance: asNumber(r['totalLaundryWalletBalance']),
  };
}
