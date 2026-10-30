package cn.kaoyan.assistant;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class SecretStore {
 private final Context context;private final String storageKey,alias;
 SecretStore(Context c){this(c,"api","kaoyan-api");}
 SecretStore(Context c,String storageKey,String alias){context=c;this.storageKey=storageKey;this.alias=alias;}
 boolean has(){return !context.getSharedPreferences("vault",0).getString(storageKey,"").isEmpty();}
 private SecretKey key() throws Exception {
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  if(!ks.containsAlias(alias)){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}
  return (SecretKey)ks.getKey(alias,null);
 }
 void set(String value) throws Exception {
  if(value.isEmpty()){if(!context.getSharedPreferences("vault",0).edit().remove(storageKey).commit())throw new Exception("密钥清除失败");return;}
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());
  String encrypted=Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(value.getBytes("UTF-8")),Base64.NO_WRAP);
  if(!context.getSharedPreferences("vault",0).edit().putString(storageKey,encrypted).commit())throw new Exception("密钥保存失败");
 }
 String get() throws Exception {String s=context.getSharedPreferences("vault",0).getString(storageKey,"");if(s.isEmpty())return "";String[] p=s.split(":",2);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(p[0],Base64.NO_WRAP)));return new String(c.doFinal(Base64.decode(p[1],Base64.NO_WRAP)),"UTF-8");}
}
