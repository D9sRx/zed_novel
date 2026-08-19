# 06. 实施进度

任务只有在真实完成并验证后才勾选；当前提交 SHA 不写回同一提交。

## 总体进度

| 阶段 | 目标 | 状态 | 提交 |
|---|---|---|---|
| Phase 0 | 调研、架构、MVP 确认 | ✅ 已完成 | `docs: define novel reader architecture` |
| Phase 1 | 骨架与 Novel 语言 | ✅ 已完成 | `9d7b4bc` + 本阶段验收提交 |
| Phase 2 | TXT 导入 | ✅ 已完成（复审受限） | `633a863` |
| Phase 3 | EPUB 导入 | ⏳ 未开始 | - |
| Phase 4 | 进度与恢复 | ⏳ 未开始 | - |
| Phase 5 | 构建与交付 | ⏳ 未开始 | - |

## Phase 0

- [x] 调研 Zed 当前扩展能力
- [x] 确认本机 Rust、Node、Git、Zed 工具链
- [x] 记录无自定义 WebView/侧边栏限制
- [x] 选择 Rust/WASM + TypeScript + Tree-sitter
- [x] 编写愿景、选型、架构、格式和路线图
- [x] 用户确认 EPUB 导入、双层进度与 JSDoc 块注释伪装
- [x] 用户确认采用 MIT 并按公开发布准备
- [x] 初始化 Git 并提交 `docs: define novel reader architecture`

## 后续统一门禁

- [ ] 单元测试通过
- [ ] 类型检查通过
- [ ] Rust/WASM 构建通过
- [ ] Dev Extension 安装通过
- [ ] Windows 端到端验收通过
- [ ] Conventional Commit 提交

## Phase 1：项目骨架与 Novel 语言

- [x] 初始化 npm workspaces、TypeScript 与统一质量命令
- [x] 以 corpus 测试先行实现 Novel Tree-sitter grammar
- [x] 解析 metadata、chapter、paragraph、`@chapter-id` 与 bookmark
- [x] 添加 highlights、Outline 与 textobjects queries
- [x] 创建 `extension/` Rust/WASM Dev Extension
- [x] 验证 `npm test`：4/4 corpus parses，3 组 query 成功
- [x] 验证 `npm run typecheck`
- [x] 验证 `npm run build`
- [x] 验证 `cargo check --manifest-path extension/Cargo.toml`
- [x] 验证 `cargo build --release --target wasm32-wasip2 --manifest-path extension/Cargo.toml`
- [x] 在 Zed GUI 中安装 `extension/` 并打开 `.novel` 验证 Novel 语言模式
- [x] 用户截图确认 metadata、章节标题、正文、chapter id 与 bookmark 高亮生效
- [x] 用户通过 `Ctrl+Shift+O` 确认 Outline 显示“第一章 初见”
- [x] 独立代码审查未发现安全或手写逻辑错误，提交前部署 blocker 已由 Git 提交和 GUI 验收解除
- [x] 提交 `9d7b4bc feat: add novel language extension foundation`

## Phase 2：TXT 导入器

- [x] 新增 `packages/core` 标准文档模型与章节识别
- [x] 支持中文章/节/卷/回/部/篇及英文 Chapter/Prologue/Epilogue
- [x] 无标题文本自动分段，保留首个正式章节前的前言内容
- [x] 支持 UTF-8、UTF-8 BOM、GBK、GB18030 与显式编码覆盖
- [x] 低置信度、不安全或 UTF-8/GBK 歧义解码拒绝输出，避免静默乱码
- [x] 支持默认 `jsdoc` 与可选 `plain` formatter
- [x] 转义正文中的 `*/`、行首 `@` 和 `*`
- [x] CLI 支持输出冲突、`--force`、稳定退出码与原子临时文件写入
- [x] Windows 大小写、junction 和相同文件身份不能绕过“永不修改源文件”保护
- [x] 构建后 Node ESM CLI smoke 覆盖 CommonJS 互操作、GBK/GB18030、歧义拒绝及退出码 4/5
- [x] 验证 `npm ci`、`npm test`、`npm run typecheck`、`npm run build`
- [x] 验证 39/39 Vitest、4/4 grammar corpus 与全部 query capture
- [x] 构建后 CLI 导入并由 Tree-sitter 实际解析，无 `ERROR`/`MISSING`
- [x] 修复独立审查发现的 dist ESM、junction 源文件保护和编码歧义阻断项
- [ ] 最终独立复审通过（子代理工具授权阻止，未得出结论；不是代码失败）
- [x] 提交并推送 `633a863 feat: add safe txt novel importer`
