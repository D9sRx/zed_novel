# 03. 阅读格式与进度

## `.novel` 格式草案

```text
/**
 * @novel-title 示例书名
 * @format-version 1
 */

/**
 * 第一章 初见
 *
 * 这是正文第一段。
 * 这是正文第二段。
 *
 * @chapter-id chapter_0001
 */

/** @bookmark id=main chapter=1 line=2 */
```

它是不会执行的纯文本，由 Novel grammar 解析，不交给 TypeScript 编译器。章节本身不需要附加假的变量或类型声明，避免无意义内容打断阅读。

## 输出风格

- `plain`：干净的章节和正文。
- `jsdoc`（MVP 默认）：每章一个 `/** ... */` 块，正文行使用 ` * ` 前缀，看起来像 TypeScript/JSDoc 文档注释。
- 更多模板后置，避免 MVP 过度扩张。

## 章节识别优先级

1. EPUB nav/NCX + spine；
2. 中文 `第...章/节/卷/回/部/篇`；
3. 英文 `Chapter N`、`Prologue`、`Epilogue`；
4. 无标题时生成固定大小分段，但明确标记为自动分段。

## Sidecar 草案

```json
{
  "version": 1,
  "sourceFingerprint": "sha256:...",
  "book": "relative/path/book.novel",
  "bookmark": {
    "chapterId": "chapter_0012",
    "line": 37,
    "updatedAt": "ISO-8601"
  }
}
```

保存为 `<book>.novel-state.json`，建议加入 `.gitignore`。

## 双层恢复

1. **无感恢复**：依赖 Zed 内建工作区、标签页和光标恢复；不保证跨工作区或重生成后完全准确。
2. **可靠书签**：用户显式保存章节 ID + 章节内行号。

MVP 不声称能监听每次滚动。若 LSP 命令不可行，用 Zed Task 获取当前文件/行并调用 CLI。

## 源文件变化

sidecar 保存 SHA-256 指纹。重新导入后按章节标题和相对位置迁移；不确定时保留旧状态并提示，不静默跳错位置。
