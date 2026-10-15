import {
  asBoolean,
  asNullableNumber,
  asNullableString,
  asNumber,
  asRecord,
  asString,
} from '../../../core/utils/coerce.util';
import { todayIsoDate } from '../../../shared/utils/date-iso.util';
import { AccountBadge, DELETED_BADGE } from '../../accounts/models/account.model';

/** A delivery driver — a row of `GET dashboard/drivers` (`DriverAccountDto`). */
export interface Driver {
  id: number;
  fullName: string;
  phoneNumber: string;
  cityName: string | null;
  phoneNumberConfirmed: boolean;
  /** Admin-controlled: an inactive driver (pending approval or suspended) can't receive orders. */
  isActive: boolean;
  /** Driver-controlled: currently online / accepting orders. */
  isAvailable: boolean;
  isDeleted: boolean;
  createdAt: string | null;
}

// ── vehicles ──

export const VEHICLE_TYPES = ['Car', 'Van', 'Scooter', 'Motorcycle'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_META: Readonly<Record<VehicleType, { label: string; icon: string }>> = {
  Car: { label: 'سيارة', icon: 'fa-car-side' },
  Van: { label: 'فان', icon: 'fa-van-shuttle' },
  Scooter: { label: 'سكوتر', icon: 'fa-motorcycle' },
  Motorcycle: { label: 'موتوسيكل', icon: 'fa-motorcycle' },
};

export function toVehicleType(value: unknown): VehicleType | null {
  if (typeof value !== 'string') return null;
  const needle = value.trim().toLowerCase();
  return VEHICLE_TYPES.find((type) => type.toLowerCase() === needle) ?? null;
}

// ── documents ──

/** The six images a driver account carries — one multipart field each. */
export const DRIVER_IMAGE_FIELDS = [
  'profileImage',
  'nationalIdFrontImage',
  'nationalIdBackImage',
  'licenseFrontImage',
  'licenseBackImage',
  'vehicleImage',
] as const;
export type DriverImageField = (typeof DRIVER_IMAGE_FIELDS)[number];

export const DRIVER_IMAGE_LABELS: Readonly<Record<DriverImageField, string>> = {
  profileImage: 'الصورة الشخصية',
  nationalIdFrontImage: 'البطاقة — الوجه الأمامي',
  nationalIdBackImage: 'البطاقة — الوجه الخلفي',
  licenseFrontImage: 'الرخصة — الوجه الأمامي',
  licenseBackImage: 'الرخصة — الوجه الخلفي',
  vehicleImage: 'صورة المركبة',
};

/** `GET dashboard/drivers/:id` (`DriverAccountDetailsDto`). */
export interface DriverDetails extends Driver {
  nationalId: string;
  /** `YYYY-MM-DD`, `null` when unknown. */
  dateOfBirth: string | null;
  cityId: number;
  address: string;
  licenseIssueDate: string | null;
  licenseExpiryDate: string | null;
  vehicleType: VehicleType | null;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number | null;
  vehicleColor: string;
  plateNumber: string;
  walletBalance: number;
  deletedAt: string | null;
  /** Current image URL per document field. */
  images: Readonly<Record<DriverImageField, string | null>>;
}

/**
 * Body of `POST` / `PUT dashboard/drivers` (multipart). Only the images that
 * changed are sent; `password: null` keeps the current one. `isActive` is a
 * create-time choice only — the server ignores it on edit.
 */
export interface SaveDriverRequest {
  fullName: string;
  /** Libyan mobile — the account's login. */
  phoneNumber: string;
  password: string | null;
  nationalId: string;
  dateOfBirth: string | null;
  cityId: number;
  address: string;
  licenseIssueDate: string | null;
  licenseExpiryDate: string | null;
  vehicleType: VehicleType;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number | null;
  vehicleColor: string | null;
  plateNumber: string;
  images: Partial<Record<DriverImageField, File>>;
  isActive?: boolean;
}

/** Router `state` key a form uses to hand the saved record to the details page. */
export const DRIVER_STATE_KEY = 'driver';

export function toDriver(raw: unknown): Driver {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    fullName: asString(r['fullName']),
    phoneNumber: asString(r['phoneNumber']),
    cityName: asNullableString(r['cityName']),
    phoneNumberConfirmed: asBoolean(r['phoneNumberConfirmed']),
    isActive: asBoolean(r['isActive']),
    isAvailable: asBoolean(r['isAvailable']),
    isDeleted: asBoolean(r['isDeleted']),
    createdAt: asNullableString(r['createdAt']),
  };
}

export function toDriverDetails(raw: unknown): DriverDetails {
  const r = asRecord(raw);
  return {
    ...toDriver(raw),
    nationalId: asString(r['nationalId']),
    dateOfBirth: toDateOnly(r['dateOfBirth']),
    cityId: asNumber(r['cityId']),
    address: asString(r['address']),
    licenseIssueDate: toDateOnly(r['licenseIssueDate']),
    licenseExpiryDate: toDateOnly(r['licenseExpiryDate']),
    vehicleType: toVehicleType(r['vehicleType']),
    vehicleMake: asString(r['vehicleMake']),
    vehicleModel: asString(r['vehicleModel']),
    vehicleYear: asNullableNumber(r['vehicleYear']),
    vehicleColor: asString(r['vehicleColor']),
    plateNumber: asString(r['plateNumber']),
    walletBalance: asNumber(r['walletBalance']),
    deletedAt: asNullableString(r['deletedAt']),
    images: {
      profileImage: asNullableString(r['profileImageUrl']),
      nationalIdFrontImage: asNullableString(r['nationalIdFrontImageUrl']),
      nationalIdBackImage: asNullableString(r['nationalIdBackImageUrl']),
      licenseFrontImage: asNullableString(r['licenseFrontImageUrl']),
      licenseBackImage: asNullableString(r['licenseBackImageUrl']),
      vehicleImage: asNullableString(r['vehicleImageUrl']),
    },
  };
}

/** `2031-05-01T00:00:00` / `2031-05-01` → `2031-05-01`; anything else → `null`. */
function toDateOnly(value: unknown): string | null {
  const text = asNullableString(value);
  const match = text?.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/** Licence past its expiry date (compared on calendar days, local time). */
export function isLicenseExpired(driver: Pick<DriverDetails, 'licenseExpiryDate'>, today = todayIsoDate()): boolean {
  return driver.licenseExpiryDate !== null && driver.licenseExpiryDate < today;
}

export function driverBadges(driver: Pick<Driver, 'isActive' | 'isAvailable' | 'isDeleted'>): AccountBadge[] {
  if (driver.isDeleted) return [DELETED_BADGE];
  if (!driver.isActive) {
    return [{ label: 'بانتظار الموافقة / موقوف', tone: 'warn', icon: 'fa-hourglass-half' }];
  }
  return [
    { label: 'مفعل', tone: 'ok', icon: 'fa-circle-check' },
    driver.isAvailable
      ? { label: 'متاح', tone: 'info', icon: 'fa-signal' }
      : { label: 'غير متاح', tone: 'muted', icon: 'fa-moon' },
  ];
}
