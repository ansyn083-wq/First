#!/usr/bin/env python3
"""Build a dependency-free, signed preview APK using official Android SDK tools."""
import os,pathlib,subprocess,zipfile,shutil,hashlib
ROOT=pathlib.Path(__file__).resolve().parent
SDK=pathlib.Path(os.environ.get('KAOYAN_ANDROID_SDK','/tmp/kaoyan-sdk'))
EXE='.exe' if os.name=='nt' else ''
TOOLS=next(p.parent for p in SDK.rglob('aapt2'+EXE) if (p.parent/'lib'/'d8.jar').exists())
PLATFORM=SDK/'platforms/android-35/android.jar'
if not PLATFORM.exists():raise FileNotFoundError('Android API 35 platform is required')
BUILD=ROOT/'build';BUILD.mkdir(exist_ok=True)
def run(*args):subprocess.run([str(x) for x in args],cwd=ROOT,check=True)
if os.name!='nt':
 for name in ['aapt2','zipalign']:os.chmod(TOOLS/name,0o755)
(BUILD/'generated').mkdir(exist_ok=True);(BUILD/'classes').mkdir(exist_ok=True);(BUILD/'dex').mkdir(exist_ok=True)
run(TOOLS/('aapt2'+EXE),'compile','--dir',ROOT/'app/src/main/res','-o',BUILD/'resources.zip')
run(TOOLS/('aapt2'+EXE),'link','-I',PLATFORM,'--manifest',ROOT/'app/src/main/AndroidManifest.xml','--java',BUILD/'generated','-A',ROOT/'app/src/main/assets','--min-sdk-version','26','--target-sdk-version','35','-o',BUILD/'unsigned.apk',BUILD/'resources.zip')
sources=list((ROOT/'app/src/main/java').rglob('*.java'))+list((BUILD/'generated').rglob('*.java'))
run('java','com.sun.tools.javac.Main','--release','8','-encoding','UTF-8','-cp',PLATFORM,'-d',BUILD/'classes',*sources)
run('java','-cp',TOOLS/'lib/d8.jar','com.android.tools.r8.D8','--lib',PLATFORM,'--min-api','26','--output',BUILD/'dex',*list((BUILD/'classes').rglob('*.class')))
with zipfile.ZipFile(BUILD/'unsigned.apk','a',compression=zipfile.ZIP_DEFLATED) as z:
 for f in (BUILD/'dex').glob('*.dex'):z.write(f,f.name)
# Signing is configurable so anyone can build with their own key. Defaults keep the original preview key and its certificate check.
# YANXU_KEYSTORE / YANXU_KEY_ALIAS / YANXU_STORE_PASS / YANXU_KEY_PASS select the key; YANXU_CERT_SHA256 pins its certificate
# (set it to an empty string to skip the pin when using a different key). Changing keys means users must uninstall the old build.
ORIGINAL_CERT='f299f0de0c881cdba5e8a88940471085dc28d471bcecaf4d8832d1d682435a52'
key=pathlib.Path(os.environ.get('YANXU_KEYSTORE',str(ROOT/'signing'/'preview.keystore')))
alias=os.environ.get('YANXU_KEY_ALIAS','androiddebugkey');store_pass=os.environ.get('YANXU_STORE_PASS','android');key_pass=os.environ.get('YANXU_KEY_PASS',store_pass)
pin=os.environ.get('YANXU_CERT_SHA256',ORIGINAL_CERT if 'YANXU_KEYSTORE' not in os.environ else '').lower()
if not key.exists():raise FileNotFoundError('Signing keystore not found: '+str(key)+' (set YANXU_KEYSTORE, or provide the original signing/preview.keystore for in-place updates)')
cert=subprocess.check_output(['keytool','-exportcert','-keystore',str(key),'-storepass',store_pass,'-alias',alias],cwd=ROOT)
if pin and hashlib.sha256(cert).hexdigest()!=pin:raise RuntimeError('Signing certificate differs from the pinned certificate; installed builds cannot be updated in place')
run(TOOLS/('zipalign'+EXE),'-f','4',BUILD/'unsigned.apk',BUILD/'aligned.apk')
apk=ROOT/'dist'/'yanxu-0.15.1.apk';apk.parent.mkdir(exist_ok=True)
run('java','-jar',TOOLS/'lib/apksigner.jar','sign','--ks',key,'--ks-key-alias',alias,'--ks-pass','pass:'+store_pass,'--key-pass','pass:'+key_pass,'--out',apk,BUILD/'aligned.apk')
run('java','-jar',TOOLS/'lib/apksigner.jar','verify','--verbose',apk)
run(TOOLS/('aapt2'+EXE),'dump','badging',apk)
print('APK:',apk,'bytes:',apk.stat().st_size)
