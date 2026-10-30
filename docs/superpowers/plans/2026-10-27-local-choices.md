# Local Subject Choices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans, inline in isolated0.9.1 source copy.

**Goal:** 板块本地首次选择、科目图标、可检索的专业与科目列表。
**Architecture:** 扩展SubjectCore及study配置；新major-catalog纯数据/检索，subject-options管理首次设置/列表，复用原件与科目页面。
**Tech Stack:** Android Java/WebView/SQLite，零新增运行依赖。
**Spec:** docs/superpowers/specs/2026-10-27-local-choices-design.md

## Global Constraints
稳定专业/科目ID；切换不移动文件；分类并发3保持；目录与考试科目不混淆；保存失败回滚。
## Review Focus
- 备份/重启后首次设置状态不丢；尚未确定不反复弹窗。
- 两个专业同名考试科目不能串资料；旧四科不丢。
- 新增/切换时旧AI返回不能改新档案。
- 搜索/新增/取消只操作选定档案，不隐式移动历史资料。
- 不把专业类别误当全国统一考试组合。

### Task1 Core/catalog
- [x] 写官方代码唯一/检索、配置迁移、专业过滤、备份roundtrip失败测试。
- [x] major-catalog.js + SubjectCore normalize/validate/migrate/matches/backup新字段；Node全绿。
### Task2 Per-block choices and lists
- [x] DOM测试首次数学/英语/专业询问、跳过/保存/重开、本地设置、专业新增切换/课程新增搜索。
- [x] subject-options.js/subject-ui.js/app.js/index/CSS；特色SVG本地图标。
### Task3 Review/package
- [x] Node全部、3组DOM、Java12组、源码APK比对及同签名升级验证。
- [x] 独立审查，失败回归后一次修复；打包保存APK/source。
