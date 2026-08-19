import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { analyse } from "chardet";
import iconv from "iconv-lite";
import { parseNovelText, type NovelDocument } from "@zed-novel-reader/core";

export class DecodeError extends Error {
  override readonly name = "DecodeError";
}

export interface DecodedText {
  text: string;
  encoding: "utf-8" | "utf-8-bom" | "gbk" | "gb18030";
}

function strictUtf8(bytes: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new DecodeError("Input cannot be safely decoded as UTF-8.");
  }
}

function normalizeEncoding(encoding: string): "utf-8" | "gbk" | "gb18030" {
  const normalized = encoding.toLowerCase().replaceAll("_", "-");
  if (normalized === "utf8" || normalized === "utf-8") return "utf-8";
  if (normalized === "gbk" || normalized === "cp936") return "gbk";
  if (normalized === "gb18030") return "gb18030";
  throw new DecodeError(`Unsupported encoding "${encoding}". Use utf-8, gbk, or gb18030.`);
}

function decodeLegacy(bytes: Buffer, encoding: "gbk" | "gb18030"): string {
  const text = iconv.decode(bytes, encoding);
  const roundTrip = iconv.encode(text, encoding);
  if (!roundTrip.equals(bytes)) {
    throw new DecodeError(`Input cannot be safely decoded as ${encoding}.`);
  }
  return text;
}

export function decodeText(bytes: Buffer, override?: string): DecodedText {
  if (override !== undefined) {
    const encoding = normalizeEncoding(override);
    if (encoding === "utf-8") {
      const hasBom = bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]));
      return { text: strictUtf8(hasBom ? bytes.subarray(3) : bytes), encoding };
    }
    return { text: decodeLegacy(bytes, encoding), encoding };
  }

  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    return { text: strictUtf8(bytes.subarray(3)), encoding: "utf-8-bom" };
  }

  let utf8Text: string | undefined;
  try {
    utf8Text = strictUtf8(bytes);
  } catch {
    // Continue only when UTF-8 is invalid.
  }

  if (utf8Text !== undefined) {
    if (bytes.some((byte) => byte >= 0x80)) {
      let legacyText: string | undefined;
      try {
        legacyText = decodeLegacy(bytes, "gb18030");
      } catch {
        // A failed legacy round-trip is positive evidence for UTF-8.
      }
      if (legacyText !== undefined && legacyText !== utf8Text) {
        throw new DecodeError(
          "Encoding is ambiguous between UTF-8 and GBK/GB18030; retry with --encoding utf-8|gbk|gb18030.",
        );
      }
    }
    return { text: utf8Text, encoding: "utf-8" };
  }

  const candidate = analyse(bytes)[0];
  if (
    candidate !== undefined &&
    candidate.confidence >= 80 &&
    ["GB18030", "GB2312", "GBK"].includes(candidate.name.toUpperCase())
  ) {
    return { text: decodeLegacy(bytes, "gb18030"), encoding: "gb18030" };
  }

  throw new DecodeError(
    "Encoding detection was unsafe or low-confidence; retry with --encoding utf-8|gbk|gb18030.",
  );
}

export type OutputStyle = "jsdoc" | "plain";

function escapeBlockTerminator(text: string): string {
  return text.replaceAll("*/", "*\\/");
}

function escapeBodyLine(line: string): string {
  return escapeBlockTerminator(line).replace(/^(\s*)([@*])/u, "$1\\$2");
}

function formatPlain(document: NovelDocument): string {
  const sections = [document.metadata.title];
  for (const chapter of document.chapters) {
    sections.push(chapter.title, chapter.paragraphs.join("\n\n"));
  }
  return `${sections.join("\n\n")}\n`;
}

function formatJsdoc(document: NovelDocument): string {
  const blocks: string[] = [
    [
      "/**",
      ` * @novel-title ${escapeBlockTerminator(document.metadata.title)}`,
      ` * @format-version ${document.metadata.formatVersion}`,
      " */",
    ].join("\n"),
  ];

  for (const chapter of document.chapters) {
    const lines = ["/**", ` * ${escapeBlockTerminator(chapter.title)}`, " *"];
    for (const paragraph of chapter.paragraphs) {
      for (const line of paragraph.split("\n")) lines.push(` * ${escapeBodyLine(line)}`);
      lines.push(" *");
    }
    lines.push(` * @chapter-id ${chapter.id}`, " */");
    blocks.push(lines.join("\n"));
  }

  return `${blocks.join("\n\n")}\n`;
}

