import { use } from "react";
import { GearContext } from "../context/GearContext";

export function useLists() {
  const context = use(GearContext);
  if (!context) {
    throw new Error("useLists must be used within a GearProvider");
  }
  const {
    lists,
    selectedListId,
    setSelectedListId,
    createList,
    updateList,
    moveCategory,
    deleteList,
    fetchLists,
    getLists,
  } = context;


  return {
    lists,
    selectedListId,
    setSelectedListId,
    createList,
    updateList,
    moveCategory,
    deleteList,
    fetchLists,
    getLists,
  };
}
