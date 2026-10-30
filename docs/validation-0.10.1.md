# 研序 0.10.1 修复与验证

已使用用户提供的原始源码及原签名文件构建修复版，修复本次检查发现的 5 类问题。

## 安装

先在旧版导出完整备份，再直接安装 `yanxu-0.10.1.apk`。不要先卸载旧版。

- 包名仍为 `cn.kaoyan.assistant`。
- versionCode 从 20 升为 21，版本号为 0.10.1。
- 新旧签名证书 SHA-256 完全一致：`f299f0de0c881cdba5e8a88940471085dc28d471bcecaf4d8832d1d682435a52`。
- v2、v3 签名验证及 ZIP 对齐检查通过。
- 以上满足同签名覆盖更新的包名、版本和签名条件；尚未在安卓真机实际安装升级。

## 修复内容

1. **备份恢复**：移除越界的 `loaded` 引用；两种恢复共用恢复锁，并在提交前排空学习数据和阅读位置保存队列。失败时保留原状态，避免旧排队写入覆盖恢复结果。
2. **AI 密钥保护**：更换地址而未输入新 Key 时，界面与原生层都拒绝保存；网络请求在同一同步块获取配置与密钥，避免并发切换时混用地址和密钥。
3. **重复任务**：从最新系列版本生成，关闭重复后不再从早期历史重新生成。合并交叠事项时保留完整重复模板；相关字段可随备份恢复。
4. **任务延期**：只移动未完成子事项，保留当天已完成事项与统计。写入失败回滚；连续点击也不会覆盖回滚结果。部分完成的重复任务保留完整日常模板。
5. **首页词书**：展示实际词书、绑定软件、总词数和百分比；未设置总量时明确提示。

独立代码复核另发现并修复了重复任务交叠合并、延期双击失败、恢复前保存队列及切换服务凭据读取的边界问题。最终复核未发现这几项修改的剩余阻断问题。

## 已通过的验证

| 验证 | 结果 |
|---|---|
| 原 130 项 JavaScript 测试及新增 20 项回归测试 | 150 项通过，0 失败 |
| 原生核心 Java 测试 | 13 个测试程序通过 |
| 完整加载应用脚本的 DOM 界面测试 | 11 组通过 |
| Java 全部生产源码编译、DEX 转换和 APK 打包 | 通过 |
| APK 签名及对齐检查 | 通过 |
| 包内 28 个界面资源与最终源码逐字节比较 | 一致 |

新增测试先在缺陷存在时观察失败，再验证修复后通过。恢复竞态使用真实保存队列与受控存储返回，不只检查变量或代码文本。

13 个 Java 程序包括：`ApiKeyPolicyTest`、`StateCodecTest`、`FileDigestTest`、`AttachmentTransferTest`、`PageRasterSizeTest`、`DocumentTextReaderTest`、`PlanSheetReaderTest`、`WorkQueuesTest`、`PreviewQueueTest`、`OfficeCacheTest`、`ArchiveIOTest`、`FullBackupTest`、`LearningStoreTest`。其中 ZIP/原件校验使用真实文件；数据库测试运行真实 SQLite，包含超过 8MB 的旧数据迁移和事务回滚。

编译仍有 Java 8 目标版本及 Android 废弃 API 提示，未出现编译错误。SQLite 日志提示未配置 SLF4J 日志输出器，不影响测试结果。

## 未通过或尚未验证的部分

独立的 `office-service` 服务代码未修改。本机未安装 LibreOffice（`soffice`），因此原有 Python 服务测试执行结果为 1 失败、1 错误：

- `OfficeServiceTest.test_auth_limits_bad_file_cleanup`：测试将未找到的 `soffice` 路径传为 `None`，健康检查报错。
- `OfficeServiceTest.test_real_docx_formula_table_image_and_two_slide_pptx`：缺少转换引擎，真实文档转换返回 500。

这两项没有计入通过结果，也不能据本次运行确认真实 Word/PPT 转 PDF 可用。APK 的 Office 缓存测试和界面关联测试已通过。

尚未验证：安卓真机覆盖升级及重启后的数据保留、真实服务 API 调用、Android 并发调度、相机/文件选择器、通知送达、实际 Office 转换与 PDF 视觉排版。

## 文件校验

`yanxu-0.10.1.apk` SHA-256：

`76e6f5f4a1c45a78110ce88d9076e0661095055949362a31e3b8b3e968fed48a`

随附 `yanxu-source-0.10.1.zip` 包含最终源码、回归测试、可在 Windows/Linux 使用的构建脚本及用户原有个人预览签名。测试依赖仅用于开发，不打入 APK。
