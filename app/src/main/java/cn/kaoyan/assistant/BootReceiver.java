package cn.kaoyan.assistant;
import android.content.*;
public class BootReceiver extends BroadcastReceiver {public void onReceive(Context c,Intent i){if(!Intent.ACTION_BOOT_COMPLETED.equals(i.getAction()))return;android.content.SharedPreferences p=c.getSharedPreferences("reminder",0);ReminderReceiver.configure(c,p.getBoolean("enabled",false),p.getInt("hour",20),p.getInt("minute",0));}}
