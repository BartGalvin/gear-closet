import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useGear } from "../../hooks/useGear";
import CategorySection from "../category/CategorySection";
import { SectionHeader } from "../common/SectionHeader";
import { CreateButton } from "../common/CreateButton";
import WeightSummary from "./WeightSummary";

export default function SelectedListView() {
  const { selectedListId, lists, categories, items, createCategory, createList } = useGear();

  if (Object.keys(lists).length === 0) {
    return (
      <div className="empty-state">
        <img className="brand-mark" src="/gear-closet.svg" alt="" />
        <h1>A little planning. A better trip.</h1>
        <p>Keep your gear in one place and build a packing list for wherever you're headed.</p>
        <CreateButton
          label="Create your first list"
          onClick={() => createList({ name: "New List" }).catch(() => undefined)}
        />
      </div>
    );
  }

  if (selectedListId === null || !lists[selectedListId]) {
    return <p className="loading-state" role="status">Loading saved gear...</p>;
  }

  const list = lists[selectedListId];

  const listCategories = list.categoryIds
    .map((catId) => categories[catId])
    .filter((cat) => cat !== undefined);
  const itemCount = listCategories.reduce((count, category) => count + category.packedItems.length, 0);

  const handleCreateCategory = async () => {
    try {
      await createCategory(selectedListId, { name: "New Category" });
    } catch (error) {
      console.error("Failed to create category:", error);
    }
  };

  return (
    <div className="list-view">
      <div className="list-heading">
        <p className="list-eyebrow">Packing list</p>
        <SectionHeader
          title={list.name}
          level="h1"
          onCreateClick={handleCreateCategory}
          createLabel="Category"
          createTitle="Create new category"
        />
        <p className="list-meta">
          {listCategories.length} {listCategories.length === 1 ? "category" : "categories"}
          <span aria-hidden="true"> / </span>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>
      {listCategories.length > 0 && <WeightSummary categories={listCategories} items={items} />}
      {listCategories.length === 0 ? (
        <div className="empty-category">
          <h2>Give your gear a place.</h2>
          <p>Add a category like Shelter, Clothing, or Kitchen, then start filling it with gear.</p>
          <CreateButton onClick={handleCreateCategory} label="Add a category" />
        </div>
      ) : (
        <SortableContext
          items={listCategories.map((cat) => cat.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="category-list">
            {listCategories.map((cat) => (
              <CategorySection key={cat.id} categoryId={cat.id} />
            ))}
          </div>
          <CreateButton onClick={handleCreateCategory} label="Add category" />
        </SortableContext>
      )}
    </div>
  );
}
