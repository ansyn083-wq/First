# 验证方法

应用运行与APK构建均无第三方运行依赖；以下依赖只用于开发测试。

## JavaScript

`node --test tests/*.test.js`

## 界面串联（无浏览器）

安装测试专用 `happy-dom@17.4.4`，运行：

`YANXU_HAPPY_DOM_PATH=/你的路径/happy-dom/lib/index.js node tests/optimization-ui.mjs`

真实加载全部应用脚本，模拟Android桥接；验证200份长资料的分页/防抖、翻页缓存/位置恢复、中文问题检索、对话/笔记保存、批量类型、整理撤销、共享原件保护和保存失败回滚。DOM测试不验证安卓系统、视觉排版、真实服务或PDF渲染。

## Java及真实SQLite

准备 Android API35 的 android.jar、org.json 20240303、sqlite-jdbc 3.45.3.0、slf4j-api 2.0.13，运行：

`python3 scripts/check-java.py --sdk-jar /路径/android.jar --json /路径/json.jar --jdbc /路径/sqlite-jdbc.jar --slf4j /路径/slf4j-api.jar`

SQLite通过JDBC运行同一LearningStore生产代码，Android API适配器仅存在于tests/android-stubs；不会被build.py打进APK。覆盖大于8MB的旧数据迁移、旧JSON保留、正文分块、PDF正文不重复、全文索引、事务回滚和原件清理保护。备份测试使用真实ZIP、真实文件与SHA256，不模拟原件字节。

## APK及真机

`KAOYAN_ANDROID_SDK=/路径/android-sdk python3 build.py`

脚本编译全部生产Java、打包并验证APK v2/v3签名。仍需在安卓设备验证安装升级、数据库首次迁移耗时、PDF/图片、系统文件选择器、实际API、通知、软键盘与屏幕布局。

## 科目工作区0.9.0

使用同一Happy DOM依赖运行 `YANXU_HAPPY_DOM_PATH=/路径/happy-dom/lib/index.js node tests/subjects-ui.mjs`。覆盖科目导航、方向/课程/类型筛选、自定义专业、人工路由、3并发、PDF原页、统一导入AI分流、英语背词和旧目录。Node测试另覆盖迟到结果、归档科目、备份路由和恢复后的排队状态。

## 板块内设置0.9.1

`tests/local-options-ui.mjs`覆盖首次询问、未确定选择/重启、默认方向保存失败回滚、各板块独立设置、特色图标、专业目录/自定义新增/切换、同名科目独立归属。使用同一Happy DOM路径。
`YANXU_REVIEW_CASE=focus|course|escaping|save|direct ... node tests/local-options-review-ui.mjs`分别检查分类期间搜索焦点、跨专业新增后记住选择、名称按文字显示、失败专业保存与后续方向保存并发、英语背词直达入口首次询问。每次选择一个case。
