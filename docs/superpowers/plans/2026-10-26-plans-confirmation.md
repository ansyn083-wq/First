# 每科计划及确认性能 Implementation Plan
> 本会话直接执行，完成后独立审查。
Goal: 同日各科一张计划卡，导入确认去掉重复全量保存。
Architecture: Core仅派生分组；App渲染并按源任务/事项索引更新。导入日志保存用于去重的匹配指纹，ACK批量清理。
Spec: docs/superpowers/specs/2026-10-26-plans-confirmation-design.md
- [x] tests: 分组跨日隔离、部分完成/重复设置不变，浏览器逐项更新；确认只有一次全量写入、恢复日志保留校验、失败不删除。
- [x] core.js / app.js / style.css: groupPlans、按科卡片、逐事项勾选、总进度按事项数。
- [x] organization-ui.js / library.js / MainActivity.java: knownFingerprints写日志，恢复前重放；ACK一次传清理路径。保持旧日志兼容。
- [x] 完整Node/浏览器回归，Java及APK签名，独立审查，0.5.1 APK/源码交付。
Review: 混合重复设置、部分完成、确认后崩溃、ACK失败重试、校验后旧文件变化。
