package cn.kaoyan.assistant;
import java.io.*;import java.nio.charset.StandardCharsets;import java.util.zip.*;
public class DocumentTextReaderTest {
 static File make(String xml)throws Exception{File f=File.createTempFile("notes-",".docx");try(ZipOutputStream z=new ZipOutputStream(new FileOutputStream(f))){z.putNextEntry(new ZipEntry("word/document.xml"));z.write(xml.getBytes(StandardCharsets.UTF_8));z.closeEntry();}return f;}
 public static void main(String[] args)throws Exception{File f=make("<w:document xmlns:w='w'><w:body><w:p><w:r><w:t>极限</w:t><w:tab/><w:t>定义</w:t></w:r></w:p><w:p><w:r><w:t>第二段 &amp; 原文</w:t></w:r></w:p></w:body></w:document>");String t=DocumentTextReader.read(f);if(!t.equals("极限\t定义\n第二段 & 原文\n"))throw new AssertionError(t);f.delete();f=make("<!DOCTYPE d [<!ENTITY e SYSTEM 'file:///etc/passwd'>]><w:document xmlns:w='w'><w:t>&e;</w:t></w:document>");try{DocumentTextReader.read(f);throw new AssertionError("unsafe XML accepted");}catch(IOException expected){}f.delete();System.out.println("DOCX paragraphs, whitespace, Chinese and external-entity refusal checks passed");}
}
