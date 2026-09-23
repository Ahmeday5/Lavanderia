/** A customer account registered on the mobile app. */
export interface Customer {
  id: number;
  name: string;
  phoneNumber: string;
  cityName: string;
  phoneNumberConfirmed: boolean;
  isBanned: boolean;
  createdAt: string;
}
