import { mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ExitCode,
  OutputExistsError,
  atomicWriteFile,
  importTxt,
  runCli,
} from "../src/index.js";

const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "novel-importer-"));
  roots.push(root);
  return root;
}
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("atomicWriteFile", () => {
  it("refuses an existing output unless force is enabled", async () => {
    const root = await fixture();
    const output = join(root, "book.novel");
    await writeFile(output, "existing");

    await expect(atomicWriteFile(output, "new", false)).rejects.toBeInstanceOf(OutputExistsError);
    await expect(readFile(output, "utf8")).resolves.toBe("existing");
  });

  it("writes a sibling temporary file and atomically renames it", async () => {
    const root = await fixture();
    const output = join(root, "book.novel");
    const calls: Array<[string, string]> = [];

    await atomicWriteFile(output, "complete", false, async (temporary, destination) => {
      calls.push([temporary, destination]);
      expect(await readFile(temporary, "utf8")).toBe("complete");
      await rename(temporary, destination);
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]).toBe(output);
    expect(calls[0]?.[0]).toMatch(/\.book\.novel\..+\.tmp$/u);
    expect(await readFile(output, "utf8")).toBe("complete");
    expect((await readdir(root)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("replaces an existing output when force is enabled", async () => {
    const root = await fixture();
    const output = join(root, "book.novel");
    await writeFile(output, "old");

    await atomicWriteFile(output, "new", true);

    expect(await readFile(output, "utf8")).toBe("new");
    expect((await readdir(root)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("cleans the temporary file when rename fails", async () => {
    const root = await fixture();
    const output = join(root, "book.novel");

    await expect(
      atomicWriteFile(output, "content", false, async () => {
        throw new Error("rename failed");
      }),
    ).rejects.toThrow("rename failed");

    expect((await readdir(root)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });
});

describe("importTxt", () => {
  it("never modifies the source file", async () => {
    const root = await fixture();
    const input = join(root, "原书.txt");
    const output = join(root, "book.novel");
    const original = "第一章 初见\n正文";
    await writeFile(input, original);

    await importTxt({ input, output });

    expect(await readFile(input, "utf8")).toBe(original);
    expect(await readFile(output, "utf8")).toContain("@chapter-id chapter_0001");
  });

  it("rejects using the source path as output even with force", async () => {
    const root = await fixture();
    const input = join(root, "book.txt");
    await writeFile(input, "正文");
    await expect(importTxt({ input, output: input, force: true })).rejects.toThrow(/same file/u);
    expect(await readFile(input, "utf8")).toBe("正文");
  });

  it.runIf(process.platform === "win32")(
    "rejects a case-only alias of the Windows source path even with force",
    async () => {
      const root = await fixture();
      const input = join(root, "Book.txt");
      const output = join(root, "book.txt");
      await writeFile(input, "原始正文");

      await expect(importTxt({ input, output, force: true })).rejects.toThrow(/same file/u);
      expect(await readFile(input, "utf8")).toBe("原始正文");
    },
  );

  it.runIf(process.platform === "win32")(
    "rejects a junction alias of the source file even with force",
    async () => {
      const root = await fixture();
      const realDirectory = join(root, "real");
      const aliasDirectory = join(root, "alias");
      await mkdir(realDirectory);
      await symlink(realDirectory, aliasDirectory, "junction");
      const input = join(realDirectory, "book.txt");
      const output = join(aliasDirectory, "book.txt");
      await writeFile(input, "原始正文");

      await expect(importTxt({ input, output, style: "plain", force: true })).rejects.toThrow(/same file/u);
      expect(await readFile(input, "utf8")).toBe("原始正文");
    },
  );

});

describe("runCli", () => {
  it("returns a stable usage exit code for invalid arguments", async () => {
    const errors: string[] = [];
    expect(await runCli(["import"], { error: (message) => errors.push(message) })).toBe(ExitCode.USAGE);
    expect(errors.join("\n")).toContain("Usage: novel import");
  });

  it("returns a stable output-conflict exit code", async () => {
    const root = await fixture();
    const input = join(root, "book.txt");
    const output = join(root, "book.novel");
    await writeFile(input, "Body");
    await writeFile(output, "existing");
    const errors: string[] = [];

    expect(
      await runCli(["import", input, "--output", output], { error: (message) => errors.push(message) }),
    ).toBe(ExitCode.OUTPUT_EXISTS);
    expect(errors.join("\n")).toMatch(/already exists.*--force/u);
  });

  it("returns the encoding exit code for unsafe input", async () => {
    const root = await fixture();
    const input = join(root, "unsafe.txt");
    const output = join(root, "book.novel");
    await writeFile(input, Buffer.from([0x81]));

    expect(await runCli(["import", input, "--output", output], { error: () => undefined })).toBe(
      ExitCode.ENCODING,
    );
  });

  it("returns the IO exit code when the input does not exist", async () => {
    const root = await fixture();
    const input = join(root, "missing.txt");
    const output = join(root, "book.novel");

    expect(await runCli(["import", input, "--output", output], { error: () => undefined })).toBe(
      ExitCode.IO,
    );
  });
});
