import axiosInstance from "../axios.js";

export const CategoryApi = {
  listCategories: () => {
    return axiosInstance.get("/categories");
  },

  createCategory: (data) => {
    return axiosInstance.post("/categories", data);
  },

  getCategoryById: (id) => {
    return axiosInstance.get(`/categories/${id}`);
  },

  updateCategory: (id, data) => {
    return axiosInstance.put(`/categories/${id}`, data);
  },

  updateCategoryOrder: (id, sortOrder) => {
    return axiosInstance.patch(`/categories/${id}/order`, { sortOrder });
  },

  deleteCategory: (id) => {
    return axiosInstance.delete(`/categories/${id}`);
  },
};

export default CategoryApi;
