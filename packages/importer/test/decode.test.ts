import { describe, expect, it } from "vitest";
import iconv from "iconv-lite";
import { DecodeError, decodeText } from "../src/index.js";

const SAMPLE = "第一章 初见\n这是足够长的中文正文，用于可靠地检测传统 TXT 小说的字符编码。故事从这里开始。";

describe("decodeText", () => {
  it("decodes UTF-8 and reports its normalized encoding", () => {
    expect(decodeText(Buffer.from(SAMPLE, "utf8"))).toEqual({ text: SAMPLE, encoding: "utf-8" });
  });

  it("strips a UTF-8 BOM", () => {
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(SAMPLE)]);
    expect(decodeText(bytes)).toEqual({ text: SAMPLE, encoding: "utf-8-bom" });
  });

  it.each(["gbk", "gb18030"])("decodes confidently detected %s text", (encoding) => {
    const decoded = decodeText(iconv.encode(SAMPLE, encoding));
    expect(decoded.text).toBe(SAMPLE);
    expect(["gbk", "gb18030"]).toContain(decoded.encoding);
  });

  it("rejects unsafe low-confidence bytes rather than returning mojibake", () => {
    expect(() => decodeText(Buffer.from([0x81]))).toThrow(DecodeError);
    expect(() => decodeText(Buffer.from([0x81]))).toThrow(/--encoding/u);
  });

  it("supports an explicit encoding override", () => {
    expect(decodeText(iconv.encode(SAMPLE, "gbk"), "gbk").text).toBe(SAMPLE);
  });

  it("rejects bytes that safely round-trip as different UTF-8 and GBK text", () => {
    const ambiguous = iconv.encode("路", "gbk");
    expect(ambiguous.toString("hex")).toBe("c2b7");

    expect(() => decodeText(ambiguous)).toThrow(/ambiguous.*--encoding/iu);
    expect(decodeText(ambiguous, "gbk").text).toBe("路");
    expect(decodeText(ambiguous, "utf-8").text).toBe("·");
  });

  it("rejects an incompatible explicit UTF-8 override", () => {
    expect(() => decodeText(iconv.encode(SAMPLE, "gbk"), "utf-8")).toThrow(/cannot be safely decoded/u);
  });
});
