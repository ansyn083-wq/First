#!/usr/bin/env python3
"""Private Office-to-PDF service. No AI calls, no retained uploads."""
import dataclasses, hashlib, hmac, json, os, pathlib, shutil, signal, socket, subprocess, tempfile, threading, time, zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

FORMATS = frozenset(('doc', 'docx', 'ppt', 'pptx'))
@dataclasses.dataclass(frozen=True)
class Config:
    token: str
    root: pathlib.Path
    soffice: str = 'soffice'
    max_bytes: int = 500 * 1024 * 1024
    timeout: int = 180
    read_timeout: int = 30

class ConversionError(Exception):
    pass

def convert_document(source, work, config):
    if source.suffix in ('.docx', '.pptx'):
        try:
            with zipfile.ZipFile(source) as archive:
                members = archive.infolist()
                required = 'word/document.xml' if source.suffix == '.docx' else 'ppt/presentation.xml'
                names = {member.filename for member in members}
                if required not in names or '[Content_Types].xml' not in names or len(members) > 10000 or sum(m.file_size for m in members) > 2 * 1024**3 or any('vbaproject' in m.filename.lower() or m.flag_bits & 1 for m in members):
                    raise ConversionError('文档格式、大小或加密内容不受支持')
        except (zipfile.BadZipFile, OSError):
            raise ConversionError('文件不是可读取的Office文档')
    else:
        with source.open('rb') as stream:
            header = stream.read(8)
        if not header.startswith(bytes.fromhex('d0cf11e0a1b11ae1')) and not (source.suffix == '.doc' and header.startswith(b'{\\rtf')):
            raise ConversionError('文件不是可读取的Office文档')
    profile = work / 'profile'
    profile.mkdir()
    # A fresh high-security profile for every request; the Docker network also blocks egress.
    (profile / 'user').mkdir()
    (profile / 'user' / 'registrymodifications.xcu').write_text('''<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>''')
    outdir = work / 'output'
    outdir.mkdir()
    export = 'pdf:impress_pdf_Export' if source.suffix in ('.ppt', '.pptx') else 'pdf:writer_pdf_Export'
    export += ':{"UseLosslessCompression":{"type":"boolean","value":"true"}}'
    command = [config.soffice, '-env:UserInstallation=' + profile.as_uri(), '--headless', '--nologo', '--nodefault', '--norestore', '--convert-to', export, '--outdir', str(outdir), str(source)]
    # LibreOffice spools temporary data to TMPDIR; keep it on the job volume instead of the small /tmp tmpfs.
    scratch = work / 'tmp'
    scratch.mkdir()
    env = dict(os.environ, TMPDIR=str(scratch), TMP=str(scratch), TEMP=str(scratch))
    process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True, env=env)
    try:
        code = process.wait(timeout=config.timeout)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()
        raise ConversionError('转换超时，请拆分文档或使用原件阅读器')
    pdf = outdir / (source.stem + '.pdf')
    if code != 0 or not pdf.is_file() or pdf.stat().st_size < 8:
        raise ConversionError('文件无法转换，请检查格式或密码，并保留原件')
    with pdf.open('rb') as stream:
        if stream.read(5) != b'%PDF-':
            raise ConversionError('转换结果不是有效PDF')
    if pdf.stat().st_size > config.max_bytes:
        raise ConversionError('转换后的PDF超过服务额度')
    return pdf

class OfficeServer(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, address, config):
        if len(config.token) < 24:
            raise ValueError('OFFICE_TOKEN必须至少24字符')
        self.config, self.slot = config, threading.BoundedSemaphore(1)
        config.root.mkdir(parents=True, exist_ok=True)
        super().__init__(address, Handler)

class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *args):
        pass  # Do not log names, tokens or uploaded content.
    def setup(self):
        super().setup()
        self.connection.settimeout(self.server.config.read_timeout)
    def send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.close_connection = True
        try:
            self.wfile.write(body)
        except (OSError, ConnectionError):
            pass
    def authenticated(self):
        wanted = ('Bearer ' + self.server.config.token).encode()
        supplied = self.headers.get('Authorization', '').encode()
        return hmac.compare_digest(supplied, wanted)
    def do_GET(self):
        if not self.authenticated():
            return self.send_json(401, {'error':'转换服务令牌无效'})
        if urlsplit(self.path).path != '/health':
            return self.send_json(404, {'error':'接口不存在'})
        available = shutil.which(self.server.config.soffice) is not None
        self.send_json(200 if available else 503, {'ok':available, 'engine':'LibreOffice', 'formats':sorted(FORMATS), 'maxBytes':self.server.config.max_bytes})
    def do_POST(self):
        config = self.server.config
        if not self.authenticated():
            return self.send_json(401, {'error':'转换服务令牌无效'})
        parts = urlsplit(self.path)
        if parts.path != '/convert':
            return self.send_json(404, {'error':'接口不存在'})
        ext = parse_qs(parts.query).get('ext', [''])[0].lower()
        if ext not in FORMATS:
            return self.send_json(415, {'error':'仅转换DOC、DOCX、PPT和PPTX'})
        try:
            size = int(self.headers.get('Content-Length', '-1'))
        except ValueError:
            size = -1
        if self.headers.get('Transfer-Encoding') or size <= 0:
            return self.send_json(411, {'error':'请提供有效文件长度'})
        if size > config.max_bytes:
            return self.send_json(413, {'error':'文件超过转换服务额度'})
        if not self.server.slot.acquire(blocking=False):
            return self.send_json(429, {'error':'转换服务正在处理另一份资料，请稍后重试'})
        try:
            with tempfile.TemporaryDirectory(prefix='office-', dir=config.root) as directory:
                work = pathlib.Path(directory)
                if shutil.disk_usage(work).free < size * 2 + 64 * 1024 * 1024:
                    return self.send_json(507, {'error':'转换服务器可用空间不足'})
                source, remaining = work / ('source.' + ext), size
                deadline = time.monotonic() + 900
                with source.open('wb') as out:
                    while remaining:
                        if time.monotonic() > deadline:
                            raise TimeoutError('文件上传超时')
                        data = self.rfile.read(min(65536, remaining))
                        if not data:
                            raise ValueError('上传不完整')
                        out.write(data)
                        remaining -= len(data)
                pdf = convert_document(source, work, config)
                self.send_response(200)
                self.send_header('Content-Type','application/pdf')
                self.send_header('Content-Length',str(pdf.stat().st_size))
                self.send_header('Cache-Control','no-store')
                self.send_header('Connection','close')
                self.end_headers()
                self.close_connection = True
                with pdf.open('rb') as stream:
                    shutil.copyfileobj(stream, self.wfile, length=65536)
        except (ValueError, TimeoutError, socket.timeout) as error:
            self.send_json(400, {'error':str(error)})
        except ConversionError as error:
            self.send_json(422, {'error':str(error)})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            self.send_json(500, {'error':'转换未完成，原件不受影响，请稍后重试'})
        finally:
            self.server.slot.release()

if __name__ == '__main__':
    config = Config(os.environ.get('OFFICE_TOKEN',''), pathlib.Path(os.environ.get('OFFICE_WORKDIR','/work/jobs')).resolve(), os.environ.get('SOFFICE_BIN','soffice'))
    OfficeServer(('0.0.0.0', int(os.environ.get('PORT','8080'))), config).serve_forever()
