import { useGear } from "../../hooks/useGear";
import type { Item, PackedItem } from "../../types";
import { DeleteButton } from "../common/DeleteButton";
import DragHandle from "../../dnd/DragHandle";
import EditableField from "../editable/EditableField";
import { PackedItemsGrid } from "./PackedItemsGrid";
import { isWeightUnit, WEIGHT_UNITS } from "../../utils/weightUnits";

import { useSortable } from "@dnd-kit/sortable";

interface PackedItemRowProps {
  categoryId: number;
  packedItem: PackedItem;
  item: Item;
}

export default function PackedItemRow({
  categoryId,
  packedItem,
  item,
}: PackedItemRowProps) {
  const { updateItem, updatePackedItem, deletePackedItem } = useGear();

  // The overlay and destination preview show movement without sortable transforms.
  const { attributes, listeners, setNodeRef, isDragging } =
    useSortable({
      id: `packed-item-${packedItem.id}`,
      data: {
        type: "packed-item",
        itemId: item.id,
        categoryId,
        packedItemId: packedItem.id,
      },
    });

  const handlePackedItemChange = (field: keyof PackedItem, value: string | number | boolean) => {
    updatePackedItem(categoryId, {
      id: packedItem.id,
      [field]: field === "quantity" ? Number(value) : value,
    }).catch((err) => {
      console.error("Failed to update packed item:", err);
    });
  };

  const handleItemChange = (field: keyof Item, value: string | number | boolean) => {
    updateItem({
      id: item.id,
      [field]: field === "price" || field === "weight" ? Number(value) : value,
    }).catch((err) => {
      console.error("Failed to update item:", err);
    });
  };

  const handleDelete = () => {
    deletePackedItem(categoryId, packedItem.id).catch((err) => {
      console.error("Failed to delete packed item:", err);
    });
  };

  return (
    <div
      ref={setNodeRef}
      className={`packed-item-row${isDragging ? " drag-source" : ""}`}
    >
      <PackedItemsGrid>
        <div>
          <DragHandle listeners={listeners} attributes={attributes} />
        </div>
        <div><EditableField value={item.name} placeholder="Name" onChange={(value) => handleItemChange("name", value)} /></div>
        <div><EditableField value={item.description ?? ""} placeholder="Description" onChange={(value) => handleItemChange("description", value)} /></div>
        <div><EditableField type="checkbox" label="Worn" value={packedItem.worn} onChange={(value) => handlePackedItemChange("worn", value)} /></div>
        <div><EditableField type="checkbox" label="Consumable" value={packedItem.consumable} onChange={(value) => handlePackedItemChange("consumable", value)} /></div>
        <div>
          <EditableField
            type="select"
            label="Flag"
            value={packedItem.star}
            options={[
              { value: "none", label: "None" },
              { value: "red", label: "Red" },
              { value: "green", label: "Green" },
            ]}
            onChange={(value) => handlePackedItemChange("star", value)}
          />
        </div>
        <div><EditableField type="number" label="Price" value={item.price ?? ""} onChange={(value) => handleItemChange("price", value)} /></div>
        <div>
          <div className="item-weight-field">
            <EditableField type="number" label="Weight" displayDecimals={1} maxDecimals={2} value={item.weight ?? ""} onChange={(value) => handleItemChange("weight", value)} />
            <select
              className="gear-field weight-unit"
              aria-label="Weight unit"
              value={item.unit}
              onChange={(event) => handleItemChange("unit", event.target.value)}
            >
              {!isWeightUnit(item.unit) && <option value={item.unit}>{item.unit || "?"}</option>}
              {WEIGHT_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </div>
        </div>
        <div><EditableField type="number" label="Qty" value={packedItem.quantity} onChange={(value) => handlePackedItemChange("quantity", value)} /></div>
        <DeleteButton onClick={handleDelete} disabled={isDragging} />
      </PackedItemsGrid>
    </div>
  );
}
