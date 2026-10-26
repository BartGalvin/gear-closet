import { keyBy, forEachRecord } from "../recordUtils";

describe("keyBy", () => {
    it("creates a record keyed by id", () => {
        const arr = [
            { id: 1, name: "A" },
            { id: 2, name: "B" },
        ];
        const result = keyBy(arr);
        expect(result).toEqual({
            1: { id: 1, name: "A" },
            2: { id: 2, name: "B" },
        });
    });

    it("returns an empty object for an empty array", () => {
        expect(keyBy([])).toEqual({});
    });

    it("overwrites duplicate ids", () => {
        const arr = [
            { id: 1, name: "A" },
            { id: 1, name: "B" },
        ];
        const result = keyBy(arr);
        expect(result).toEqual({ 1: { id: 1, name: "B" } });
    });
});

describe("forEachRecord", () => {
    it("calls the function for each key-value pair", () => {
        const record = { 1: "a", 2: "b" };
        const calls: [string, number][] = [];
        forEachRecord(record, (value, key) => {
            calls.push([value, key]);
        });
        expect(calls).toEqual([
            ["a", 1],
            ["b", 2],
        ]);
    });

    it("does nothing for an empty record", () => {
        const record = {};
        const calls: [string, number][] = [];
        forEachRecord(record, (value, key) => {
            calls.push([value, key]);
        });
        expect(calls).toEqual([]);
    });
});