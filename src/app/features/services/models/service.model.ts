import { ServiceItem } from './service-item.model';

/** A laundry service category (e.g. "غسيل الملابس"), with its nested items. */
export interface Service {
  id: number;
  name: string;
  /** Emoji or icon token — dashboard also accepts SVG markup as free text. */
  icon: string;
  items: ServiceItem[];
}

export interface CreateServiceRequest {
  name: string;
  icon: string;
}

export interface UpdateServiceRequest {
  name: string;
  icon: string;
}