export function formatNovel(document: NovelDocument, style: OutputStyle = "jsdoc"): string {
  return style === "plain" ? formatPlain(document) : formatJsdoc(document);
}

export class OutputExistsError extends Error {
  override readonly name = "OutputExistsError";
}

export type RenameOperation = (temporary: string, destination: string) => Promise<void>;

export async function atomicWriteFile(
  output: string,
  content: string,
  force = false,
  renameOperation: RenameOperation = rename,
): Promise<void> {
  if (!force) {
    try {
      await access(output, constants.F_OK);
      throw new OutputExistsError(`Output already exists: ${output}. Use --force to replace it.`);
    } catch (error) {
      if (error instanceof OutputExistsError) throw error;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  const temporary = join(dirname(output), `.${basename(output)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { encoding: "utf8", flag: "wx" });
    if (!force) {
      try {
        await access(output, constants.F_OK);
        throw new OutputExistsError(`Output already exists: ${output}. Use --force to replace it.`);
      } catch (error) {
        if (error instanceof OutputExistsError) throw error;
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    await renameOperation(temporary, output);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export interface ImportTxtOptions {
  input: string;
  output: string;
  style?: OutputStyle;
  encoding?: string;
  force?: boolean;
}

function comparablePath(path: string): string {
  const absolute = resolve(path);
  return process.platform === "win32" ? absolute.toLocaleLowerCase("en-US") : absolute;
}

async function pathsReferToSameFile(input: string, output: string): Promise<boolean> {
  if (comparablePath(input) === comparablePath(output)) return true;
  try {
    const [inputIdentity, outputIdentity] = await Promise.all([stat(input), stat(output)]);
    return inputIdentity.dev === outputIdentity.dev && inputIdentity.ino === outputIdentity.ino;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function importTxt(options: ImportTxtOptions): Promise<NovelDocument> {
  if (await pathsReferToSameFile(options.input, options.output)) {
    throw new Error("Input and output resolve to the same file; the source is never modified.");
  }
  const bytes = await readFile(options.input);
  const decoded = decodeText(bytes, options.encoding);
  const inputName = basename(options.input);
  const title = basename(inputName, extname(inputName));
  const document = parseNovelText(decoded.text, title, decoded.encoding);
  await atomicWriteFile(options.output, formatNovel(document, options.style), options.force ?? false);
  return document;
}

export const ExitCode = {
  OK: 0,
  USAGE: 2,
  IO: 3,
  ENCODING: 4,
  OUTPUT_EXISTS: 5,
} as const;

interface CliReporter {
  error(message: string): void;
  info?(message: string): void;
}

const USAGE =
  "Usage: novel import <input> --output <file> [--style jsdoc|plain] [--encoding utf-8|gbk|gb18030] [--force]";

function parseCli(args: string[]): ImportTxtOptions | undefined {
  if (args[0] !== "import" || args.length < 4 || args[1] === undefined) return undefined;
  const options: Partial<ImportTxtOptions> = { input: args[1] };
  for (let index = 2; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--force") {
      options.force = true;
    } else if (argument === "--output" || argument === "--style" || argument === "--encoding") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) return undefined;
      index += 1;
      if (argument === "--output") options.output = value;
      if (argument === "--encoding") options.encoding = value;
      if (argument === "--style") {
        if (value !== "jsdoc" && value !== "plain") return undefined;
        options.style = value;
      }
    } else {
      return undefined;
    }
  }
  if (options.output === undefined) return undefined;
  return options as ImportTxtOptions;
}

export async function runCli(args: string[], reporter: CliReporter = console): Promise<number> {
  const options = parseCli(args);
  if (options === undefined) {
    reporter.error(USAGE);
    return ExitCode.USAGE;
  }
  try {
    const document = await importTxt(options);
    reporter.info?.(`Imported ${document.chapters.length} chapter(s) to ${options.output}`);
    return ExitCode.OK;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reporter.error(`novel: ${message}`);
    if (error instanceof OutputExistsError) return ExitCode.OUTPUT_EXISTS;
    if (error instanceof DecodeError) return ExitCode.ENCODING;
    return ExitCode.IO;
  }
}
