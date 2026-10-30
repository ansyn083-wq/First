package cn.kaoyan.assistant;
final class PageRasterSize {
 final int width,height;
 private PageRasterSize(int width,int height){this.width=width;this.height=height;}
 static PageRasterSize fit(int pageWidth,int pageHeight,int requested){
  if(pageWidth<=0||pageHeight<=0)throw new IllegalArgumentException("PDF页面尺寸无效");
  int target=Math.max(600,Math.min(2400,requested));
  double scale=Math.min(target/(double)pageWidth,8192.0/pageHeight);
  scale=Math.min(scale,Math.sqrt(4000000.0/(pageWidth*(double)pageHeight)));
  return new PageRasterSize(Math.max(1,(int)Math.floor(pageWidth*scale)),Math.max(1,(int)Math.floor(pageHeight*scale)));
 }
}
