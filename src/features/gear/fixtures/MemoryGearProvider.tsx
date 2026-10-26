import type { ReactNode } from "react";
import { GearProvider } from "../context/GearProvider";
import { memoryGearApi } from "./memoryGearApi";

export function MemoryGearProvider({ children }: { children: ReactNode }) {
  return <GearProvider api={memoryGearApi}>{children}</GearProvider>;
}
