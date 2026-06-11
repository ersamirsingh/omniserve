export interface ICreateVariantRequest {
  menuItemId: string;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export interface IPutVariantRequest {
  menuItemId: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface IQueryVariants {
  menuItemId: string;
}
