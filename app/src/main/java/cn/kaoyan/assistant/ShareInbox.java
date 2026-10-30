package cn.kaoyan.assistant;
import android.content.Context;import android.content.SharedPreferences;
final class ShareInbox {
 static ShareQueue.Store store(Context context){final SharedPreferences prefs=context.getSharedPreferences("share",0);return new ShareQueue.Store(){
  public String read(){return prefs.getString("queue","");}
  public String legacy(){return prefs.getString("pending","");}
  public boolean write(String value){return prefs.edit().putString("queue",value).remove("pending").commit();}
 };}
}
