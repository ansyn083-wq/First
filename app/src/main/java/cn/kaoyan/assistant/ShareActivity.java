package cn.kaoyan.assistant;
import android.app.Activity;import android.content.Intent;import android.os.Bundle;import org.json.JSONObject;
/*
 Receives text shared from other apps (e.g. a browser's "Share" on selected text or a page link).
 The text is queued in private preferences and the main window is brought forward; the web layer saves it
 as a note and only then acknowledges, so nothing is lost if the app is closed in between.
 Holds no WebView and writes no learning data itself, so it can never race the main window's saves.
*/
public class ShareActivity extends Activity {
 static final int MAX_TEXT=20000;
 protected void onCreate(Bundle b){
  super.onCreate(b);
  try{
   Intent in=getIntent();
   if(in!=null&&Intent.ACTION_SEND.equals(in.getAction())&&in.getType()!=null&&in.getType().startsWith("text/")){
    CharSequence raw=in.getCharSequenceExtra(Intent.EXTRA_TEXT);String text=raw==null?"":raw.toString().trim(),subject=in.getStringExtra(Intent.EXTRA_SUBJECT);
    if(!text.isEmpty()){
     if(text.length()>MAX_TEXT)text=text.substring(0,MAX_TEXT);
     if(subject!=null&&subject.length()>160)subject=subject.substring(0,160);
     JSONObject item=new JSONObject().put("text",text).put("subject",subject==null?"":subject.trim()).put("at",System.currentTimeMillis());
     ShareQueue.add(ShareInbox.store(this),item);
    }
   }
  }catch(Exception error){android.widget.Toast.makeText(this,"摘录未接收："+(error.getMessage()==null?"请重新分享":error.getMessage()),android.widget.Toast.LENGTH_LONG).show();}
  startActivity(new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("shared",true));
  finish();
 }
}
