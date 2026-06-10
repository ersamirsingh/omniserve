import { useCurrentUser } from "./useCurrentUser";

export const usePermissions = () => {
  const user = useCurrentUser();

  const role = user?.role;

  return {
    role,

    isAuthenticated: !!user,

    isSuperAdmin: role === "superAdmin",

    isRestaurantOwner:
      role === "restaurantOwner",

    isOutletManager:
      role === "outletManager",

    isKitchenStaff:
      role === "kitchenStaff",

    canManageRestaurants:
      role === "superAdmin",

    canManageOutlets:
      role === "superAdmin" ||
      role === "restaurantOwner",

    canManageInventory:
      role === "restaurantOwner" ||
      role === "outletManager",

    canManageOrders:
      role === "restaurantOwner" ||
      role === "outletManager" ||
      role === "kitchenStaff",

    canManageStaff:
      role === "superAdmin" ||
      role === "restaurantOwner",

    canViewAnalytics:
      role === "superAdmin" ||
      role === "restaurantOwner" ||
      role === "outletManager",

    canViewFinance:
      role === "superAdmin" ||
      role === "restaurantOwner",
  };
};