import { use } from "react";
import { GearContext } from "../context/GearContext";

export function useCategories() {
  const context = use(GearContext);
  if (!context) {
    throw new Error("useCategories must be used within a GearProvider");
  }
  const {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoriesForList,
    fetchCategoriesForList,
    fetchCategories,
  } = context;

  return {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoriesForList,
    fetchCategoriesForList,
    fetchCategories,
  };
}
