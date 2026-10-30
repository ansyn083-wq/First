package cn.kaoyan.assistant;
import android.graphics.*;
import android.graphics.pdf.PdfRenderer;
import android.graphics.pdf.RenderParams;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.util.Base64;
import org.json.JSONObject;
import java.io.*;
final class PdfPreview {
 static JSONObject page(File file,int index,int requestedWidth)throws Exception{
  if(!file.isFile())throw new IOException("PDF原件不存在，请重新导入");
  Bitmap bitmap=null;
  try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer pdf=new PdfRenderer(fd)){
   int count=pdf.getPageCount();if(count==0)throw new IOException("PDF没有可显示的页面");if(index<0||index>=count)throw new IOException("页码超出PDF范围");
   try(PdfRenderer.Page page=pdf.openPage(index)){
    PageRasterSize size=PageRasterSize.fit(page.getWidth(),page.getHeight(),requestedWidth);
    bitmap=Bitmap.createBitmap(size.width,size.height,Bitmap.Config.ARGB_8888);bitmap.eraseColor(Color.WHITE);
    Matrix matrix=new Matrix();matrix.setScale(size.width/(float)page.getWidth(),size.height/(float)page.getHeight());
    if(Build.VERSION.SDK_INT>=35)page.render(bitmap,null,matrix,new RenderParams.Builder(RenderParams.RENDER_MODE_FOR_DISPLAY).setRenderFlags(RenderParams.FLAG_RENDER_HIGHLIGHT_ANNOTATIONS|RenderParams.FLAG_RENDER_TEXT_ANNOTATIONS).build());else page.render(bitmap,null,matrix,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
    ByteArrayOutputStream bytes=new ByteArrayOutputStream();for(int quality:new int[]{92,80,65,50}){bytes.reset();if(!bitmap.compress(Bitmap.CompressFormat.JPEG,quality,bytes))throw new IOException("页面编码失败");if(bytes.size()<=1800000)break;}
    if(bytes.size()>1800000)throw new IOException("页面过于复杂，请缩小后重试或打开原件");
    return new JSONObject().put("page",index).put("totalPages",count).put("width",size.width).put("height",size.height).put("image","data:image/jpeg;base64,"+Base64.encodeToString(bytes.toByteArray(),Base64.NO_WRAP));
   }
  }catch(OutOfMemoryError e){throw new IOException("可用内存不足，请缩小页面或使用系统阅读器",e);}finally{if(bitmap!=null)bitmap.recycle();}
 }
}
