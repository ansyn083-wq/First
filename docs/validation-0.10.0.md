# 0.10.0 词书与背词软件

用户要求解除固定红宝书，增加背词软件绑定，并在英语工作区仅显示绑定的软件查询入口。

- 可修改词书名称、类型、总词数(0–200000)、已学位置和每日目标(1–500)。新用户不再预填红宝书/357/lag；旧词书与原进度兼容迁移。
- TXT/CSV/TSV词表文件或粘贴导入，2MB/50000词上限，保留顺序、不区分大小写去重，跳过表头，导入前明确替换当前词表、从0开始。数据仅在本机，不上传词表。
- 一次绑定一个软件，设置内切换。英语资料页入口按当前软件显示；英语学习页只显示绑定软件的查询面板/官方入口。未绑定时不显示软件面板，仍可配置本机词书。
- 不背单词沿用第三方ID查询。墨墨接入官方Access Token只读今日进度；百词斩和扇贝仅绑定官方页面入口，明确不提供应用内统计，不冒充ID直查。
- 墨墨令牌由独立Android Keystore SecretStore保存，只向固定官方HTTPS域名发送；学习状态、JS加载返回、备份不含令牌。仅返回hasToken标志。解绑墨墨清除令牌。
- 前台30秒轮询，失败退避，暂停/不可见停查。切换绑定会取消旧计时并清空缓存，状态/绑定/日期/请求代次检查丢弃迟到结果。两款数据口径分别呈现，不自动勾选任务。
- 备份白名单保留词书、词表、进度、目标和软件选择，排除用户ID、令牌与统计缓存。旧备份兼容，新总词数不再被6590截断。

## 核对来源（2026-10-27）

- https://memodocs.maimemo.com/docs/PNvOw2E1AivPtlkRlQgce1W1n2c/ 官方说明支持进度互通，需个人Access Token。
- https://open.maimemo.com/api_bundle.yaml 官方schema: StudyProgress.finished/total/study_time(毫秒)，公测需开启自动同步并当日打开App。
- https://www.maimemo.com/pages/openapi-demo/index.html 官方演示的client-CRGoGVAd.js及operations-DBXQKBPF.js核对实际base https://open.maimemo.com/open 与POST /api/v1/study/get_study_progress（静态yaml路径含memo前缀，实施以当前官方演示路径为准）。
- 百词斩 https://baicizhan.com/；扇贝 https://web.shanbay.com/web/main。未找到可直接按用户ID查询学习进度的可靠官方接口，仅保留入口。

## 验证

130项Node测试通过；5组整应用DOM套件通过，覆盖绑定切换、迟到旧结果、墨墨字段口径、状态不含令牌、词表导入、进度大于6590和保存失败回滚。12组Java检查通过，全部JS语法检查通过，APK全部Java重编译与签名验证通过，证书与0.9.4一致，包内assets与源码逐字节匹配。

新功能测试补充了EnglishCore及英语面板模块，旧单模块统计测试相应加载实际模块。整应用回归发现无条件await英语处理器会把原来同步的资料翻页延后一轮，已改为只处理english前缀动作，原回归通过。

限制：无真实墨墨Token/不背单词非零账号联调，无安卓设备原生文件选择/键盘/像素排版验证；不能据DOM测试声称第三方实际服务已验证。外部官方入口只打开网页，不保证网页可直接展示学习统计。墨墨公测可能调整，服务更新延迟由源软件控制。

官方演示响应为success/data包装，解析兼容此包装及直接progress，拒绝success:false业务失败；相关回归先失败后通过。
