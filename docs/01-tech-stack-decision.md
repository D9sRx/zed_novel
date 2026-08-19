# 01. 技术选型

## 结论

采用混合架构，而不是把 EPUB 解析和状态管理全部塞入 Zed WASM 扩展。

| 模块 | 选择 | 原因 |
|---|---|---|
| Zed 扩展入口 | Rust + `zed_extension_api` | 官方程序化扩展方式，编译至 `wasm32-wasip2` |
| 小说语法 | Tree-sitter | 提供高亮、Outline、文本对象和章节解析 |
| 导入器 | TypeScript + Node.js | TXT/EPUB 生态成熟、便于测试，也符合项目语言偏好 |
| 轻量语言服务 | TypeScript LSP，按需启用 | 补充符号和书签能力；Tree-sitter 能完成的功能不重复实现 |
| TXT 编码 | 编码检测 + `iconv-lite` | 兼容 UTF-8、GB18030/GBK 等中文文本 |
| EPUB | ZIP + OPF/nav/NCX 解析 | 仅支持无 DRM EPUB，按 spine 顺序提取 |
| 测试 | Vitest、Tree-sitter corpus、Cargo checks | 分层验证转换、语法与扩展构建 |

## 为什么不是 MCP

MCP 面向 Agent Panel 工具与上下文，不适合长时间连续阅读，且交互更显眼并引入 token 成本。

## 兼容策略

- 用本机真实 Zed 安装 Dev Extension 验证，不只依赖文档推断。
- 实现时选择与本机 Zed 实测兼容的 `zed_extension_api` 稳定版本。
- Node 优先使用 Zed Extension API 提供的运行时/安装机制；开发环境允许直接运行构建后的服务。

## 发布策略

MVP 先交付 Dev Extension + Windows 可运行 CLI。稳定后再决定是否进入 Zed extension registry、npm 和 GitHub Releases。
