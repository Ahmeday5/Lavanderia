import { hasSubItems, isRootItem, toServiceItem } from './service-item.model';
import { formatSubItemCount } from '../utils/service-item-labels.util';

describe('toServiceItem', () => {
  it('maps a root item with nested sub-items, inheriting the service id', () => {
    const item = toServiceItem(
      {
        id: 1,
        parentItemId: null,
        name: 'قميص',
        imageUrl: null,
        subItems: [{ id: 10102, parentItemId: 1, name: 'قميص كتان', imageUrl: null, subItems: [] }],
      },
      7,
    );

    expect(item).toEqual({
      id: 1,
      serviceId: 7,
      parentItemId: null,
      name: 'قميص',
      imageUrl: null,
      subItems: [
        { id: 10102, serviceId: 7, parentItemId: 1, name: 'قميص كتان', imageUrl: null, subItems: [] },
      ],
    });
    expect(isRootItem(item)).toBeTrue();
    expect(hasSubItems(item)).toBeTrue();
    expect(isRootItem(item.subItems[0])).toBeFalse();
  });

  it('prefers the row serviceId over the caller fallback', () => {
    expect(toServiceItem({ id: 3, serviceId: 2 }, 9).serviceId).toBe(2);
  });

  it('degrades missing or malformed hierarchy fields to a root item without sub-items', () => {
    const item = toServiceItem({ id: 5, name: 'بنطلون', parentItemId: 0, subItems: 'oops' });
    expect(item.parentItemId).toBeNull();
    expect(item.subItems).toEqual([]);
    expect(toServiceItem(null).subItems).toEqual([]);
  });
});

describe('formatSubItemCount', () => {
  it('follows Arabic number agreement', () => {
    expect(formatSubItemCount(0)).toBe('بدون أنواع');
    expect(formatSubItemCount(1)).toBe('نوع واحد');
    expect(formatSubItemCount(2)).toBe('نوعان');
    expect(formatSubItemCount(3)).toBe('3 أنواع');
    expect(formatSubItemCount(10)).toBe('10 أنواع');
    expect(formatSubItemCount(11)).toBe('11 نوعًا');
  });
});
