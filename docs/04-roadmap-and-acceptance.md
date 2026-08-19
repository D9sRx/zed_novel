# 04. 路线图与验收

## Phase 0：设计确认

架构、边界和 MVP 验收标准明确；不创建业务代码。

## Phase 1：骨架与 Novel 语言

初始化 monorepo、Rust extension、TypeScript workspace 和最小 grammar。Zed 可安装 Dev Extension，`.novel` 自动进入 Novel 模式，章节出现在 Outline。

## Phase 2：TXT 导入

覆盖 UTF-8/BOM/GB18030/GBK；支持中英文章节识别、`plain`/`jsdoc` 输出和明确错误处理。

## Phase 3：EPUB 导入

解析 container、OPF、spine、nav/NCX；清洗 XHTML；阻止 Zip Slip；无 DRM EPUB 端到端成功。

## Phase 4：进度与恢复

实测 Zed 光标恢复；完成 sidecar schema、原子写入、源指纹和书签迁移；至少一种显式保存/跳转路径可用。

## Phase 5：打磨与交付

完整测试、类型检查、Rust/WASM 构建通过；Dev Extension 在本机 Zed 验收；给出可直接选择安装的扩展目录和 Windows CLI 产物路径。

## MVP 验收场景

1. GBK TXT 导入后无乱码、章节顺序正确。
2. 无 DRM EPUB 按 spine 顺序生成正文。
3. Outline 可搜索并跳章。
4. 重开 Zed 后恢复位置附近。
5. 显式书签重启后回到对应章节。
6. jsdoc 模式呈现为 `/** ... */` TypeScript 文档注释风格。
7. 原小说永远不被修改。
