# 0.9.2 手机顶部遮挡与 AI 入口

根因：target35 在 Android15+ 强制边到边，但原生 WebView 没有消费系统栏安全区域；CSS 在800px以下隐藏了 avatar，AI入口复用了此类。

修复：API30+统一由原生FrameLayout处理systemBars/displayCutout/ime并消费，WebView在安全区域内布局，覆盖主页面、固定导航与全屏助手/阅读弹窗；API26–29维持系统decor fitting/adjustResize。不是写死状态栏高度。横竖屏、键盘和窗口大小变化由系统insets重派发。

AI按钮恢复全部宽度显示。仅540px及以下标题/操作分两行，AI保持右上方且44px触控大小；平板侧栏、栅格和标题布局保留。541–800px原来消失的AI也恢复。

回归：新样式测试先在360/412/540/768px失败（按钮display:none），1024px通过；修复后5个宽度全部通过。测试解析真实CSS规则/媒体查询与选择器级联；HappyDOM解析器需标准化@media后的空格，不改变CSS含义。DOM不模拟Android原生渲染。

自动化结果：116个Node测试、3个整应用DOM套件、12组Java测试通过，APK编译/签名成功。真机状态栏、软键盘和实际像素布局仍需设备复核，不能据此声称真机已验证。

参考：https://developer.android.com/develop/ui/views/layout/edge-to-edge
