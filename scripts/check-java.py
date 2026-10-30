#!/usr/bin/env python3
"""Run real-file and SQLite JVM regression tests using test-only Android adapters."""
import argparse,pathlib,subprocess,tempfile,os
p=argparse.ArgumentParser();p.add_argument('--sdk-jar',required=True);p.add_argument('--json',required=True);p.add_argument('--jdbc',required=True);p.add_argument('--slf4j',required=True);args=p.parse_args()
root=pathlib.Path(__file__).resolve().parent.parent
names=['ShareQueue','ApiKeyPolicy','LearningStore','ArchiveIO','AttachmentTransfer','FullBackup','FileDigest','StateCodec','WorkQueues','PageRasterSize','DocumentTextReader','PlanSheetReader','OfficePreview','AttachmentProvider']
checks=['ShareQueueTest','ApiKeyPolicyTest','StateCodecTest','FileDigestTest','AttachmentTransferTest','PageRasterSizeTest','DocumentTextReaderTest','PlanSheetReaderTest','WorkQueuesTest','PreviewQueueTest','OfficeCacheTest','ArchiveIOTest','FullBackupTest','LearningStoreTest']
with tempfile.TemporaryDirectory(prefix='yanxu-java-') as output:
 sources=list((root/'tests/android-stubs').rglob('*.java'))+[root/'app/src/main/java/cn/kaoyan/assistant'/f'{n}.java' for n in names]+list((root/'tests').glob('*Test.java'))
 subprocess.run(['java','com.sun.tools.javac.Main','-cp',os.pathsep.join([args.json,args.sdk_jar]),'-d',output,*map(str,sources)],check=True,cwd=root)
 for name in checks:
  subprocess.run(['java','-cp',os.pathsep.join([output,args.json,args.jdbc,args.slf4j,args.sdk_jar]),'cn.kaoyan.assistant.'+name],check=True,cwd=root)
  print(name+' PASS',flush=True)
