# 分类管理升级：执行规格

用户已同意《资料分类管理-提升方案》。本轮交付可用的分类确认台、可核查依据、批量预览/修改/撤销、多维筛选及可编辑人工纠正规则，并提供本地分段检索和相似资料提示。保留原件、原件ID、人工锁定、原签名和英语双页签；不自动删除相似文件、不自动移动原文件，不声称模型置信度是实测准确率。

## 核心接口（ClassificationCore）

新增 UMD `classification-core.js`，浏览器依赖 SubjectCore，Node测试通过 require 引入 SubjectCore。纯函数不可修改传入S。

- `metadata(value)`：净化 `{module,series,year,edition}`；字符串限80/120/40，year=1900..2100整数或空字符串。
- `rules(value,study)`：净化规则数组，最多200条，`{id,name,enabled,field:'filename'|'text',match,routing,materialMeta}`，match为1..120字普通文字（不执行正则），routing经SubjectCore.validate验证，规则不含正文或密钥。
- `textSegments(item,type,state)`：真实本机可检索片段数组 `{source:'filename'|'body'|'page'|'note',sourceId,quote,start,page?}`；包含原件关联的导入笔记，页码只来自真实pages元数据。正文分段有界，截断可由返回数组的`truncated`属性标记；不编造OCR结果。
- `evidence(item,type,state,proposedEvidence=[])`：从上述片段验证模型提供quote/page，或提供文件名与正文片段作为“可核对内容”；输出`{source,sourceId,quote,start,page?,verified:true}`。模型不存在的quote/页码不允许标成已验证，最多6项。
- `matchRules(item,type,state)`：跳过 manual/人工锁定；返回`{matches:[规则],routing?,materialMeta?,conflict:boolean}`，不同匹配路由为conflict；同一路由可合并。不在纯函数内应用修改。
- `reviewRows(state)`：基于SubjectCore.catalog，返回需处理的行并附`reviewKind:'failed'|'conflict'|'uncertain'`，调用失败、显式冲突、needsReview/待确认正确分开，人工锁定不自动加入建议队列。
- `matchesMetadata(item,filters)`：module/series/year/edition组合精确过滤，all/空为不限。
- `search(item,type,state,query)`：在真实片段中检索，返回片段命中数组（含页/偏移），不依赖被精简的原件body。
- `similar(rows)`：返回有界候选组`{kind:'exact'|'similar',keys:[type:id],reason}`数组，不删记录。SHA256+size完全相同与相似名称/文本版本分开；比较规模限制必须返回`result.limited`标记，不把不同章节当确定重复。
- `preview(state,keys,patch,options={})`：返回`{changes:[{key,before,after,signature}],skipped:[{key,reason}],createdAt}`。patch={routing?,materialMeta?}，非空字段合并净化；默认跳过人工锁定，options.includeLocked仅明确人工操作时使用。before/after只含分类相关字段（含version/manual/status/routing/metadata/retry），不含正文、path和文件字节。设置为人工分类并increment version、取消旧失败/routePending。
- `apply(state,preview)`：校验所有key、签名，全部有效后返回新state与`classificationUndo`栈（最多5次），数组记录按稳定ID替换；任何冲突都抛错且原state不变。
- `undo(state)`：校验最后一次after签名，不能覆盖后续编辑或复活已删除资料；成功返回新state，version再次递增以拒绝迟到分类。单次最多500条。
- `cleanUndo(value)`：净化撤销栈供备份恢复，格式由core自行确定并在实现报告中说明；不得保留任意对象、原件路径、正文。

## 界面接口（ClassificationWorkbench）

新增 `classification-workbench-ui.js/css`，主代理负责挂接原页面。实现全局函数：

- `renderClassificationWorkbench()`：渲染当前#content的待确认工作台，三组筛选、搜索、选择、批量预览与撤销、规则管理。
- `classificationToolsHTML()`：普通资料页工具条（批量选择、多维筛选、规则、相似资料、撤销）。
- `classificationSelectHTML(row)`：为资料行输出选择控件；只在选择模式下显示。
- `classificationDetailButton(row)`：查看分类与依据的轻量按钮HTML。
- `classificationMatches(row)`：用于普通subjectRows附加多维过滤/关键词命中。
- `classificationRefresh()`：只在view=subjects时刷新当前页，普通页renderSubjects，待确认页工作台。
- `classificationReset()`：S根替换时清理选择/预览/缓存。

事件采用data-action=classification-*；新增独立document事件处理，不修改原路由文件。规则和批量操作提交必须确认具体预览；以候选新S持久化，失败回滚且防双击；version/锁定/配置改变使预览失效时要求重新预览；撤销保存失败也保留原栈。依据标注“本机原文”而非对分类正确性的保证，显示模型理由时不得标为已验证依据。

## 业务接入（主代理）

在现有分类开始前先检查本机规则，冲突保留待确认；人工锁定继续跳过。模型返回后验证/保存实际证据，证据不足或规则冲突标待确认。单条人工编辑保留多维metadata。Core.backup/restore保留分类metadata、rules和净化后的undo，清理不可信字段。subjectRows以稳定原件为入口，并使用linked正文检索；不改文件路径和原件生命周期。

发布0.12.0、版本码23、同包名同签名。基线为0.11.0。测试包括旧数据缺字段、备份恢复、失败回滚、双击、迟到AI结果、人工锁定、无效/伪造依据、跨专业规则、搜索精简原件正文、相似版本不删除、手机/平板溢出。人工标注验收集尚未获得，不报告实际准确率或提升百分比。
