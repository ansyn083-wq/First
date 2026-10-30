package cn.kaoyan.assistant;
import java.io.*;
public class AttachmentTransferTest {
 static void check(boolean b,String m){if(!b)throw new AssertionError(m);}
 static void fails(String expected,Action action)throws Exception{try{action.run();throw new AssertionError("expected rejection: "+expected);}catch(IOException e){check(e.getMessage().contains(expected),e.getMessage());}}
 interface Action{void run()throws Exception;}
 static class Generated extends InputStream{long remaining,read;int maxRequest;Generated(long n){remaining=n;}public int read(){if(remaining--<=0)return -1;read++;return 0;}public int read(byte[] b,int off,int len){maxRequest=Math.max(maxRequest,len);if(remaining==0)return -1;int n=(int)Math.min(remaining,len);remaining-=n;read+=n;return n;}}
 static class Sink extends OutputStream{long bytes;public void write(int b){bytes++;}public void write(byte[] b,int o,int n){bytes+=n;}}
 public static void main(String[] args)throws Exception{
  long mib=1024L*1024,large=100*mib;
  Generated in=new Generated(large);Sink out=new Sink();AttachmentTransfer.Result result=AttachmentTransfer.copy(in,out,500*mib,large,()->2*1024*mib);
  check(out.bytes==large&&result.size==large,"file above old50MiB must copy completely");check(in.maxRequest<=65536,"copy must use bounded memory");
  ByteArrayOutputStream abc=new ByteArrayOutputStream();AttachmentTransfer.Result hash=AttachmentTransfer.copy(new ByteArrayInputStream("abc".getBytes("UTF-8")),abc,100,3,()->2*1024*mib);check(hash.sha256.equals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),"stream hash wrong");check(abc.toString("UTF-8").equals("abc"),"bytes changed");
  Generated over=new Generated(501*mib);fails("额度",()->AttachmentTransfer.copy(over,new Sink(),1024*mib,501*mib,()->2*1024*mib));check(over.read==0,"oversize known file must fail before copying");
  fails("额度",()->AttachmentTransfer.copy(new Generated(11),new Sink(),10,-1,()->2*1024*mib));
  fails("不完整",()->AttachmentTransfer.copy(new Generated(9),new Sink(),10,10,()->2*1024*mib));
  fails("空间",()->AttachmentTransfer.copy(new Generated(9),new Sink(),10,9,()->1));
  final int[] calls={0};fails("空间",()->AttachmentTransfer.copy(new Generated(10*mib),new Sink(),500*mib,-1,()->++calls[0]>1?0:2*1024*mib));
  System.out.println("100MiB bounded streaming, complete bytes, SHA256, allowance, integrity and storage checks passed");
 }
}
