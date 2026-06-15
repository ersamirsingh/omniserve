export const formatINR = (value) => {
  if (value === undefined || value === null || isNaN(value)) {
    value = 0;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};
