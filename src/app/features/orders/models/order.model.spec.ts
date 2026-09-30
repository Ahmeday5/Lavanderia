import { timelineIndexOf, toOrderStatus } from './order-status.model';
import { toOrder } from './order.model';
import { ownerTypeFromSlug, parseOwnerId } from './order-owner.model';

describe('toOrderStatus', () => {
  it('accepts enum names case-insensitively', () => {
    expect(toOrderStatus('Ready')).toBe('Ready');
    expect(toOrderStatus('outfordelivery')).toBe('OutForDelivery');
  });

  it('maps numeric enum values (legacy rows send "0")', () => {
    expect(toOrderStatus('0')).toBe('New');
    expect(toOrderStatus(8)).toBe('Rejected');
  });

  it('returns null for anything unknown', () => {
    expect(toOrderStatus('42')).toBeNull();
    expect(toOrderStatus('Shipped')).toBeNull();
    expect(toOrderStatus(null)).toBeNull();
  });

  it('places the adjustment detour on the laundry step', () => {
    expect(timelineIndexOf('AdjustmentPendingApproval')).toBe(timelineIndexOf('AtLaundryPendingMatch'));
    expect(timelineIndexOf('Rejected')).toBe(-1);
  });
});

describe('toOrder', () => {
  it('maps a full API row', () => {
    const order = toOrder({
      id: 6,
      status: 'Ready',
      deliveryLatitude: 3.33,
      deliveryLongitude: 3.22,
      totalPrice: 27,
      items: [
        { id: 9, serviceItemName: 'قميص', price: 15, quantity: 1, lineTotal: 15, isReturned: false },
        { id: 10, serviceItemName: 'بنطلون', price: 12, quantity: 2, lineTotal: 24, isReturned: false },
      ],
      pickupTrip: { id: 2, type: 'Pickup', driverId: 2, driverName: 'Zeyad', isConfirmed: true, photoUrls: ['a.jpg', null] },
      dropoffTrip: { id: 3, type: 'Dropoff', driverId: null, isConfirmed: false, photoUrls: [] },
      pendingAdjustment: null,
    });

    expect(order.status).toBe('Ready');
    expect(order.piecesCount).toBe(3);
    expect(order.deliveryLocation).toEqual({ lat: 3.33, lng: 3.22 });
    expect(order.pickupTrip?.state).toBe('confirmed');
    expect(order.pickupTrip?.photoUrls).toEqual(['a.jpg']);
    expect(order.dropoffTrip?.state).toBe('unassigned');
    expect(order.hasPendingAdjustment).toBeFalse();
  });

  it('degrades missing data to safe defaults', () => {
    const order = toOrder({ id: 1, deliveryLatitude: 0, deliveryLongitude: 0 });
    expect(order.deliveryLocation).toBeNull();
    expect(order.items).toEqual([]);
    expect(order.pickupTrip).toBeNull();
    expect(order.status).toBeNull();
  });
});

describe('order owner route params', () => {
  it('resolves slugs and ids', () => {
    expect(ownerTypeFromSlug('laundry')).toBe('Laundry');
    expect(ownerTypeFromSlug('Driver')).toBe('Driver');
    expect(ownerTypeFromSlug('admin')).toBeNull();
    expect(parseOwnerId('12')).toBe(12);
    expect(parseOwnerId('0')).toBeNull();
    expect(parseOwnerId('1.5')).toBeNull();
  });
});
