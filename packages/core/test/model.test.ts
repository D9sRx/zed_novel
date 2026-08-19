import { describe, expect, it } from "vitest";
import { createNovelDocument } from "../src/index.js";

describe("NovelDocument", () => {
  it("creates the canonical versioned document model", () => {
    expect(createNovelDocument("示例", "utf-8", [])).toEqual({
      metadata: { title: "示例", formatVersion: 1 },
      source: { encoding: "utf-8", autoSegmented: false },
      chapters: [],
    });
  });
});
