import { createGearApi } from "../services/createGearApi";
import { memoryGearStore } from "../services/gearStore";

export const memoryGearApi = createGearApi(memoryGearStore);
