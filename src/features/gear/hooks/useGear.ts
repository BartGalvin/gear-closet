import { use } from "react";
import { GearContext } from "../context/GearContext";

export function useGear() {
  const ctx = use(GearContext);
  if (!ctx) throw new Error("useGear must be used within GearProvider");
  return ctx;
}
