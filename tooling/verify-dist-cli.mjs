import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import iconv from "iconv-lite";

const root = await mkdtemp(resolve(tmpdir(), "zed-novel-dist-cli-"));
const cli = resolve("packages/importer/dist/cli.js");
const input = resolve(root, "gbk.txt");
const output = resolve(root, "gbk.novel");
const gb18030Input = resolve(root, "gb18030.txt");
const gb18030Output = resolve(root, "gb18030.novel");
const unsafeInput = resolve(root, "unsafe.txt");
const unsafeOutput = resolve(root, "unsafe.novel");
const ambiguousInput = resolve(root, "ambiguous.txt");
const ambiguousOutput = resolve(root, "ambiguous.novel");

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

try {
  await writeFile(input, iconv.encode("第一章 编码测试\n中文正文。", "gbk"));
  const imported = run(["import", input, "--output", output]);
  if (imported.status !== 0) {
    throw new Error(`Built CLI GBK import failed (${imported.status}): ${imported.stderr.trim()}`);
  }

  const content = await readFile(output, "utf8");
  for (const expected of ["第一章 编码测试", "中文正文。", "@chapter-id chapter_0001"]) {
    if (!content.includes(expected)) throw new Error(`Built CLI output is missing: ${expected}`);
  }

  await writeFile(gb18030Input, iconv.encode("第一章 扩展字符\n𠀀。", "gb18030"));
  const gb18030 = run([
    "import",
    gb18030Input,
    "--output",
    gb18030Output,
    "--encoding",
    "gb18030",
  ]);
  if (gb18030.status !== 0) {
    throw new Error(`Built CLI GB18030 import failed (${gb18030.status}): ${gb18030.stderr.trim()}`);
  }
  const gb18030Content = await readFile(gb18030Output, "utf8");
  if (!gb18030Content.includes("𠀀。")) throw new Error("Built CLI GB18030 output was corrupted");

  await writeFile(unsafeInput, Buffer.from([0x81]));
  const unsafe = run(["import", unsafeInput, "--output", unsafeOutput]);
  if (unsafe.status !== 4) throw new Error(`Expected encoding exit code 4, received ${unsafe.status}`);

  await writeFile(ambiguousInput, iconv.encode("路", "gbk"));
  const ambiguous = run(["import", ambiguousInput, "--output", ambiguousOutput]);
  if (ambiguous.status !== 4) {
    throw new Error(`Expected ambiguous-encoding exit code 4, received ${ambiguous.status}`);
  }
  const explicitGbk = run([
    "import",
    ambiguousInput,
    "--output",
    ambiguousOutput,
    "--encoding",
    "gbk",
  ]);
  if (explicitGbk.status !== 0) {
    throw new Error(`Built CLI explicit GBK import failed (${explicitGbk.status}): ${explicitGbk.stderr.trim()}`);
  }
  if (!(await readFile(ambiguousOutput, "utf8")).includes("路")) {
    throw new Error("Built CLI explicit GBK output was corrupted");
  }

  const conflict = run(["import", input, "--output", output]);
  if (conflict.status !== 5) throw new Error(`Expected conflict exit code 5, received ${conflict.status}`);

  console.log("Built CLI verified: GBK/GB18030, ambiguity rejection, and exit codes 4/5");
} finally {
  await rm(root, { recursive: true, force: true });
}
