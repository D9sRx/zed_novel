# 07. Phase 1 验证记录

## 范围

Phase 1 只建立工程骨架、Novel Tree-sitter grammar 与 Zed Dev Extension。TXT/EPUB 导入器、可靠书签和 LSP 尚未实现。

## TDD 证据

### RED

先创建 `grammar/test/corpus/novel.txt`，再运行 `npm test`。首次运行失败，因为 `grammar.js` 尚不存在；创建初版 grammar 后继续出现 parser conflict 和 4 个 corpus case 全部失败。执行日志保留在本次 Hermes delegation transcript 中。

### GREEN

逐步收紧 metadata/chapter 分支与 paragraph 优先级后：

```text
Total parses: 4
successful parses: 4
failed parses: 0
success percentage: 100.00%
```

测试覆盖：

1. metadata block；
2. 带两个正文段落和 `@chapter-id` 的 chapter block；
3. 单行 bookmark；
4. 完整组合文档。

## 父代理独立验证

2026-08-19 在 Windows 11、Node.js 22.23.2、npm 12.0.2、Rust/Cargo 1.93.0 上重新执行：

| 命令 | 结果 |
|---|---|
| `npm test` | 通过；4/4 corpus parses，highlights/outline/textobjects query 均命中 |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过 |
| `cargo check --locked --manifest-path extension/Cargo.toml` | 通过 |
| `cargo build --locked --release --target wasm32-wasip2 --manifest-path extension/Cargo.toml` | 通过 |

生成的 WASM：`extension/target/wasm32-wasip2/release/novel_reader_extension.wasm`，验证时大小为 158851 bytes。构建目录由 `.gitignore` 排除。

## 查询验证

- `highlights.scm`：自动断言 `comment.doc`、`title`、`tag`、`string`、`constant`、`attribute` 六类 capture。
- `outline.scm`：自动断言 `item` 与 `name` capture。
- `textobjects.scm`：自动断言 `comment.around`、`class.around`、`function.around`、`function.inside` capture。
- `tooling/verify-queries.mjs` 会在合法 query 零匹配或缺少预期 capture 时返回失败，不只检查 CLI 退出码。

## Git grammar 拉取验证

按 Zed `ExtensionBuilder::checkout_repo` 的关键步骤，在空目录中执行本地 remote add、`fetch --depth 1 origin main` 和 `checkout main`。`file://D:/hermesWork/zed-novel-reader` 成功拉取，克隆后的 `grammar/src/parser.c` 存在且大小为 34180 bytes。

`tree-sitter build --wasm` 的独立尝试因本机没有 Emscripten 且 Docker Desktop 未运行而失败。Zed 使用自动管理的 WASI SDK 编译 grammar，故 grammar WASM 仍以 Zed Dev Extension 安装结果为最终验收依据；不得将 Rust `extension.wasm` 的成功构建混同为 grammar WASM 已验证。

## 已知限制

1. `extension/extension.toml` 开发期使用本机 Git 已验证可读取的 `file://D:/hermesWork/zed-novel-reader`、`rev = "main"` 和 `path = "grammar"`。这是本机 Dev Extension 配置，不可直接公开发布。
2. 公开发布前必须替换为真实远端仓库 URL 和固定提交 SHA。
3. Zed GUI 安装必须在 grammar 已进入 `main` 后验证，因为 Zed 会按 manifest clone Git revision，而不会读取未提交文件。
4. Tree-sitter CLI 在 Windows query 时生成 `grammar/parser.obj/.lib/.exp`；它们已明确忽略，并在提交前清理。
5. 当前开发 manifest 绑定本机绝对路径，仅适用于这台机器；公开发布前必须改为远端固定 revision。

## Zed GUI 验收

用户于 2026-08-19 在当前 Zed 中完成以下验收：

- 成功通过 `zed: install dev extension` 安装 `extension/`，并选择保留 Dev Extension。
- 打开 `grammar/test/fixture.novel` 后，右下角语言显示 `Novel`。
- 用户提供的实际截图确认 JSDoc 格式正常显示，metadata、章节标题、正文、`chapter_0001` 和 bookmark 属性均产生预期差异化高亮。
- 按 `Ctrl+Shift+O` 后，Outline 显示“第一章 初见”。
- Zed 生成 `extension/extension.wasm`（599515 bytes）和 `extension/grammars/novel.wasm`（8272 bytes）。两者保留在本机供 Dev Extension 使用，并由 `.gitignore` 排除。
- `C:/Users/24827/AppData/Local/Zed/extensions/installed/novel-reader` 解析到项目的 `extension/` 目录，确认开发扩展已挂载。

结论：Phase 1 的语言识别、语法高亮、grammar WASM 和 Outline 宿主集成全部通过。