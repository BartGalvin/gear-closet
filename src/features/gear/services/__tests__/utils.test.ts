import { assertIndexInBounds, getUniqueEntityName, getOrThrow } from "../utils";
import { InMemoryRepository } from "../../repositories/inMemoryRepository";

describe("utils", () => {
    it("assertIndexInBounds throws for out-of-bounds", () => {
        expect(() => assertIndexInBounds([1, 2], 2, "test")).toThrow(/out of bounds/);
        expect(() => assertIndexInBounds([1, 2], -1, "test")).toThrow(/out of bounds/);
        expect(() => assertIndexInBounds([1, 2], 1, "test")).not.toThrow();
    });

    it("getUniqueEntityName returns unique name", async () => {
        const repo = new InMemoryRepository<number, { id: number; name: string }>();
        await repo.save({ id: 1, name: "A" });
        expect(await getUniqueEntityName("A", repo, e => e.name)).toMatch(/A \(\d+\)/);
        expect(await getUniqueEntityName("B", repo, e => e.name)).toBe("B");
    });

    it("getOrThrow throws if not found", async () => {
        const repo = new InMemoryRepository<number, { id: number }>();
        await repo.save({ id: 1 });
        await expect(getOrThrow(repo, 1)).resolves.toEqual({ id: 1 });
        await expect(getOrThrow(repo, 2)).rejects.toThrow(/not found/);
    });
});