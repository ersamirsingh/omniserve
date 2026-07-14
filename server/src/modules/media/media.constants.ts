export const MEDIA_FOLDERS = {
  RESTAURANT_LOGO: "restaurant/logo",
  RESTAURANT_BANNER: "restaurant/banner",

  OUTLET_LOGO: "outlets/logo",
  OUTLET_BANNER: "outlets/banner",

  MENU_ITEMS: "menu/items",
  CATEGORY: "menu/category",

  USER_AVATAR: "user/avatar",
  STAFF_AVATAR: "staff/avatar",
  CUSTOMER_AVATAR: "customer/avatar",

  MARKETING: "marketing",
  QR: "qr",

  SYSTEM: "system",
} as const;

export const ALLOWED_IMAGE_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const SIGNATURE_EXPIRY = 60 * 5;

export const DEFAULT_TRANSFORMATION = {
  quality: "auto",
  fetch_format: "auto",
};