package cn.kaoyan.assistant;

import java.io.IOException;

final class ApiKeyPolicy {
 private ApiKeyPolicy() {}

 static void validate(String previousBase,String nextBase,boolean hasStoredKey,String suppliedKey,boolean clearKey) throws IOException {
  if(hasStoredKey&&!clearKey&&!nextBase.equals(previousBase)&&suppliedKey.trim().isEmpty()) {
   throw new IOException("更换AI服务地址时请重新填写API密钥（Key）");
  }
 }
}
