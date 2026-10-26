import { InMemoryRepository } from "../inMemoryRepository";

interface TestEntity {
    id: number;
    value: string;
}

describe("InMemoryRepository", () => {
    let repo: InMemoryRepository<number, TestEntity>;

    beforeEach(() => {
        repo = new InMemoryRepository<number, TestEntity>();
    });

    it("saves and gets an entity", async () => {
        await repo.save({ id: 1, value: "a" });
        const entity = await repo.get(1);
        expect(entity).toEqual({ id: 1, value: "a" });
    });

    it("returns undefined for missing entity", async () => {
        const entity = await repo.get(999);
        expect(entity).toBeUndefined();
    });

    it("getArr returns entities for given ids", async () => {
        await repo.save({ id: 1, value: "a" });
        await repo.save({ id: 2, value: "b" });
        const arr = await repo.getArr([1, 2, 3]);
        expect(arr).toEqual([
            { id: 1, value: "a" },
            { id: 2, value: "b" },
        ]);
    });

    it("getAll returns all entities", async () => {
        await repo.save({ id: 1, value: "a" });
        await repo.save({ id: 2, value: "b" });
        const all = await repo.getAll();
        expect(all).toHaveLength(2);
        expect(all).toEqual(expect.arrayContaining([
            { id: 1, value: "a" },
            { id: 2, value: "b" },
        ]));
    });

    it("delete removes an entity", async () => {
        await repo.save({ id: 1, value: "a" });
        await repo.delete(1);
        const entity = await repo.get(1);
        expect(entity).toBeUndefined();
    });

    it("getAllIds returns all ids", async () => {
        await repo.save({ id: 1, value: "a" });
        await repo.save({ id: 2, value: "b" });
        const ids = await repo.getAllIds();
        expect(ids.sort()).toEqual([1, 2]);
    });

    it("clear removes all entities", async () => {
        await repo.save({ id: 1, value: "a" });
        await repo.save({ id: 2, value: "b" });
        await repo.clear();
        const all = await repo.getAll();
        expect(all).toEqual([]);
    });

    it("has returns true if entity exists", async () => {
        await repo.save({ id: 1, value: "a" });
        expect(await repo.has(1)).toBe(true);
        expect(await repo.has(2)).toBe(false);
    });

    it("count returns the number of entities", async () => {
        expect(await repo.count()).toBe(0);
        await repo.save({ id: 1, value: "a" });
        expect(await repo.count()).toBe(1);
        await repo.save({ id: 2, value: "b" });
        expect(await repo.count()).toBe(2);
        await repo.delete(1);
        expect(await repo.count()).toBe(1);
    });

    it("stores a copy of saved records, including nested values", async () => {
        const nestedRepo = new InMemoryRepository<number, { id: number; tags: string[] }>();
        const entity = { id: 1, tags: ["shelter"] };
        await nestedRepo.save(entity);
        entity.tags.push("changed outside repository");
        expect(await nestedRepo.get(1)).toEqual({ id: 1, tags: ["shelter"] });
    });

    it.each(["get", "getArr", "getAll"] as const)("%s returns isolated records", async (method) => {
        const nestedRepo = new InMemoryRepository<number, { id: number; tags: string[] }>();
        await nestedRepo.save({ id: 1, tags: ["shelter"] });
        const returned = method === "get"
            ? await nestedRepo.get(1)
            : (method === "getArr" ? await nestedRepo.getArr([1]) : await nestedRepo.getAll())[0];
        returned!.tags.push("changed outside repository");
        expect(await nestedRepo.get(1)).toEqual({ id: 1, tags: ["shelter"] });
    });

    it("restores a copied snapshot without retaining later records", async () => {
        const nestedRepo = new InMemoryRepository<number, { id: number; tags: string[] }>();
        await nestedRepo.save({ id: 1, tags: ["shelter"] });
        const snapshot = await nestedRepo.getAll();
        await nestedRepo.save({ id: 2, tags: ["cooking"] });
        nestedRepo.replaceAll(snapshot);
        snapshot[0].tags.push("changed outside repository");
        expect(await nestedRepo.getAll()).toEqual([{ id: 1, tags: ["shelter"] }]);
    });
});
