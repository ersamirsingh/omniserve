export const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

export const getList = (response, key) => {
  const payload = getPayload(response);

  if (Array.isArray(payload)) return payload;
  if (key && Array.isArray(payload?.[key])) return payload[key];

  return [];
};

export const getEntityId = (item) => item?.id || item?._id || '';

export const getRefId = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return getEntityId(value);
  return value;
};
