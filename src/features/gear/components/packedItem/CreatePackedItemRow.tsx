import { useRef, useState, type FormEvent } from "react";
import { useGear } from "../../hooks/useGear";
import type { CategoryId, ItemOptions, PackedItemOptions, Star } from "../../types";
import { convertWeight, WEIGHT_UNITS, type WeightUnit } from "../../utils/weightUnits";
import { PackedItemsGrid } from "./PackedItemsGrid";
import { formatDecimal, limitDecimals } from "../../utils/decimal";

function readDraft(form: HTMLFormElement): { item: ItemOptions; packedItem: PackedItemOptions } {
  const data = new FormData(form);
  const text = (name: string) => {
    const value = data.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    item: {
      name: text("name").trim(),
      description: text("description").trim(),
      price: Number(text("price")),
      weight: Number(formatDecimal(Number(text("weight")), 2)),
      unit: text("unit"),
    },
    packedItem: {
      quantity: Number(text("quantity")),
      worn: data.has("worn"),
      consumable: data.has("consumable"),
      star: text("star") as Star,
    },
  };
}

function hasDetails(item: ItemOptions): boolean {
  return [item.name, item.description, item.price, item.weight].some(Boolean);
}

interface CreatePackedItemRowProps {
  categoryId: CategoryId;
}

export default function CreatePackedItemRow({
  categoryId,
}: CreatePackedItemRowProps) {
  const { createPackedItem } = useGear();
  const [isCreating, setIsCreating] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<WeightUnit>("g");
  const saving = useRef(false);

  const cancel = () => {
    setIsCreating(false);
    setCanSave(false);
    setWeight("");
    setUnit("g");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving.current) return;
    const { item, packedItem } = readDraft(event.currentTarget);
    if (!hasDetails(item)) return;
    saving.current = true;
    setIsSaving(true);
    try {
      await createPackedItem(categoryId, item, packedItem);
      cancel();
    } catch {
      // The provider reports the failure; keep the draft available for retry.
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  if (isCreating) {
    return (
      <form
        className="draft-item-form"
        aria-label="New item"
        onSubmit={(event) => { void submit(event); }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.requestSubmit();
        }}
        onChange={(event) => setCanSave(hasDetails(readDraft(event.currentTarget).item))}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving.current) {
            event.preventDefault();
            cancel();
          }
        }}
      >
        <fieldset disabled={isSaving}>
          <PackedItemsGrid>
            <span></span>
            <input className="gear-field" name="name" aria-label="New item name" placeholder="Name" autoFocus />
            <input className="gear-field" name="description" aria-label="New item description" placeholder="Description" />
            <input type="checkbox" name="worn" aria-label="New item worn" />
            <input type="checkbox" name="consumable" aria-label="New item consumable" />
            <select className="gear-field" name="star" aria-label="New item flag" defaultValue="none">
              <option value="none">None</option>
              <option value="red">Red</option>
              <option value="green">Green</option>
            </select>
            <input className="gear-field text-right" type="number" inputMode="decimal" min="0" step="any" name="price" aria-label="New item price" placeholder="0" />
            <div className="item-weight-field">
              <input className="gear-field text-right" type="number" inputMode="decimal" min="0" step="0.01" name="weight" aria-label="New item weight" placeholder="0" value={weight} onChange={(event) => setWeight(limitDecimals(event.target.value, 2))} />
              <select
                className="gear-field weight-unit"
                name="unit"
                aria-label="New item weight unit"
                value={unit}
                onChange={(event) => {
                  const nextUnit = event.target.value as WeightUnit;
                  if (weight !== "") setWeight(limitDecimals(String(convertWeight(Number(weight), unit, nextUnit) ?? weight), 2));
                  setUnit(nextUnit);
                }}
              >
                {WEIGHT_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>
            <input className="gear-field text-right" type="number" inputMode="numeric" min="0" step="1" name="quantity" aria-label="New item quantity" defaultValue="1" required />
            <span></span>
          </PackedItemsGrid>
          <div className="draft-item-actions">
            <p>Enter a name, description, weight, or price.</p>
            <button type="button" className="draft-cancel-button" onClick={cancel}>Cancel</button>
            <button type="submit" className="create-button" disabled={!canSave || isSaving}>{isSaving ? "Adding..." : "Add item"}</button>
          </div>
        </fieldset>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsCreating(true)}
      className="add-item-button"
      title="Add new item to this category"
    >
      <span aria-hidden="true">+</span> Add item
    </button>
  );
}
