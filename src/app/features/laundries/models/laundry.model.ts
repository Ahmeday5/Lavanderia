/** A laundry business account registered on the platform. */
export interface Laundry {
  id: number;
  name: string;
  phoneNumber: string;
  cityName: string;
  phoneNumberConfirmed: boolean;
  isBanned: boolean;
  createdAt: string;
}
