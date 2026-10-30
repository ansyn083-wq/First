package cn.kaoyan.assistant;
import java.io.IOException;import java.util.UUID;import org.json.*;
/** Persistent FIFO. All mutations share one lock across Activity UI and bridge workers. */
final class ShareQueue {
 interface Store {String read();String legacy();boolean write(String value);}
 static final int MAX=100,MAX_CHARS=2*1024*1024;
 private static JSONArray load(Store store)throws Exception{
  String raw=store.read();if(raw.length()>MAX_CHARS)throw new IOException("待存摘录队列过大，请先处理已有内容");
  JSONArray queue=raw.isEmpty()?new JSONArray():new JSONArray(raw);String old=store.legacy();
  if(!old.isEmpty()){
   JSONObject item=new JSONObject(old);if(item.optString("id").isEmpty())item.put("id","legacy-"+item.optLong("at")+"-"+Integer.toHexString(item.optString("text").hashCode()));
   boolean found=false;for(int i=0;i<queue.length();i++)if(queue.getJSONObject(i).optString("id").equals(item.getString("id")))found=true;
   if(!found)queue.put(item);
  }return queue;
 }
 private static void save(Store store,JSONArray queue)throws Exception{String raw=queue.toString();if(raw.length()>MAX_CHARS)throw new IOException("待存摘录队列已满，请先打开研序处理");if(!store.write(raw))throw new IOException("摘录保存失败，请稍后重新分享");}
 static synchronized void add(Store store,JSONObject item)throws Exception{
  JSONArray queue=load(store);if(queue.length()>=MAX)throw new IOException("待存摘录已达100条，请先打开研序处理");
  JSONObject entry=new JSONObject(item.toString());entry.put("id","share-"+UUID.randomUUID());queue.put(entry);save(store,queue);
 }
 static synchronized Object peek(Store store)throws Exception{JSONArray queue=load(store);return queue.length()==0?JSONObject.NULL:queue.getJSONObject(0);}
 static synchronized void ack(Store store,String id,long at)throws Exception{
  JSONArray queue=load(store);for(int i=0;i<queue.length();i++){JSONObject item=queue.getJSONObject(i);if(!id.isEmpty()?id.equals(item.optString("id")):at>0&&at==item.optLong("at")){queue.remove(i);save(store,queue);return;}}
 }
}
