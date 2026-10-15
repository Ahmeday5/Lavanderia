import { toAccountListParams } from './account.model';
import { customerBadges } from '../../customers/models/customer.model';
import { driverBadges, isLicenseExpired, toDriverDetails } from '../../drivers/models/driver.model';
import { laundryBadges, toLaundryDetails } from '../../laundries/models/laundry.model';

describe('toAccountListParams', () => {
  it('maps the query, converts Arabic digits and caps the page size at 50', () => {
    expect(toAccountListParams({ pageIndex: 2, pageSize: 100, search: ' ٠٩١ ', includeDeleted: true })).toEqual({
      search: '091',
      PageIndex: 2,
      PageSize: 50,
      includeDeleted: true,
    });
  });

  it('omits includeDeleted unless requested', () => {
    expect(toAccountListParams({ includeDeleted: false })['includeDeleted']).toBeUndefined();
  });
});

describe('account badges', () => {
  it('shows only "deleted" for a deleted account, whatever its other flags', () => {
    expect(laundryBadges({ isBanned: true, isDeleted: true }).map((b) => b.label)).toEqual(['محذوف']);
    expect(customerBadges({ isBanned: false, isDeleted: true }).map((b) => b.label)).toEqual(['محذوف']);
    expect(driverBadges({ isActive: true, isAvailable: true, isDeleted: true }).map((b) => b.label)).toEqual(['محذوف']);
  });

  it('describes drivers by approval, then availability', () => {
    expect(driverBadges({ isActive: false, isAvailable: true, isDeleted: false }).map((b) => b.label)).toEqual([
      'بانتظار الموافقة / موقوف',
    ]);
    expect(driverBadges({ isActive: true, isAvailable: false, isDeleted: false }).map((b) => b.label)).toEqual([
      'مفعل',
      'غير متاح',
    ]);
  });
});

describe('account details mappers', () => {
  it('maps a laundry, keeping missing coordinates as null (not 0)', () => {
    const laundry = toLaundryDetails({ id: 7, name: 'نظيف', cityId: '2', latitude: null, baseDeliveryFee: 5 });
    expect(laundry.id).toBe(7);
    expect(laundry.cityId).toBe(2);
    expect(laundry.latitude).toBeNull();
    expect(laundry.baseDeliveryFee).toBe(5);
    expect(laundry.isDeleted).toBeFalse();
  });

  it('maps a driver: date-only dates, vehicle enum, image URLs', () => {
    const driver = toDriverDetails({
      id: 3,
      licenseExpiryDate: '2025-01-31T00:00:00',
      vehicleType: 'motorcycle',
      vehicleYear: 2019,
      nationalIdFrontImageUrl: 'https://cdn/x.jpg',
    });
    expect(driver.licenseExpiryDate).toBe('2025-01-31');
    expect(driver.vehicleType).toBe('Motorcycle');
    expect(driver.vehicleYear).toBe(2019);
    expect(driver.images.nationalIdFrontImage).toBe('https://cdn/x.jpg');
    expect(driver.images.vehicleImage).toBeNull();
  });

  it('flags a licence that expired before today', () => {
    expect(isLicenseExpired({ licenseExpiryDate: '2026-10-14' }, '2026-10-15')).toBeTrue();
    expect(isLicenseExpired({ licenseExpiryDate: '2026-10-15' }, '2026-10-15')).toBeFalse();
    expect(isLicenseExpired({ licenseExpiryDate: null }, '2026-10-15')).toBeFalse();
  });
});
