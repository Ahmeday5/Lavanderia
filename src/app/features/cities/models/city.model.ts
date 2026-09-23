/** A city dashboard admins can manage — used e.g. to scope laundry branches. */
export interface City {
  id: number;
  name: string;
}

export interface CreateCityRequest {
  name: string;
}

export interface UpdateCityRequest {
  name: string;
}
