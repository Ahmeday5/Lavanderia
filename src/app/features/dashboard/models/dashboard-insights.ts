import { ratioOf } from '../../../shared/utils/number-format.util';
import {
  ORDER_PHASES,
  ORDER_PHASE_KEYS,
  ORDER_STATUSES,
  ORDER_STATUS_META,
  OrderPhase,
  OrderStatus,
  phaseOf,
} from '../../orders/models/order-status.model';
import { DashboardStatistics } from './dashboard-statistics.model';

/**
 * Pure derivations from `DashboardStatistics` into what the dashboard draws.
 * No Angular here — the component just wraps `buildDashboardInsights` in a
 * `computed`, so every number on the page is testable in isolation.
 */

/** Orders the stats endpoint counts in `totalOrders` but not in any status bucket. */
export const UNCLASSIFIED = {
  key: 'unclassified',
  label: 'غير مصنّفة',
  color: '#9a9994',
  icon: 'fa-circle-question',
} as const;

export interface PhaseSlice {
  key: OrderPhase | typeof UNCLASSIFIED.key;
  label: string;
  icon: string;
  color: string;
  value: number;
  /** Share of all orders, 0‥1. */
  share: number;
}

export interface StatusRow {
  status: OrderStatus;
  label: string;
  hint: string;
  icon: string;
  color: string;
  value: number;
  share: number;
  /** Bar length relative to the busiest status, 0‥1. */
  barRatio: number;
}

export interface WalletSlice {
  key: 'laundries' | 'drivers';
  label: string;
  icon: string;
  color: string;
  value: number;
  share: number;
}

export interface AudienceHealth {
  key: 'customers' | 'laundries' | 'drivers';
  label: string;
  icon: string;
  route: string;
  total: number;
  /** Accounts needing attention (banned, or awaiting approval for drivers). */
  flagged: number;
  flaggedLabel: string;
  /** Share of accounts in good standing, 0‥1. */
  healthyShare: number;
}

export interface DashboardInsights {
  phases: PhaseSlice[];
  statusRows: StatusRow[];
  /** Orders not yet delivered or rejected. */
  openOrders: number;
  completionRate: number;
  rejectionRate: number;
  wallets: WalletSlice[];
  walletsTotal: number;
  audiences: AudienceHealth[];
}

export function buildDashboardInsights(s: DashboardStatistics): DashboardInsights {
  const byStatus = s.ordersByStatus;
  const classified = ORDER_STATUSES.reduce((sum, status) => sum + byStatus[status], 0);
  // The API's total can exceed the buckets (legacy rows with raw enum values);
  // the larger of the two is the honest denominator.
  const totalOrders = Math.max(s.totalOrders, classified);
  const unclassified = totalOrders - classified;

  const phaseTotals = ORDER_PHASE_KEYS.reduce(
    (acc, phase) => ({ ...acc, [phase]: 0 }),
    {} as Record<OrderPhase, number>,
  );
  for (const status of ORDER_STATUSES) phaseTotals[ORDER_STATUS_META[status].phase] += byStatus[status];

  const phases: PhaseSlice[] = ORDER_PHASE_KEYS.map((key) => ({
    key,
    label: ORDER_PHASES[key].label,
    icon: ORDER_PHASES[key].icon,
    color: ORDER_PHASES[key].color,
    value: phaseTotals[key],
    share: ratioOf(phaseTotals[key], totalOrders),
  }));
  if (unclassified > 0) {
    phases.push({ ...UNCLASSIFIED, value: unclassified, share: ratioOf(unclassified, totalOrders) });
  }

  const busiest = Math.max(0, ...ORDER_STATUSES.map((status) => byStatus[status]));
  const statusRows: StatusRow[] = ORDER_STATUSES.map((status) => ({
    status,
    label: ORDER_STATUS_META[status].label,
    hint: ORDER_STATUS_META[status].hint,
    icon: ORDER_STATUS_META[status].icon,
    color: phaseOf(status).color,
    value: byStatus[status],
    share: ratioOf(byStatus[status], totalOrders),
    barRatio: ratioOf(byStatus[status], busiest),
  }));

  const walletsTotal = s.totalLaundryWalletBalance + s.totalDriverWalletBalance;
  const wallets: WalletSlice[] = [
    {
      key: 'laundries',
      label: 'محافظ المغاسل',
      icon: 'fa-store',
      color: '#2a78d6',
      value: s.totalLaundryWalletBalance,
      share: ratioOf(s.totalLaundryWalletBalance, walletsTotal),
    },
    {
      key: 'drivers',
      label: 'محافظ السائقين',
      icon: 'fa-motorcycle',
      color: '#eb6834',
      value: s.totalDriverWalletBalance,
      share: ratioOf(s.totalDriverWalletBalance, walletsTotal),
    },
  ];

  const audiences: AudienceHealth[] = [
    {
      key: 'customers',
      label: 'العملاء',
      icon: 'fa-users',
      route: '/customers',
      total: s.totalCustomers,
      flagged: s.bannedCustomers,
      flaggedLabel: 'محظور',
      healthyShare: 1 - ratioOf(s.bannedCustomers, s.totalCustomers),
    },
    {
      key: 'laundries',
      label: 'المغاسل',
      icon: 'fa-store',
      route: '/laundries',
      total: s.totalLaundries,
      flagged: s.bannedLaundries,
      flaggedLabel: 'محظورة',
      healthyShare: 1 - ratioOf(s.bannedLaundries, s.totalLaundries),
    },
    {
      key: 'drivers',
      label: 'السائقون',
      icon: 'fa-motorcycle',
      route: '/drivers',
      total: s.totalDrivers,
      flagged: s.pendingDriverApprovals,
      flaggedLabel: 'بانتظار الموافقة',
      healthyShare: 1 - ratioOf(s.pendingDriverApprovals, s.totalDrivers),
    },
  ];

  return {
    phases,
    statusRows,
    openOrders: phaseTotals.pending + phaseTotals.active,
    completionRate: ratioOf(byStatus.Delivered, totalOrders),
    rejectionRate: ratioOf(byStatus.Rejected, totalOrders),
    wallets,
    walletsTotal,
    audiences,
  };
}
