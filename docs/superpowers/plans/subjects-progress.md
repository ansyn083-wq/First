# SDD ledger — plan: docs/superpowers/plans/2026-10-27-subjects.md
隔离源目录0.9.0，无git仓库，保留0.8.1原目录与签名。
Pre-flight: 路由元数据由SubjectCore统一校验；UI和AI均消费同一课程ID与方向枚举；备份恢复调用迁移再显示。
Task 1: complete — SubjectCore与备份恢复；路由/迁移/方向/自定义科目/人工编辑保留覆盖，Node全部101通过。
Task 2: complete — 3并发和冷却、原生4线程、最多3页图片采样、统一文件分类；Java12组通过，Node并发与迟到结果覆盖。
Task 3: complete — 科目工作区、资料页签/筛选/专业课配置、统一导入、原页阅读与旧目录；2组DOM串联通过，APK构建签名验证通过。进入整体独立审查。
Implementation choice: source is an isolated directory copy without git; commits/worktree scripts unavailable. Current spec and prior 0.8.1 directory provide the review baseline.

Final review: independent reviewer, 4 Important findings, 0 Critical/Minor. All 4 fixed in one pass with failing regression first, suite105/105 + both DOM suites green.
- fixed archived AI route preservation — stored AI assignments survive archiving and backup.
- fixed stale derived-note propagation — original identity/version/route/status must match starting snapshot.
- fixed duplicate import classifier reset — queued/in-flight canonical file left intact.
- fixed cross-file merged-note evidence — use only single-source linked text, otherwise own page/filename sample.
Declined-to-judge items: real-device WebView layout, Android PDF resource use, actual AI/network behavior. These remain explicitly unverified, are not passed off as tested, and do not block delivering a signed reviewable APK.
