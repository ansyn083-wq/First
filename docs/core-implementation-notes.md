# 分类核心实现说明

实现范围：`app/src/main/assets/classification-core.js`、`tests/classification-core.test.js`。UMD 浏览器依赖先加载的 `SubjectCore`，Node 使用本地 require；所有接口均为同步纯函数，不写 S、不持久化、不调用外部服务。

## 固定接口与返回类型

- `metadata(value)` 返回完整 `{module,series,year,edition}`，空年为 `''`。
- `rules(value,study)` 返回最多 200 条净化规则。规则存储约定为 `state.classificationRules`；无 enabled 字段视为启用。普通文字以大小写敏感的 `includes` 匹配，绝不作为正则执行。路由通过 `SubjectCore.validate`。
- `textSegments(item,type,state)` 返回带 `truncated:boolean` 属性的数组，最多 64 段，每段最多 1500 字符、相邻正文段重叠 300 字符。仅 `{page,body}` 元数据中的正整数 page 成为页码。原件补充正文只采用 ID 以 `import-` 开头且只关联这一个原件的导入笔记/错题，避免把多原件合并正文归给某一个原件。
- `evidence(item,type,state,proposedEvidence)` 返回最多 6 段核对后的引用；提议引用最多 300 字符，默认片段最多 240 字符。提供了非空提议但全部失败时返回空数组，不以默认片段掩盖失败。严格重新核对 quote、可选 source/sourceId/page/start，完全忽略传入 verified。`verified:true` 仅保证真实原文中存在，不保证分类判断正确。
- `matchRules` 恒返回 `{matches:[],conflict:false}` 形状；有一致的匹配才另外返回 routing/materialMeta。不同路由、无效专业路由、同一元数据字段的相反非空值都标冲突；人工锁定直接跳过。路由相同按科目、类别、方向、专业、课程、方向范围判断，置信度与说明文字不参与冲突判断。
- `reviewRows` 返回 SubjectCore.catalog 行并加 reviewKind，优先级 failed、conflict、uncertain；包含 classificationConflict 和本机规则冲突，跳过人工锁定。
- `matchesMetadata` 返回布尔值；`search` 返回最多 60 个命中，start 是命中文字在原文中的绝对偏移，contextStart 是 quote 上下文起点，match 为真实命中文字。sourceId 是真实条目 ID。检索词最多 200 字符。
- `similar` 返回 `{kind,keys,reason}` 数组并附 `limited:boolean`；最多检查前 500 行/20000 对。exact 只来自有效 SHA256 和相同 size；名称版本归一或长正文片段相同仅产生 similar，不执行删除。名称保留章节序号。
- `preview` 返回 `{changes,skipped,createdAt}`。skipped.reason 是 locked/missing/empty。最多选 500 条；非空元数据合并，空字段不清除已有内容；routing 部分字段合并，换科目清除不再适用的方向和专业/课程。默认跳过人工锁定，明确 `includeLocked:true` 才包含。变更设人工分类、递增 version、清除旧失败和自动规则标记。
- `apply(state,preview)` 和 `undo(state)` **直接返回新 state**，其中 `classificationUndo` 为撤销栈。无额外 state 包装对象。

## 撤销格式与并发保护

`state.classificationUndo = [{createdAt, changes:[{key,before,after,signature}]}]`，由旧到新最多 5 次，每次最多 500 条。key 为 `files:id` / `notes:id` / `mistakes:id`。

before/after 是显式白名单快照，仅保存 version/manual/subject/routing/materialMeta/status/routePending/classificationStatus/classificationError/classificationRetry/classificationConflict/classificationSuggestion/classificationCandidates/classificationRuleId，不包含正文、文件名、原件 path/字节或任意附加对象。chapter/tags/classificationEvidence 不由本模块修改，也不进入快照，撤销不会覆盖其后续编辑。

预览 signature 是分类快照与规范化 study 配置的稳定 JSON 字符串。apply 首先校验全部 key、唯一性、当前快照、签名、路由和 version，然后才构造新 state；任意一条失效均整体抛错。历史 signature 是净化后的 after 快照稳定 JSON。undo 先校验全部 after，资料删除或后续分类/version 变更会整体拒绝，不复活条目；成功撤销还会再次递增 version 拒绝迟到结果，并只为本次实际撤销的条目更新可连接的上一层签名，支持连续撤销。

`cleanUndo(value)` 丢弃不合形状/重复 key/超限的整次历史，只复制上述白名单并重算净化后签名。恢复备份时可用它保留安全撤销字段；净化不代表历史与当前条目一致，真正撤销仍需完整匹配当前 after。缺 version 的旧条目在快照中按 1 处理，可正常人工分类后撤销。

## 验证证据

- 核心初版先运行 13 个真实函数用例得到 13 RED，再实现得到全绿；后续边界修复先追加失败用例，再修改实现。
- 当前核心测试 20/20 通过，包括规则 ID 碰撞不终止、旧条目缺 version、跨资料连续撤销、后续 version 编辑保护、伪造引用/页码、正文分段边界、备份白名单。
- 本次全套 Node `tests/*.test.js` 运行当时为 187 项、181 通过、6 失败。6 项全部是仍在主代理接入中的 `classification-integration.test.js`：备份恢复 materialMeta、备份恢复撤销历史、本机规则免模型调用、冲突/人工锁定、缺本机分类支持、相反考试方向。这些属于主代理并行接入范围，已通知主代理；没有隐瞒失败或把该次全套测试报告为通过。

不运行 APK/真机/网络，未报告分类准确率。
