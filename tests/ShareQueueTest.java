package cn.kaoyan.assistant;
import org.json.*;import java.util.concurrent.*;
public class ShareQueueTest {
 static class Memory implements ShareQueue.Store {String queue="",old="";boolean fail=false;public String read(){return queue;}public String legacy(){return old;}public boolean write(String value){if(fail)return false;queue=value;old="";return true;}}
 static JSONObject item(String text)throws Exception{return new JSONObject().put("text",text).put("at",100);}
 static void check(boolean value){if(!value)throw new AssertionError();}
 public static void main(String[] args)throws Exception{
  Memory m=new Memory();ShareQueue.add(m,item("A"));String a=((JSONObject)ShareQueue.peek(m)).getString("id");ShareQueue.add(m,item("B"));ShareQueue.ack(m,a,100);check(((JSONObject)ShareQueue.peek(m)).getString("text").equals("B"));ShareQueue.ack(m,a,100);check(((JSONObject)ShareQueue.peek(m)).getString("text").equals("B"));
  Memory legacy=new Memory();legacy.old=item("legacy").toString();String id=((JSONObject)ShareQueue.peek(legacy)).getString("id");ShareQueue.add(legacy,item("new"));ShareQueue.ack(legacy,id,100);check(((JSONObject)ShareQueue.peek(legacy)).getString("text").equals("new"));
  Memory disk=new Memory();ShareQueue.add(disk,item("keep"));String before=disk.queue;disk.fail=true;try{ShareQueue.add(disk,item("reject"));throw new AssertionError();}catch(java.io.IOException expected){}check(before.equals(disk.queue));
  Memory concurrent=new Memory();ShareQueue.add(concurrent,item("first"));String first=((JSONObject)ShareQueue.peek(concurrent)).getString("id");ExecutorService pool=Executors.newFixedThreadPool(2);Future<?> put=pool.submit(()->{try{for(int i=0;i<50;i++)ShareQueue.add(concurrent,item("new"+i));}catch(Exception e){throw new RuntimeException(e);}});Future<?> ack=pool.submit(()->{try{for(int i=0;i<50;i++)ShareQueue.ack(concurrent,first,100);}catch(Exception e){throw new RuntimeException(e);}});put.get();ack.get();pool.shutdown();check(new JSONArray(concurrent.queue).length()==50);
  Memory full=new Memory();for(int i=0;i<ShareQueue.MAX;i++)ShareQueue.add(full,item("x"));try{ShareQueue.add(full,item("overflow"));throw new AssertionError();}catch(java.io.IOException expected){}check(new JSONArray(full.queue).length()==ShareQueue.MAX);
  System.out.println("Share FIFO, stable IDs, legacy migration, failed disk writes, concurrent acknowledgements and capacity passed");
 }
}
