package cn.kaoyan.assistant;
import java.io.*;
import java.security.*;
import java.util.Locale;
import java.util.function.LongSupplier;

final class AttachmentTransfer {
 static final long MAX_FILE_BYTES=500L*1024*1024,MAX_BATCH_BYTES=1024L*1024*1024,AUTO_TEXT_BYTES=50L*1024*1024,RESERVE_BYTES=20L*1024*1024;
 static final class Result {final long size;final String sha256;Result(long size,String sha256){this.size=size;this.sha256=sha256;}}
 // The caller owns the streams and removes the destination if this throws.
 static Result copy(InputStream in,OutputStream out,long allowance,long declared,LongSupplier available)throws IOException {
  if(in==null)throw new IOException("无法读取原文件");
  long limit=Math.min(MAX_FILE_BYTES,allowance);
  if(limit<0||declared>limit)throw new IOException("文件超过本次可用额度（单文件500MB，单批1GB）");
  try{
   MessageDigest hash=MessageDigest.getInstance("SHA-256");byte[] buffer=new byte[65536];long size=0,nextSpaceCheck=0;
   while(true){
    if(size>=nextSpaceCheck){if(available.getAsLong()<RESERVE_BYTES)throw new IOException("设备可用空间不足，导入已停止");nextSpaceCheck=size+4L*1024*1024;}
    int count=in.read(buffer);if(count<0)break;if(count==0)continue;
    if(count>limit-size)throw new IOException("文件超过本次可用额度（单文件500MB，单批1GB）");
    out.write(buffer,0,count);hash.update(buffer,0,count);size+=count;
   }
   if(declared>=0&&size!=declared)throw new IOException("文件复制不完整，请重新导入");
   StringBuilder digest=new StringBuilder();for(byte b:hash.digest())digest.append(String.format(Locale.ROOT,"%02x",b&255));return new Result(size,digest.toString());
  }catch(NoSuchAlgorithmException e){throw new IOException("无法校验文件内容",e);}
 }
}
