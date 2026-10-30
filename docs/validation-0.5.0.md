# 0.5.0 验证记录

- `node --test tests/*.test.js`：40项通过。
- Chromium：ui、race、features-0.2、ocr-race、interface-0.3、folders-0.4、import-recovery、folder-race、performance-ui、organization-ui、organization-recovery，共11组通过。
- 新场景：下载编号不抢章节顺序、第三至五章作业/解析唯一配对、套号/版本/上下册/AB卷/题号冲突不误配；SHA256去重，不按同名猜测；失败保存不删除副本；引用和OCR草稿迁移；确认后崩溃恢复复用已持久化指纹；40010字正文保留全部3篇且重复来源只导入一次。
- 任务：同日部分重复合并，保留完成部分；不同日期/数量保留；完全相同但重复设置不同合并；现有任务完成与编辑测试通过。
- Java：StateCodec、PlanSheetReader、DocumentTextReader、WorkQueues、FileDigest共5组通过。编译有现有PlanSheetReaderTest未经检查泛型警告，无错误。
- APK：包名cn.kaoyan.assistant，versionCode6，versionName0.5.0；v2/v3签名通过，与旧版证书一致。
- 没有真实安卓设备/用户API，未验证真机安装、系统文件选择器、通知、系统PDF阅读器、真实模型调用。浏览器使用原生桥测试替身，仅验证应用侧流程。
- 原件校验首次处理旧文件仍需要磁盘读取；未做真实平板耗时承诺。自然语言改写相似的任务不会猜测合并。
