package cn.kaoyan.assistant;
import android.app.*;import android.content.*;import android.os.Build;
/*
 One-shot notification when a pomodoro is due to end while the app is in the background.
 Uses setAndAllowWhileIdle (no exact-alarm permission): the system may deliver it a few minutes late in Doze.
 Recording the session is done by the web layer from wall-clock timestamps; this receiver only notifies.
*/
public class FocusAlarmReceiver extends BroadcastReceiver {
 private static final int CODE=42;
 private static PendingIntent intent(Context c){return PendingIntent.getBroadcast(c,CODE,new Intent(c,FocusAlarmReceiver.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 // at<=0 cancels. Titles are short display text supplied by the app itself.
 static void configure(Context c,long at,String title){
  AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);PendingIntent p=intent(c);a.cancel(p);
  SharedPreferences.Editor e=c.getSharedPreferences("focus-alarm",0).edit();
  if(at<=System.currentTimeMillis()){e.clear().commit();((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(CODE);return;}
  e.putLong("at",at).putString("title",title==null?"":title.length()>60?title.substring(0,60):title).commit();
  a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);
 }
 public void onReceive(Context c,Intent i){
  SharedPreferences prefs=c.getSharedPreferences("focus-alarm",0);if(prefs.getLong("at",0)<=0)return;String title=prefs.getString("title","");prefs.edit().clear().commit();
  if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
  NotificationManager n=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
  n.createNotificationChannel(new NotificationChannel("focus","专注计时",NotificationManager.IMPORTANCE_HIGH));
  PendingIntent open=PendingIntent.getActivity(c,2,new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
  n.notify(CODE,new Notification.Builder(c,"focus").setSmallIcon(cn.kaoyan.assistant.R.drawable.ic_launcher).setContentTitle("番茄钟时间到").setContentText((title.isEmpty()?"":title+" · ")+"打开研序记下这次专注，休息一下。").setContentIntent(open).setAutoCancel(true).setCategory(Notification.CATEGORY_ALARM).build());
 }
}
