import { use } from "react";
import { GearContext } from "../context/GearContext";
export function useItems() {
  const context = use(GearContext);
  if (!context) {
    throw new Error("useItems must be used within a GearProvider");
  }
  const { items, createItem, updateItem, deleteItem, fetchItems, getItems, getItemsForCategory } = context;
  return {
    items,
    createItem,
    updateItem,
    deleteItem,
    fetchItems,
    getItems,
    getItemsForCategory,
  };
}

