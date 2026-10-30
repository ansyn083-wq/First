package cn.kaoyan.assistant;
import java.io.*;import java.security.*;
final class FileDigest {static String sha256(File file)throws IOException{try{MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(file)){byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)digest.update(buffer,0,n);}StringBuilder result=new StringBuilder();for(byte b:digest.digest())result.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return result.toString();}catch(NoSuchAlgorithmException e){throw new IOException("无法校验文件内容",e);}}}
