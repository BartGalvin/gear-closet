import { useCallback, useMemo, useState, type ReactNode } from "react";
import { GearContext } from "./GearContext";
import type { GearContextType, GearState } from "./types";
import type { ListId } from "../types";
import type { GearApi, GearSnapshot } from "../api/GearApi";
import { selectCategoriesForList } from "../list/listSelectors";
import {
  selectItemsForCategory,
  selectPackedItemsForCategory,
} from "../category/categorySelectors";
import { keyBy } from "../utils/recordUtils";

interface ProviderState extends GearState {
  selectedListId: ListId | null;
}

export function GearProvider({ children, api }: { children: ReactNode; api: GearApi }) {
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ProviderState>({
    lists: {},
    categories: {},
    items: {},
    selectedListId: null,
  });

  const loadState = useCallback(async () => {
    let snapshot: GearSnapshot;
    try {
      snapshot = await api.readSnapshot();
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load saved gear.");
      throw error;
    }
    const lists = keyBy(snapshot.lists);
    const categories = keyBy(snapshot.categories);
    const items = keyBy(snapshot.items);
    setState((previous) => ({
      lists,
      categories,
      items,
      selectedListId:
        previous.selectedListId !== null && lists[previous.selectedListId]
          ? previous.selectedListId
          : snapshot.lists[0]?.id ?? null,
    }));
    return { lists, categories, items };
  }, [api]);

  const actions = useMemo(() => {
    // Publish committed data together; failed commands leave the current view intact.
    const commit = async (command: () => Promise<unknown>) => {
      try {
        await command();
        await loadState();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not save changes.");
        throw error;
      }
    };
    const refresh = async () => { await loadState(); };

    return {
      createList: (opts) => commit(() => api.createList(opts)),
      updateList: (list) => commit(() => api.updateList(list)),
      deleteList: (id) => commit(() => api.deleteList(id)),
      moveCategory: (listId, categoryId, index) =>
        commit(() => api.moveCategory(listId, categoryId, index)),
      createCategory: (listId, opts) => commit(() => api.createCategory(listId, opts)),
      updateCategory: (category) => commit(() => api.updateCategory(category)),
      deleteCategory: (id) => commit(() => api.deleteCategory(id)),
      createItem: (opts) => commit(() => api.createItem(opts)),
      updateItem: (item) => commit(() => api.updateItem(item)),
      deleteItem: (id) => commit(() => api.deleteItem(id)),
      createPackedItem: (categoryId, itemOpts, packedOpts) =>
        commit(() => api.createPackedItem(categoryId, itemOpts, packedOpts)),
      addPackedItem: (categoryId, itemId, opts, index) =>
        commit(() => api.addPackedItem(categoryId, itemId, opts, index)),
      updatePackedItem: (categoryId, item) =>
        commit(() => api.updatePackedItem(categoryId, item)),
      deletePackedItem: (categoryId, id) =>
        commit(() => api.deletePackedItem(categoryId, id)),
      movePackedItem: (fromId, toId, id, index) =>
        commit(() => api.movePackedItem(fromId, toId, id, index)),
      fetchLists: refresh,
      fetchItems: refresh,
      fetchCategories: async () => Object.values((await loadState()).categories),
      fetchCategoriesForList: async (id) => {
        const { lists, categories } = await loadState();
        return selectCategoriesForList(lists, categories, id);
      },
      refresh,
    } satisfies Pick<GearContextType,
      | "createList" | "updateList" | "deleteList" | "moveCategory"
      | "createCategory" | "updateCategory" | "deleteCategory"
      | "createItem" | "updateItem" | "deleteItem"
      | "createPackedItem" | "addPackedItem" | "updatePackedItem"
      | "deletePackedItem" | "movePackedItem"
      | "fetchLists" | "fetchItems" | "fetchCategories" | "fetchCategoriesForList" | "refresh"
    >;
  }, [api, loadState]);

  const clearError = useCallback(() => setError(null), []);

  const setSelectedListId = useCallback((id: ListId | null) => {
    setState((previous) => ({ ...previous, selectedListId: id }));
  }, []);

  const value = useMemo<GearContextType>(() => ({
    ...state,
    ...actions,
    error,
    clearError,
    setSelectedListId,
    getLists: () => Object.values(state.lists),
    getItems: () => Object.values(state.items),
    getCategoriesForList: (id) => selectCategoriesForList(state.lists, state.categories, id),
    getItemsForCategory: (id) => selectItemsForCategory(state.categories, state.items, id),
    getPackedItemsForCategory: (id) => selectPackedItemsForCategory(state.categories, id),
  }), [state, actions, error, clearError, setSelectedListId]);

  return <GearContext value={value}>{children}</GearContext>;
}
