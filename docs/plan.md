# 考研助手首版实施计划

Goal: 提供可安装的本地优先安卓试用APK，而非仅有界面图片。
Architecture: 安卓Java外壳、私有文件持久化、Keystore保护密钥、内置WebView静态界面；网络由原生层完成，网页不接触密钥或远端脚本。
Tech Stack: Android API 35，最低API 26，Java 8字节码，HTML/CSS/JavaScript，无第三方运行时依赖。
Spec: ../kaoyan-assistant-design.md（源码包包含副本）。

## Global constraints
- 用户自行输入API接口、Key和模型；英语页输入不背单词ID，不能硬编码用户ID或密钥。
- 保存笔记和错题后才异步分类，失败不丢内容，旧结果不得覆盖人工修改。
- 不下载视频；课件按需导入；仅可读文本进入检索，引用可定位。
- 英语统计仍处于试接入，不依据未验证字段自动勾选任务。
- 首版支持OpenAI兼容的models与chat/completions协议；其他协议需适配，界面说明。

## Review focus
- 中文搜索和HTML特殊字符必须安全显示。
- 旧日期统计不得变为今日进度，网络失败不清零。
- 导入备份不能带入API密钥或伪造高权限配置。
- API分类晚到时不覆盖新内容或人工分类。
- 任意外部网址不能获得JavaScript原生桥。

## Tasks
1. 写核心行为测试并观察失败：检索、引用、分类竞争、统计校验、备份校验。
2. 实现core.js并通过node --test tests/core.test.js。
3. 实现原生MainActivity、SecretStore、文件导入与导出、网络适配、通知；编译检查。
4. 实现平板/手机响应式界面：任务、英语、笔记、错题、资料、检索问答、设置；浏览器集成验证。
5. 构建签名APK并校验签名、清单和包内容，独立代码审查后修复关键问题；保存APK与源码说明包。

## First-version boundaries
需要用户实际平板安装验证；不能在没有用户API凭据的情况下声称真实AI测试已通过。PDF文本提取依赖Android15+，其他系统可保存文件但不全文检索。扫描件OCR、完整6590词表、云同步和持续后台拉取后续扩展。
