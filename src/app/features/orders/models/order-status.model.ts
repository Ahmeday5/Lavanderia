/**
 * Order lifecycle — the single source of truth for status names, their
 * Arabic copy, icons and grouping. Everything that shows a status (badges,
 * filters, the dashboard charts) reads from here, so a new backend status is
 * one entry, not a hunt across templates.
 *
 * Order matters: it is the backend enum order (numeric statuses are indices
 * into it) and the order statuses are listed in in the UI.
 */
export const ORDER_STATUSES = [
  'New',
  'AwaitingPickup',
  'AtLaundryPendingMatch',
  'AdjustmentPendingApproval',
  'InProgress',
  'Ready',
  'OutForDelivery',
  'Delivered',
  'Rejected',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Coarse lifecycle phase, used wherever nine statuses would be too many to
 * read at once (donut segments, status tones). Four phases keep charts within
 * a colorblind-safe palette.
 */
export type OrderPhase = 'pending' | 'active' | 'completed' | 'rejected';

export interface OrderPhaseMeta {
  label: string;
  /** Mark color for charts (validated palette, see dashboard charts). */
  color: string;
  /** Darker ink for text on the tinted background (AA contrast). */
  ink: string;
  /** Tinted chip / badge background. */
  tint: string;
  icon: string;
}

export const ORDER_PHASES: Readonly<Record<OrderPhase, OrderPhaseMeta>> = {
  pending: { label: 'بانتظار الإجراء', color: '#eda100', ink: '#8a5a00', tint: 'rgba(237, 161, 0, 0.14)', icon: 'fa-hourglass-half' },
  active: { label: 'قيد التشغيل', color: '#2a78d6', ink: '#1c5cab', tint: 'rgba(42, 120, 214, 0.12)', icon: 'fa-gears' },
  completed: { label: 'مكتملة', color: '#1baf7a', ink: '#0b7a53', tint: 'rgba(27, 175, 122, 0.13)', icon: 'fa-circle-check' },
  rejected: { label: 'مرفوضة', color: '#e34948', ink: '#b42828', tint: 'rgba(227, 73, 72, 0.12)', icon: 'fa-circle-xmark' },
};

/** Phases in display order. */
export const ORDER_PHASE_KEYS: readonly OrderPhase[] = ['pending', 'active', 'completed', 'rejected'];

export interface OrderStatusMeta {
  label: string;
  /** One-line explanation, shown as a tooltip / helper text. */
  hint: string;
  icon: string;
  phase: OrderPhase;
}

export const ORDER_STATUS_META: Readonly<Record<OrderStatus, OrderStatusMeta>> = {
  New: { label: 'جديد', hint: 'طلب جديد لم تبدأ معالجته بعد', icon: 'fa-circle-plus', phase: 'pending' },
  AwaitingPickup: { label: 'بانتظار الاستلام', hint: 'بانتظار وصول السائق لاستلام الملابس من العميل', icon: 'fa-hourglass-half', phase: 'pending' },
  AtLaundryPendingMatch: { label: 'في المغسلة – بانتظار المطابقة', hint: 'وصلت الملابس للمغسلة وتنتظر مطابقة الأصناف', icon: 'fa-clipboard-list', phase: 'pending' },
  AdjustmentPendingApproval: { label: 'تعديل بانتظار الموافقة', hint: 'اقترحت المغسلة تعديلًا على الطلب وينتظر موافقة العميل', icon: 'fa-scale-balanced', phase: 'pending' },
  InProgress: { label: 'قيد التنفيذ', hint: 'المغسلة تعمل على الطلب حاليًا', icon: 'fa-soap', phase: 'active' },
  Ready: { label: 'جاهز', hint: 'الطلب جاهز وينتظر سائق التوصيل', icon: 'fa-box', phase: 'active' },
  OutForDelivery: { label: 'جارٍ التوصيل', hint: 'السائق في الطريق لتسليم الطلب للعميل', icon: 'fa-truck-fast', phase: 'active' },
  Delivered: { label: 'تم التسليم', hint: 'تم تسليم الطلب للعميل بنجاح', icon: 'fa-house-circle-check', phase: 'completed' },
  Rejected: { label: 'مرفوض', hint: 'تم رفض الطلب', icon: 'fa-ban', phase: 'rejected' },
};

/**
 * The "happy path" a delivered order walks through, for progress trackers.
 * `AdjustmentPendingApproval` is a detour at the laundry step and `Rejected`
 * a terminal exit, so neither is a step of its own.
 */
export const ORDER_TIMELINE: readonly OrderStatus[] = [
  'New',
  'AwaitingPickup',
  'AtLaundryPendingMatch',
  'InProgress',
  'Ready',
  'OutForDelivery',
  'Delivered',
];

/** Which timeline step a status sits on (`-1` for statuses off the path). */
export function timelineIndexOf(status: OrderStatus): number {
  if (status === 'AdjustmentPendingApproval') return ORDER_TIMELINE.indexOf('AtLaundryPendingMatch');
  return ORDER_TIMELINE.indexOf(status);
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * Tolerant status parser for API payloads: accepts the enum name in any case,
 * or its numeric index (some legacy rows serialize the raw enum value, e.g.
 * `"0"` for `New`). Anything else → `null` ("unknown"), never a wrong status.
 */
export function toOrderStatus(value: unknown): OrderStatus | null {
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
    return ORDER_STATUSES[Number(value)] ?? null;
  }
  if (typeof value !== 'string') return null;
  const needle = value.trim().toLowerCase();
  return ORDER_STATUSES.find((s) => s.toLowerCase() === needle) ?? null;
}

export function phaseOf(status: OrderStatus): OrderPhaseMeta {
  return ORDER_PHASES[ORDER_STATUS_META[status].phase];
}
