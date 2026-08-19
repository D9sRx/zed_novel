# Zed Novel Reader MVP Implementation Plan

> **For Hermes:** 用户确认后按阶段执行；每阶段测试、验证并使用 Conventional Commit。

**Goal:** 构建可在 Windows Zed 中安装的本地 TXT/EPUB 小说阅读扩展，支持章节导航、进度恢复和注释伪装。

**Architecture:** Rust/WASM 注册 Novel 语言与可选 Node 语言服务；Tree-sitter 提供解析、高亮和 Outline；TypeScript importer 安全转换 TXT/EPUB；进度采用 Zed 会话恢复与 sidecar 显式书签。

**Tech Stack:** Rust, zed_extension_api, wasm32-wasip2, TypeScript, Node.js, Tree-sitter, Vitest, LSP.

---

## Task 1：初始化仓库与质量门禁

创建 workspace、格式化/类型检查/测试/构建脚本；先写失败 smoke test，再补最小配置；验证后提交 `chore: initialize novel reader workspace`。

## Task 2：Tree-sitter Novel grammar

为 chapter、paragraph、bookmark 写 corpus 测试；实现 grammar、highlight、outline、textobject queries；提交 `feat: add novel tree-sitter grammar`。

## Task 3：Zed Dev Extension

创建 `extension.toml`、Rust WASM 入口和 Novel language 配置。先不启用 LSP，证明模式、高亮、Outline 工作；在本机安装验证；提交 `feat: add zed novel language extension`。

## Task 4：核心模型与章节识别

在 `packages/core` 以 TDD 覆盖中英文章节、误匹配、混合换行、空文档和超长行；提交 `feat: detect novel chapters`。

## Task 5：TXT importer

覆盖 UTF-8/BOM/GB18030/GBK，低置信度要求 `--encoding`；实现 `plain`/`jsdoc`（`/** ... */` 块注释）和原子写入；构建 Windows CLI；提交 `feat: import txt novels`。

## Task 6：EPUB importer

先写 container/OPF/spine/nav 与 Zip Slip 失败测试；实现无 DRM EPUB 解包、顺序提取和 XHTML 清洗；提交 `feat: import epub novels`。

## Task 7：进度 sidecar

定义 versioned schema、源指纹、章节内行号；测试损坏状态、原子写入、源变化和书签迁移；提供 bookmark CLI；提交 `feat: persist novel bookmarks`。

## Task 8：评估并接入最小 LSP

先做 spike 验证 Zed 的 symbols、CodeLens/commands。只实现实测成功且 Tree-sitter 无法覆盖的能力；失败则用 `.zed/tasks.json` 回退，不伪造支持。

## Task 9：端到端验证与交付

用 TXT/EPUB fixtures 验证导入、Outline、恢复和书签；运行完整测试、类型检查、WASM 构建；给出扩展目录与 CLI 产物绝对路径；更新进度文档。

## 风险门禁

- grammar 发布必须使用可固定的远端 revision；开发期可 `file://`，发布前切换固定 SHA。
- npm/Node 机制若不兼容本机 Zed，评估自包含 sidecar，不能要求用户复制不透明脚本。
- 任何功能都必须在真实 Zed 中验证，不能以“理论支持”代替结果。
