package cn.kaoyan.assistant;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

public class ApiKeyPolicyTest {
 private static Method policy;
 private static void check(String oldBase,String nextBase,boolean stored,String key,boolean clear,boolean blocked) throws Exception {
  try {
   policy.invoke(null,oldBase,nextBase,stored,key,clear);
   if(blocked)throw new AssertionError("Stored key can be reused at "+nextBase);
  } catch(InvocationTargetException e) {
   if(!blocked||!(e.getCause() instanceof IOException))throw new AssertionError("Unexpected policy outcome",e.getCause());
  }
 }
 public static void main(String[] args) throws Exception {
  try {policy=Class.forName("cn.kaoyan.assistant.ApiKeyPolicy").getDeclaredMethod("validate",String.class,String.class,boolean.class,String.class,boolean.class);}
  catch(ClassNotFoundException e){throw new AssertionError("No policy prevents cross-service key reuse",e);}
  check("https://a.test/v1","https://b.test/v1",true,"",false,true);
  check("https://a.test/v1","https://a.test/other",true,"  ",false,true);
  check("","https://b.test/v1",true,"",false,true);
  check("https://a.test/v1","https://a.test/v1",true,"",false,false);
  check("https://a.test/v1","https://b.test/v1",true,"replacement",false,false);
  check("https://a.test/v1","https://b.test/v1",true,"",true,false);
  check("","https://b.test/v1",false,"",false,false);
  System.out.println("ApiKeyPolicyTest PASS: cross-service reuse blocked, replacement and clear supported");
 }
}
