export interface ICreateAddonRequest {
  menuItemId: string;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export interface IPutAddonRequest {
  menuItemId: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface IQueryAddons {
  menuItemId: string;
}
