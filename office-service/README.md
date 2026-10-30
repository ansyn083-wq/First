# 研序 Office 转 PDF 服务

本包需要单独部署，APK内没有内置LibreOffice。服务把DOC/DOCX/PPT/PPTX转成PDF，供研序原页阅读，不调用AI接口。LibreOffice不收按次AI费用；服务器、域名、网络仍使用你的资源。转换后的复杂字体/公式应与原件核对，不能保证所有Office文件版式完全一致。

## 运行方式

适用于已有Docker Compose的Linux服务器。建议为此服务使用独立域名和至少2GB可用内存，磁盘需容纳原件、转换结果及办公引擎。示例每实例只处理一份转换，默认单文件最大500MiB、转换超时180秒。

1. 将本目录上传至服务器，并将域名的DNS A记录指向服务器。
2. 复制 `.env.example` 为 `.env`。
3. `.env` 填写 `OFFICE_DOMAIN=office.你的域名`，以及随机 `OFFICE_TOKEN`。令牌须24至128位字母、数字、下划线或横线，可用 `python3 -c 'import secrets; print(secrets.token_urlsafe(32))'` 在服务器上生成。不要把令牌发到聊天里。
4. 运行 `docker compose up -d --build`。默认Caddy使用80/443端口申请HTTPS证书；若服务器已有反向代理，接入原代理并移除示例gateway端口映射，不覆盖现有站点。
5. 研序 → 设置 → Office文档预览，填 `https://office.你的域名` 和同一令牌，保存后测试连接。此处不填写AI API Key。
6. 打开Word/PPT，主动点击“转换为PDF并查看”。原件发往上述服务，成功后PDF缓存在平板；之后可离线查看。

服务容器不直接映射端口，处于内部Docker网络；只有HTTPS网关暴露给外部，办公进程不能直接访问互联网。容器以非root用户运行，工作目录单独挂载。首次构建要下载LibreOffice和中文/数学字体；当前交付环境没有Docker，未验证镜像构建或你的服务器部署。

## 不部署也可使用

先用WPS等工具把文档导出为PDF，在研序的课件资料中导入这份PDF；打开原Word/PPT，点“关联已有PDF”。此关联保存在学习记录中，不上传任何内容。普通备份不包含文档/PDF二进制，恢复后仍需重新导入原文件。

## 接口

所有接口须 `Authorization: Bearer <OFFICE_TOKEN>`。

- `GET /health`：返回 `ok`、`engine`、`formats`、`maxBytes`。
- `POST /convert?ext=docx`：原始文件作为HTTP请求体，`Content-Type: application/octet-stream`，必须有准确的`Content-Length`。支持ext为doc/docx/ppt/pptx。成功返回`application/pdf`二进制；不提供公开文件URL。
- 401认证失败；413超额；415格式不支持；422不能转换（例如加密或损坏）；429正在处理其他资料。上传和转换临时文件在请求结束时清理，不记录令牌、文档名或正文日志。

PDF采用完整页导出，不设置页码范围；图片采用无损导出选项。默认包含Noto中文、Carlito、Liberation与STIX字体，但无法覆盖你原文档使用的所有专有字体。

## 本地开发验证

本机安装Python3和LibreOffice后，可设置OFFICE_TOKEN、OFFICE_WORKDIR并运行 `python3 server.py`；开发服务为HTTP，只供本机测试，App要求通过HTTPS网关连接。不要直接开放8080端口。

Android端保留原件；只有校验为可打开的PDF后才替换旧缓存。转换令牌独立存于Android Keystore，不进入学习备份。清理转换缓存不会删除原Word/PPT或手动关联的PDF。

官方参考：
- https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html
- https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html

PPT转换为静态页面预览，不包含动画、音视频播放和交互效果。原PPT保留，可用办公软件查看这些内容。
