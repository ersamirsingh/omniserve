import { useState, useCallback } from "react";

export const useApi = (apiFunc) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFunc(...args);
        setData(result);
        return { success: true, data: result };
      } catch (err) {
        const message = err.response?.data?.message || err.message || "Request failed";
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [apiFunc]
  );

  return {
    data,
    error,
    loading,
    request,
    setData,
    setError,
  };
};

export default useApi;
