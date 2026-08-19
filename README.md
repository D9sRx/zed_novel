# Zed Novel Reader

在 Zed 编辑器中低干扰阅读本地 TXT/EPUB 小说的扩展项目。本项目遵守 Zed 官方扩展边界，不假设存在 WebView 或自定义侧边栏 API。

## 当前状态

Phase 0：架构与 MVP 范围已确认；准备进入 Phase 1。

## MVP 体验

1. 导入本地 `.txt` 或无 DRM `.epub`，生成 UTF-8 `.novel` 阅读文件。
2. 在 Zed 中打开 `.novel`，自动进入 Novel 语言模式。
3. 通过 Zed Outline 查看、搜索并跳转章节。
4. 使用 Zed 自带会话恢复继续阅读，并可保存显式书签。
5. 默认使用 `/** ... */` JSDoc 块注释伪装，屏幕上看起来像普通 TypeScript 文档注释。

## 重要限制

- Zed 当前扩展不能新增任意 WebView、阅读侧栏或工具栏。
- EPUB 是二进制容器，需先导入，不能直接显示为可读文本标签页。
- 扩展不能可靠监听每次滚动，MVP 采用“Zed 会话恢复 + 显式书签”，不虚假承诺逐像素自动进度。
- 只读取用户提供的本地文件，不集成盗版书源，不处理 DRM。

## 文档

- [项目愿景](docs/00-project-vision.md)
- [技术选型](docs/01-tech-stack-decision.md)
- [系统架构](docs/02-architecture.md)
- [阅读格式与进度](docs/03-reading-format-and-progress.md)
- [路线图与验收](docs/04-roadmap-and-acceptance.md)
- [MVP 待确认项](docs/05-mvp-scope-and-open-questions.md)
- [实施进度](docs/06-implementation-progress.md)
- [详细实施计划](.hermes/plans/2026-08-19_zed-novel-reader-mvp.md)

## 计划技术栈

Rust + `zed_extension_api` + WebAssembly、TypeScript + Node.js、Tree-sitter、Vitest、LSP。

## 编码启动条件

确认 `docs/05-mvp-scope-and-open-questions.md` 中的决策后，才进入 Phase 1。
