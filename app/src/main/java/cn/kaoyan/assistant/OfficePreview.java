package cn.kaoyan.assistant;
import android.content.Context;
import android.graphics.pdf.PdfRenderer;
import android.os.ParcelFileDescriptor;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import javax.net.ssl.HttpsURLConnection;

final class OfficePreview {
 static boolean supported(File source){return source.getName().toLowerCase(Locale.ROOT).matches(".*\\.(docx?|pptx?)$");}
 static File cacheFile(File source)throws Exception{
  MessageDigest hash=MessageDigest.getInstance("SHA-256");String stamp=source.getName()+"\n"+source.length()+"\n"+source.lastModified()+"\noffice-pdf-v1";StringBuilder name=new StringBuilder("office-");for(byte b:hash.digest(stamp.getBytes(StandardCharsets.UTF_8)))name.append(String.format(Locale.ROOT,"%02x",b&255));return new File(source.getParentFile(),name+".pdf");
 }
 static JSONObject cached(File source)throws Exception{
  if(!source.isFile()||!supported(source))throw new IOException("Office原件不可用，请重新导入");File pdf=cacheFile(source);boolean available=false;if(pdf.isFile()&&pdf.length()>=8){try(InputStream in=new FileInputStream(pdf)){byte[] head=new byte[5];available=in.read(head)==5&&Arrays.equals(head,"%PDF-".getBytes(StandardCharsets.US_ASCII));}}
  JSONObject result=new JSONObject().put("available",available).put("sourcePath",source.getName());if(available)result.put("path",pdf.getName()).put("size",pdf.length());return result;
 }
 static JSONObject convert(Context context,File source,String base,String token,boolean force)throws Exception{
  JSONObject existing=cached(source);if(existing.optBoolean("available")&&!force)return existing.put("cached",true);
  if(base.isEmpty()||token.isEmpty())throw new IOException("请先在设置中配置Office转换服务，或关联已有PDF");
  if(source.length()>AttachmentTransfer.MAX_FILE_BYTES)throw new IOException("Office原件超过500MB转换上限");
  String ext=source.getName().substring(source.getName().lastIndexOf('.')+1).toLowerCase(Locale.ROOT);URL url=new URL(base+"/convert?ext="+ext);if(!"https".equals(url.getProtocol()))throw new IOException("转换服务必须使用HTTPS");
  HttpsURLConnection connection=(HttpsURLConnection)url.openConnection();connection.setConnectTimeout(15000);connection.setReadTimeout(300000);connection.setInstanceFollowRedirects(false);connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setFixedLengthStreamingMode(source.length());connection.setRequestProperty("Content-Type","application/octet-stream");connection.setRequestProperty("Authorization","Bearer "+token);
  File temporary=null;
  try{
   try(InputStream in=new FileInputStream(source);OutputStream out=connection.getOutputStream()){byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);}
   int code=connection.getResponseCode();if(code!=200){if(code==401||code==403)throw new IOException("转换服务令牌无效，请检查设置");if(code==413)throw new IOException("文件超过转换服务额度");if(code==429)throw new IOException("转换服务正在处理其他文件，请稍后重试");if(code==422)throw new IOException("办公引擎无法转换此文件，请检查格式或密码");throw new IOException("转换服务未完成请求（HTTP "+code+"）");}
   if(!"application/pdf".equalsIgnoreCase(String.valueOf(connection.getContentType()).split(";",2)[0].trim()))throw new IOException("转换服务未返回PDF，原件不受影响");
   long declared=connection.getContentLengthLong();if(declared>AttachmentTransfer.MAX_FILE_BYTES)throw new IOException("转换结果超过500MB");if(declared>=0&&context.getFilesDir().getUsableSpace()<declared+AttachmentTransfer.RESERVE_BYTES)throw new IOException("设备空间不足，无法缓存PDF");
   temporary=File.createTempFile("office-",".part",source.getParentFile());try(InputStream in=connection.getInputStream();FileOutputStream out=new FileOutputStream(temporary)){AttachmentTransfer.copy(in,out,AttachmentTransfer.MAX_FILE_BYTES,declared,()->context.getFilesDir().getUsableSpace());out.getFD().sync();}
   try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(temporary,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer pdf=new PdfRenderer(fd)){if(pdf.getPageCount()<1)throw new IOException("转换结果没有有效PDF页面");}
   File destination=cacheFile(source);if(!temporary.renameTo(destination))throw new IOException("PDF缓存保存失败，原件与旧缓存仍保留");temporary=null;return cached(source).put("cached",false);
  }catch(OutOfMemoryError e){throw new IOException("PDF预览验证内存不足，请保留原件后重试",e);}finally{connection.disconnect();if(temporary!=null)temporary.delete();}
 }
 static int clear(File directory)throws IOException{int removed=0;File[] files=directory.listFiles();if(files!=null)for(File file:files)if(file.isFile()&&file.getName().matches("office-[a-zA-Z0-9_-]+\\.(pdf|part)")){if(!file.delete())throw new IOException("部分转换缓存未能清理，请稍后重试");removed++;}return removed;}
}
