package cn.kaoyan.assistant;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
final class StateCodec {
 static final int MAX_BYTES=8*1024*1024;
 static byte[] encode(String value) throws IOException {
  byte[] bytes=value.getBytes(StandardCharsets.UTF_8);
  if(bytes.length>MAX_BYTES)throw new IOException("数据超过首版容量，请先导出备份");
  return bytes;
 }
}
