import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const grammarRoot = path.join(repositoryRoot, "grammar");
const treeSitterCli = path.join(repositoryRoot, "node_modules", "tree-sitter-cli", "cli.js");
const configPath = path.join(grammarRoot, "test", "tree-sitter-config.json");
const fixturePath = path.join(grammarRoot, "test", "fixture.novel");

const checks = [
  {
    query: path.join(repositoryRoot, "extension", "languages", "novel", "highlights.scm"),
    captures: ["comment.doc", "title", "tag", "string", "constant", "attribute"],
  },
  {
    query: path.join(repositoryRoot, "extension", "languages", "novel", "outline.scm"),
    captures: ["item", "name"],
  },
  {
    query: path.join(repositoryRoot, "extension", "languages", "novel", "textobjects.scm"),
    captures: ["comment.around", "class.around", "function.around", "function.inside"],
  },
];

for (const check of checks) {
  const result = spawnSync(
    process.execPath,
    [treeSitterCli, "query", "--config-path", configPath, check.query, fixturePath],
    { cwd: grammarRoot, encoding: "utf8" },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  const output = result.stdout;
  const missing = check.captures.filter(
    (capture) => !new RegExp(`capture:\\s+(?:\\d+\\s+-\\s+)?${capture.replaceAll(".", "\\.")}\\b`).test(output),
  );

  if (missing.length > 0) {
    console.error(`${path.basename(check.query)} missing captures: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`${path.basename(check.query)}: ${check.captures.length} expected captures verified`);
}
