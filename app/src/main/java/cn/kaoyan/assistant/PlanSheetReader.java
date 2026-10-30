package cn.kaoyan.assistant;
import java.io.*;import java.net.URI;import java.util.*;import java.util.zip.*;import javax.xml.parsers.*;import org.w3c.dom.*;import org.xml.sax.InputSource;
final class PlanSheetReader {
 private static Document xml(ZipFile z,String name)throws Exception{
  ZipEntry e=z.getEntry(name);if(e==null)return null;ByteArrayOutputStream bytes=new ByteArrayOutputStream();
  try(InputStream in=z.getInputStream(e)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(bytes.size()+n>8*1024*1024)throw new IOException("Excel工作表过大，请拆分导入");bytes.write(b,0,n);}}
  String value=bytes.toString("UTF-8");if(value.indexOf(0)>=0||value.contains("<!DOCTYPE")||value.contains("<!ENTITY"))throw new IOException("不支持含实体声明的Excel文件");
  DocumentBuilderFactory f=DocumentBuilderFactory.newInstance();f.setExpandEntityReferences(false);DocumentBuilder builder=f.newDocumentBuilder();builder.setEntityResolver((pub,sys)->new InputSource(new StringReader("")));return builder.parse(new ByteArrayInputStream(bytes.toByteArray()));
 }
 static boolean uses1904(File file)throws Exception{try(ZipFile z=new ZipFile(file)){Document doc=xml(z,"xl/workbook.xml");if(doc==null)return false;NodeList nodes=doc.getElementsByTagName("workbookPr");if(nodes.getLength()==0)return false;String value=((Element)nodes.item(0)).getAttribute("date1904");return value.equals("1")||value.equals("true");}}
 static List<List<String>> read(File file)throws Exception{
  try(ZipFile z=new ZipFile(file)){
   List<String> shared=new ArrayList<>();Document ss=xml(z,"xl/sharedStrings.xml");if(ss!=null){NodeList si=ss.getElementsByTagName("si");if(si.getLength()>50000)throw new IOException("Excel共享文本过多");for(int i=0;i<si.getLength();i++)shared.add(si.item(i).getTextContent());}
   String sheet="xl/worksheets/sheet1.xml";Document book=xml(z,"xl/workbook.xml"),rels=xml(z,"xl/_rels/workbook.xml.rels");if(book!=null&&rels!=null){NodeList sheets=book.getElementsByTagName("sheet");if(sheets.getLength()>0){String rid=((Element)sheets.item(0)).getAttribute("r:id");NodeList rs=rels.getElementsByTagName("Relationship");for(int i=0;i<rs.getLength();i++){Element r=(Element)rs.item(i);if(rid.equals(r.getAttribute("Id"))){if("External".equals(r.getAttribute("TargetMode")))throw new IOException("不读取外部工作表");String target=r.getAttribute("Target");sheet=target.startsWith("/")?target.substring(1):new URI("xl/").resolve(target).normalize().toString();}}}}
   if(!sheet.matches("xl/worksheets/[a-zA-Z0-9._-]+\\.xml"))throw new IOException("工作表路径无效");Document doc=xml(z,sheet);if(doc==null)throw new IOException("没有可读取的第一工作表");
   NodeList rs=doc.getElementsByTagName("row");if(rs.getLength()>2500)throw new IOException("每次最多读取2500行，请拆分Excel");List<List<String>> rows=new ArrayList<>();
   for(int i=0;i<rs.getLength();i++){Element row=(Element)rs.item(i);NodeList cells=row.getElementsByTagName("c");ArrayList<String> values=new ArrayList<>();for(int j=0;j<cells.getLength();j++){Element c=(Element)cells.item(j);String ref=c.getAttribute("r");int col=0;for(int k=0;k<ref.length()&&Character.isLetter(ref.charAt(k));k++)col=col*26+(Character.toUpperCase(ref.charAt(k))-'A'+1);if(col==0)col=values.size()+1;if(col>100)throw new IOException("工作表列数超过100，请只保留计划表");while(values.size()<col)values.add("");String type=c.getAttribute("t"),value="";if(type.equals("inlineStr")){NodeList is=c.getElementsByTagName("is");if(is.getLength()>0)value=is.item(0).getTextContent();}else{NodeList vs=c.getElementsByTagName("v");if(vs.getLength()>0)value=vs.item(0).getTextContent();if(type.equals("s")&&!value.isEmpty()){int index=Integer.parseInt(value);if(index<0||index>=shared.size())throw new IOException("共享文本索引损坏");value=shared.get(index);}}values.set(col-1,value);}boolean nonempty=false;for(String value:values)if(!value.trim().isEmpty())nonempty=true;if(nonempty)rows.add(values);}
   return rows;
  }
 }
}
