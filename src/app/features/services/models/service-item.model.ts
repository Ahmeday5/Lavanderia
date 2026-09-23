/** A single item within a service (e.g. "قميص" under "غسيل الملابس"). */
export interface ServiceItem {
  id: number;
  serviceId: number;
  /** Backend always sends `null` here — the parent service is looked up separately. */
  service: unknown;
  name: string;
}

export interface CreateServiceItemRequest {
  serviceId: number;
  name: string;
}

export interface UpdateServiceItemRequest {
  serviceId: number;
  name: string;
}
