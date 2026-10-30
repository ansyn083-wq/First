package cn.kaoyan.assistant;
public class StateCodecTest {
 public static void main(String[] args) throws Exception {
  if(StateCodec.encode("中文").length!=6)throw new AssertionError("Chinese UTF-8 encoding");
  StringBuilder text=new StringBuilder();for(int i=0;i<3000000;i++)text.append('中');
  boolean refused=false;try{StateCodec.encode(text.toString());}catch(java.io.IOException e){refused=true;}
  if(!refused)throw new AssertionError("oversized Chinese state must be refused before writing so it remains readable");
  System.out.println("StateCodec UTF-8 budget checks passed");
 }
}
