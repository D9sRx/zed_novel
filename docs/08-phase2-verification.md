# 08. Phase 2 验证记录

## 范围

Phase 2 实现本地 TXT 导入链路：标准文档模型、章节识别、编码解码、`plain`/`jsdoc` 格式化、原子写入和 Node.js CLI。本阶段不包含 EPUB、进度 sidecar、LSP 或 Windows 单文件可执行程序。

## TDD 与缺陷修复

主要功能均先建立失败测试再实现。父代理复核和独立审查额外发现并以 RED/GREEN 或失败的构建产物 smoke 修复五个问题：

1. 有正式章节时，第一章之前的前言会被丢弃。失败测试确认后，改为生成 `auto_0001` 自动分段，并保持首个正式章节为 `chapter_0001`。
2. Windows 路径大小写不敏感，`Book.txt` 与 `book.txt` 可绕过字符串相等检查。失败测试确认后，路径比较在 Windows 上规范化为大小写无关形式。
3. Vitest 的模块转换掩盖了 `iconv-lite` CommonJS/ESM 互操作问题，编译后的 CLI 执行 GBK 导入时报 `iconv.decode is not a function`。新增 `tooling/verify-dist-cli.mjs` 复现失败，改用默认导入并启用 `esModuleInterop` 后转为 GREEN；该 smoke 已纳入 `npm run build`。
4. Windows junction 可让两条不同词法路径指向同一个输入文件。失败测试复现源文件被覆盖后，写入前增加文件系统身份（device/inode）比较，junction 和 hardlink 别名会被拒绝。
5. GBK“路”的字节 `C2 B7` 同时是合法 UTF-8“·”。失败测试确认无 BOM 自动路径会静默选错后，改为：若字节可分别按 UTF-8 与 GB18030 无损往返且文本不同，则返回编码错误并要求显式 `--encoding`。

## 功能覆盖

### 章节识别

- 中文：第 N 章/节/卷/回/部/篇，支持阿拉伯数字、全角数字、中文数字、合理空格和标题后缀。
- 英文：`Chapter N`、罗马数字、`Prologue`、`Epilogue`。
- 仅整行匹配，正文中的“第十二章”不会误识别。
- 混合 CRLF、CR、LF 会规范化。
- 无标题文本每 200 行生成明确的 `[自动分段 N]`；空文档保持零章节。

### 编码

- UTF-8 使用 fatal 解码；UTF-8 BOM 会被移除并记录。
- GBK/GB18030 使用高置信度检测和编码 round-trip 校验。
- 低置信度或不安全字节返回编码错误，并提示使用 `--encoding`。
- UTF-8 与 GBK/GB18030 均可无损解释但文本不同时视为歧义，不自动猜测。
- 显式支持 `utf-8`、`gbk`、`gb18030`。

### 输出安全

- 默认 JSDoc 格式与 Phase 1 Novel grammar 兼容。
- 正文 `*/` 输出为 `*\/`，行首 `@`、`*` 会转义，防止正文变成控制标记。
- 输入与输出相同（含 Windows 仅大小写不同、junction 或 hardlink 别名）时始终拒绝，即使使用 `--force`。
- 默认拒绝覆盖；`--force` 覆盖已在 Windows 实测。
- 使用同目录唯一临时文件后 rename；rename 失败会清理临时文件。

## 自动化结果

2026-08-19 在 Windows 11、Node.js 22.23.2、npm 12.0.2 上执行：

| 命令 | 结果 |
|---|---|
| `npm ci` | 通过，锁文件安装成功 |
| `npm test` | 通过；Vitest 39/39、grammar corpus 4/4、query capture 全部通过 |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过，生成 core/importer `dist`，并运行构建后 CLI GBK/GB18030/退出码 smoke |
| `npm audit --audit-level=high` | 0 vulnerabilities |

测试分布：core model 1、core parser 14、decode 8、formatter 4、CLI/atomic write 12。

## 端到端 Smoke Test

构建后执行：

```bash
node packages/importer/dist/cli.js import sample.txt --output sample.novel
```

UTF-8 样本真实结果：`Imported 2 chapter(s)`。输入包含前言、正式章节和正文 `*/`；输出包含 `auto_0001`、`chapter_0001` 和 `*\/` 转义。随后用 Tree-sitter 解析输出，得到 metadata block、两个 chapter block、paragraph 和 chapter ID，未出现 `ERROR` 或 `MISSING`。

构建后 smoke 还生成真实 GBK、包含扩展字符的 GB18030 及 `C2 B7` 歧义文件并调用 `dist/cli.js`，确认标题和正文无乱码、歧义自动检测返回 4、显式 GBK 恢复“路”，同时确认输出冲突返回 5。

## CLI 退出码

| 代码 | 含义 |
|---|---|
| 0 | 成功 |
| 2 | 参数错误 |
| 3 | 文件/IO 错误 |
| 4 | 编码错误 |
| 5 | 输出已存在 |

## 构建产物

- `packages/core/dist/index.js`
- `packages/importer/dist/index.js`
- `packages/importer/dist/cli.js`

`dist` 由 `.gitignore` 排除，可通过 `npm run build` 重建。

## 已知限制

- 编码统计检测不能保证覆盖所有短文本；不确定时必须使用 `--encoding`。
- `plain` 输出不带 Novel JSDoc 结构；若使用 `.novel` 后缀，Zed Novel grammar 不会提供完整章节结构，建议 plain 输出使用 `.txt`。
- 直接调用 formatter 并手工构造不合法的空标题、控制符开头标题或 chapter ID 时尚未统一校验；CLI 的 parser 生成值不受此影响。
- 默认不覆盖模式仍存在极小的并发 TOCTOU 窗口；普通单进程使用会拒绝已有输出，后续可改为原子 no-clobber 提交。
- EPUB、可靠书签和 Windows 单文件 CLI 留待后续阶段。

## 独立审查状态

独立审查曾实际发现并复现以下阻断问题：构建后 `iconv-lite` ESM 互操作失败、Windows junction 绕过源文件保护，以及 UTF-8/GBK 歧义静默错字。它们均已修复，并加入 Vitest 或构建后真实 CLI smoke。

修复后的最终复审任务因子代理工具环境要求额外用户授权，未能读取 staged diff 或运行命令，因此结论为 `inconclusive`。本记录不把它写成“审查通过”；提交依据是父代理完成的严格 `set -e` clean gate、真实 dist smoke、Tree-sitter 解析和全部回归测试。