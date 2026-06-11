import { UserStatus, WeekDay } from '../enums/enums.js';

export interface IOperatingHoursInput {
  day: WeekDay;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
}

export interface ILocationInput {
  type?: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface ICreateOutletRequest {
  restaurantId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  location?: ILocationInput;
  operatingHours?: IOperatingHoursInput[];
}

export interface IPutOutletRequest {
  restaurantId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  location?: ILocationInput;
}

export interface IToggleStatusRequest {
  status: 'active' | 'inactive';
}

export interface IUpdateOperatingHoursRequest {
  operatingHours: IOperatingHoursInput[];
}

export interface IQueryOutlets {
  restaurantId?: string;
  status?: string;
  city?: string;
  page?: string;
  limit?: string;
}

export interface INearbyOutletsQuery {
  lng: string;
  lat: string;
  radius?: string;
}
