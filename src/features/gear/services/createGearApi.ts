import type { GearApi } from "../api/GearApi.ts";
import type { GearStore } from "../repositories/types.ts";
import * as list from "./listService.ts";
import * as category from "./categoryService.ts";
import * as item from "./itemService.ts";
import * as placement from "./packedItemService.ts";

export function createGearApi(store: GearStore): GearApi {
  return {
    readSnapshot: () => store.readSnapshot(),
    createList: (opts) => list.createList(opts, store),
    updateList: (value) => list.updateList(value, store),
    deleteList: (id) => list.deleteList(id, store),
    moveCategory: (listId, id, index) => list.moveCategory(listId, id, index, store),
    createCategory: (listId, opts) => category.createCategory(listId, opts, store),
    updateCategory: (value) => category.updateCategory(value, store),
    deleteCategory: (id) => category.deleteCategory(id, store),
    createItem: (opts) => item.createItem(opts, store),
    updateItem: (value) => item.updateItem(value, store),
    deleteItem: (id) => item.deleteItem(id, store),
    createPackedItem: (categoryId, opts, packedOpts) => item.createItemInCategory(categoryId, opts, packedOpts, store),
    addPackedItem: (categoryId, itemId, opts, index) => placement.createPackedItem(categoryId, itemId, opts, index, store),
    updatePackedItem: (categoryId, value) => placement.updatePackedItem(categoryId, value, store),
    deletePackedItem: (categoryId, id) => placement.removePackedItem(categoryId, id, store),
    movePackedItem: (fromId, toId, id, index) => placement.movePackedItem(fromId, toId, id, index, store),
  };
}
