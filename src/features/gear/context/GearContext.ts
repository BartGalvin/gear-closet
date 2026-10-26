import { createContext } from "react";
import type { GearContextType } from "./types";

export const GearContext = createContext<GearContextType | null>(null);