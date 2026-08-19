# 02. 系统架构

## 总览

```text
本地 TXT / 无 DRM EPUB
          |
          v
+--------------------------+
| novel-import (TypeScript)|
| 编码检测 / EPUB spine     |
| HTML 清洗 / 章节识别      |
+------------+-------------+
             |
             | .novel + .novel-state.json
             v
+-----------------------------------------+
| Zed                                     |
|  Novel Tree-sitter    可选 Novel LSP     |
|  高亮 / Outline       symbols / bookmark |
|             \          /                |
|              Rust/WASM Extension        |
+-----------------------------------------+
```

## 模块

### `extension/`

`extension.toml` 注册 Novel 语言、grammar、可选 language server；`src/lib.rs` 负责定位 Node 并启动服务。扩展本身不保存正文。

### `grammar/`

识别 metadata、chapter、paragraph、bookmark 和 jsdoc-disguise；`outline.scm` 从 JSDoc 块首行提取章节，`highlights.scm` 提供文档注释式正文，`textobjects.scm` 支持章节/段落导航。

### `packages/core/`

纯 TypeScript 领域层：编码后的标准文档模型、章节识别、格式化和 versioned progress schema。不得依赖 CLI/LSP。

### `packages/importer/`

- `novel import <input> --output <file> --style jsdoc`
- TXT：编码识别、换行规范化、章节切分。
- EPUB：校验 ZIP 路径，读取 container/OPF/spine/nav，清洗 XHTML。
- 临时文件写入后原子替换，绝不修改输入。

### `packages/language-server/`

只补充 Tree-sitter 无法完成且本机 Zed 实测支持的功能。LSP 失败不能阻断基础阅读、高亮和 Outline。

## 数据流

1. 用户运行导入器。
2. 导入器生成 `.novel` 和可选 sidecar。
3. Zed 按 suffix 选择 Novel language。
4. Tree-sitter 生成高亮与 Outline。
5. Zed 保存工作区/光标状态。
6. 用户显式保存书签；优先 LSP，若客户端能力不足则回退到 Zed Task + CLI。

## 故障回退

- 编码置信度低：要求 `--encoding`，不静默损坏文本。
- EPUB 缺 nav：回退 OPF spine + 标题启发式。
- LSP 启动失败：基础阅读仍工作。
- sidecar 损坏：报告错误并保留原文件。
- CodeLens/command 不受支持：提供 `.zed/tasks.json` 模板。
