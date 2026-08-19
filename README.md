# Zed Novel Reader

在 Zed 编辑器中低干扰阅读本地 TXT/EPUB 小说的扩展项目。本项目遵守 Zed 官方扩展边界，不假设存在 WebView 或自定义侧边栏 API。

## 当前状态

Phase 2：TXT 导入器已完成并通过自动化与构建产物验证。独立审查发现的阻断项均已修复；最终复审因子代理工具授权限制未能执行。EPUB、书签 sidecar 与 LSP 尚未实现。

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
- [Phase 1 验证记录](docs/07-phase1-verification.md)
- [Phase 2 验证记录](docs/08-phase2-verification.md)
- [详细实施计划](.hermes/plans/2026-08-19_zed-novel-reader-mvp.md)

## 计划技术栈

Rust + `zed_extension_api` + WebAssembly、TypeScript + Node.js、Tree-sitter、Vitest、LSP。

## 开发验证

```bash
npm ci
npm test
npm run typecheck
npm run build
cargo check --locked --manifest-path extension/Cargo.toml
cargo build --locked --release --target wasm32-wasip2 --manifest-path extension/Cargo.toml
```

## 导入本地 TXT

先构建 CLI：

```bash
npm ci
npm run build
```

导入一本小说：

```bash
node packages/importer/dist/cli.js import "D:/Books/小说.txt" \
  --output "D:/Books/小说.novel"
```

常用参数：

- `--style jsdoc|plain`：默认 `jsdoc`，适合在 Zed Novel 模式中阅读；`plain` 输出普通文本。
- `--encoding utf-8|gbk|gb18030`：编码检测不确定时显式指定。
- `--force`：允许替换已有输出；即使启用也绝不会把输入文件本身作为输出。

导入完成后在 Zed 中打开 `.novel`，右下角应显示 `Novel`，按 `Ctrl+Shift+O` 可跳转章节。

本地 Dev Extension 目录：`extension/`。grammar manifest 已指向 GitHub 仓库和固定提交 SHA，`path = "grammar"`。

详细结果见 [Phase 1 验证记录](docs/07-phase1-verification.md)和 [Phase 2 验证记录](docs/08-phase2-verification.md)。
