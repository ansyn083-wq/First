# 0.13.0 学习规划实施计划

用户已明确要求倒计时、可选考研年份、AI日报周报、每日任务清空、依据本周任务生成下周每日计划；并选择打开应用时自动补齐日报和周报。采用独立“学习规划”页，首页放倒计时、入口和所选日清空按钮，沿用现有配置及任务导入。

## 行为约定

- 考研年份按招生年份，支持初试首日自定义。唯一内置官方日期为2027考研初试2026-12-19，来源教育部2026-09-24公告 https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202609/t20260924_1451846.html 。其他年份不猜测日期；已过期显示已过天数，未设置提示设置。以本机日历日计算，无时区/夏令时除法误差。
- S.planner 保存 exam、autoReports、reports、clearedDates；备份恢复净化这些字段，不含API密钥。
- 自动报告仅前台、联网且已配置AI时运行，每次进入前台最多2份、串行：最近7天中最近一个有任务的已结束日，以及最近4个完整周中最近一个有任务的完整周，已存在的不重复付费生成。没任务不编造总结。手动可生成所选日/周报告；进行中的日期明确标注截至生成时刻。
- 报告依据任务逐事项的已记录完成情况，不能推断学习时长、正确率或掌握程度；仅发送任务及考研目标摘要。任务过多时明确截断。历史报告显示生成时刻；任务改变后提示旧报告可能过时。
- 清空仅所选日全部任务，确认日期/任务数后执行，失败回滚、防双击。记录该日重复任务抑制，避免重开/切前台自动生成已清空任务；不影响其他日、不终止将来重复计划。导入仍可追加任务。
- 下周指所选周的下一周（周一到周日）。模型必须返回7个确切日期的结构化任务，拒绝越界/重复日期/非法内容。预览逐日可取消任务，确认后使用Core.appendPlan追加合并，保留已有完成部分，不自动覆盖整周。预览与写入之间任务变更需重新生成预览。
- 新事务与分类、导入保存互斥；AI请求回来前等待事务完成并核验来源任务/配置，恢复后的新状态不接收旧结果。

## 文件与接口

1. 核心任务（新planner-core.js及tests/planner-core.test.js）。UMD依赖Core，导出：
   - validDate(value), addDays(date,n), weekRange(anchor,offset=0) => {start,end}。
   - normalize(value,today='YYYY-MM-DD') => {exam:{year,date},autoReports:boolean,reports:[],clearedDates:[]}，默认autoReports=true；默认2027官方日期仅在该初试尚未结束时使用，之后默认年份但日期留空。year2000..2100。reports最多120条，body最多20000，kind daily/weekly、start/end严格净化，id/model/createdAt/signature有限字符串。clear dates最多400个。
   - countdown(exam,today) => {year,date,days,phase:'before'|'today'|'past'|'unset'}。
   - signature(tasks,start?,end?) => 稳定的任务内容/完成/重复设置指纹，供迟到结果与预览验证。
   - snapshot(tasks,start,end) => {start,end,total,done,pending,bySubject,days:[{date,tasks:[{id,title,subject,done,repeat}]}],truncated,signature}，按Core.taskParts计真实事项，payload最多500条，不把未发送的内容冒充模型已读。
   - dueReports(planner,tasks,today) => [{kind,start,end}]，最多2条，遵循上述日/周策略。
   - clearDay(state,date) => 新state，原数组不突变；清空S.tasks该日期并S.planner.clearedDates记日期。
   - validatePlan(parsed,anchor) => {start,end,days:[{date,tasks:[{date,title,subject,repeat:false}]}],tasks:[扁平任务],note}，输入模型结构 {days:[{date,tasks:[{title,subject}]}],note}，7天精确，最多每日至12条、标题240字，科目限Core.subjects不含待确认，无效抛错。

2. UI任务（新planning-ui.js/css及tests/planning-ui.test.js）。使用现有S,PlannerCore,modal,E,btn等；独立document planning-*事件。导出renderPlanning(),planningHomeHTML(),planningRefresh()。新板块有考研目标编辑、所选日期、日报/周报生成及历史查看、自动补齐开关、下周规划按钮和逐日预览。首页小卡片显示倒计时和入口；清空按钮由root插入home并使用planning-clear-day事件。
   root提供异步函数：planningGenerate(kind,start,end,{automatic:false}={})->report；planningGenerateNextWeek(anchor)->preview（含tasks、days、start/end、sourceSignature）；planningImport(preview,indices)->{added,skipped}；planningCommit(patch)->保存{planner?,tasks?}并失败回滚；planningAIStatus()->{busy,message}。
   UI负责report正文转义、七日预览、勾选导入、日期年份无猜测、清空确认调用PlannerCore.clearDay并planningCommit，loading/空列表/失败提示，报告过时提示。task mutation由root负责busy序列和跨模块隔离。

3. Root接入及AI（新planning-ai.js，修改app.js/core.js/index/boot/existing busy边界）。planningCommit新S候选原子保存，失败回滚，规划busy独立互斥；同一时刻最多1个规划AI请求。原有分类AI等待规划事务、导入等待规划事务，分类UI拒绝重叠规划保存。自动前台hook调用planningAutoReports()。generateDaily尊重clearedDates。app导航新增planning，手机“更多”入口，首页插卡和所选日删除，备份挂接planner。

4. 完整回归与原签名发布0.13.0/code24。验证真实日期、跨周、任务部分完成统计、恶意模型输出、保存失败/双击/迟到结果/跨事务、清空后重启不重建、旧备份、自动两份串行去重、七日合并保留旧完成任务；手机平板Chrome检查；APK与源码资源一致和原签名核对。交付源码排除签名私钥。测试替身不代替真机和真实模型准确率验证。
