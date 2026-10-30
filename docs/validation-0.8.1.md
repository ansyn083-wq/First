# 0.8.1 验证

Node: `node --test tests/*.test.js`，88项通过。
DOM: `YANXU_HAPPY_DOM_PATH=... node tests/optimization-ui.mjs`，通过。
新增覆盖：旧失败记录自动恢复、退避与停止、错误保存/清除、原生后台/隐藏/离线/关闭自动归类/人工锁定时不发请求、编辑后迟到结果不覆盖、PDF无正文切换且归类/编辑入口仍可用。
Android Java未修改；构建编译全部生产代码并验证v2/v3签名。未运行实际设备、真实网络服务、视觉布局测试。

实现选择：用户授权修复或移除不可靠正文，采用移除PDF文字展示入口，保留数据和原件；Office无PDF时仍允许明确标注不完整的文字预览。继续使用现有Android/WebView结构。
