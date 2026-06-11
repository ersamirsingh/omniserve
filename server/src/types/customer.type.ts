export interface IAddressRequest {
  label?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  location?: {
    type?: "Point";
    coordinates: [number, number];
  };
  isDefault?: boolean;
}

export interface IUpsertCustomerRequest {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  address?: IAddressRequest;
}

export interface IQueryCustomers {
  limit?: string;
  page?: string;
  search?: string;
}
