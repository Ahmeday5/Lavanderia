import { splitByQuery } from '../../../shared/components/highlight/highlight.component';
import { toGlobalSearchResult } from './global-search.model';
import { toSearchSections } from './search-sections';

const RAW = {
  totalCount: 9,
  laundries: { count: 3, items: [{ id: 1, name: 'مغسلة النور', phoneNumber: '0912345678', cityName: 'طرابلس' }] },
  customers: { count: 0, items: [] },
  drivers: { count: 1, items: [{ id: 4, fullName: 'سالم', isActive: false }] },
  orders: {
    count: 1,
    items: [{ id: 123, status: 'Delivered', customerId: 9, customerName: 'علي', laundryName: 'النور', totalPrice: 40 }],
  },
  cities: { count: 1, items: [{ id: 2, name: 'طرابلس' }] },
  services: { count: 0, items: [] },
  serviceItems: {
    count: 2,
    items: [{ id: 10, name: 'قميص كتان', serviceId: 5, serviceName: 'غسيل', parentItemId: 1, parentItemName: 'قميص' }],
  },
};

describe('toSearchSections', () => {
  const sections = toSearchSections(toGlobalSearchResult(RAW), 'النور');

  it('keeps the fixed group order and drops empty groups', () => {
    expect(sections.map((s) => s.key)).toEqual(['laundries', 'drivers', 'orders', 'cities', 'serviceItems']);
  });

  it('links "view all" to the pre-filtered list only when more matches exist than shown', () => {
    const laundries = sections.find((s) => s.key === 'laundries')!;
    expect(laundries.viewAll).toEqual({ commands: ['/laundries'], queryParams: { search: 'النور' } });
    expect(sections.find((s) => s.key === 'drivers')!.viewAll).toBeNull();
  });

  it('describes and links entries', () => {
    const laundry = sections[0].entries[0];
    expect(laundry.secondary).toBe('0912345678 · طرابلس');
    expect(laundry.link.commands).toEqual(['/laundries', 1]);

    const order = sections.find((s) => s.key === 'orders')!.entries[0];
    expect(order.primary).toBe('#123 · تم التسليم');
    expect(order.link.commands).toEqual(['/customers', 9]);

    const item = sections.find((s) => s.key === 'serviceItems')!.entries[0];
    expect(item.secondary).toBe('غسيل · نوع من: قميص');
    expect(item.link).toEqual({ commands: ['/services'], queryParams: { search: 'غسيل', open: 5 } });
  });
});

describe('splitByQuery', () => {
  it('marks every case-insensitive match of every word', () => {
    expect(splitByQuery('Clean Wash clean', 'clean')).toEqual([
      { text: 'Clean', match: true },
      { text: ' Wash ', match: false },
      { text: 'clean', match: true },
    ]);
  });

  it('matches Arabic-Indic digits and ignores a leading #', () => {
    expect(splitByQuery('#123 · 0912', '#١٢٣')).toEqual([
      { text: '#', match: false },
      { text: '123', match: true },
      { text: ' · 0912', match: false },
    ]);
  });

  it('escapes regex characters and returns the text untouched without a query', () => {
    expect(splitByQuery('a+b', '+')).toEqual([
      { text: 'a', match: false },
      { text: '+', match: true },
      { text: 'b', match: false },
    ]);
    expect(splitByQuery('abc', '  ')).toEqual([{ text: 'abc', match: false }]);
  });
});
