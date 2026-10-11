#!/usr/bin/env python3
"""Rebuild V8 Android game's 16-bit original single-file HTML from the original tracked V6 asset.
Patch exists to avoid reuploading 3MB of image/audio base64; refuses unexpected source.
"""
from pathlib import Path
import hashlib, json
root=Path(__file__).resolve().parents[1]
source=root/'app/src/main/assets/index.html'
patch=json.loads((root/'patches/coop-v8-5-jogadores.json').read_text(encoding='utf-8'))
base=source.read_text(encoding='utf-8')
digest=lambda s:hashlib.sha256(s.encode('utf-8')).hexdigest()
if digest(base)=='dd5557ce596c452c49bb80d675ff130cf6b27bdde3d6ca9f2634af4a182d2f04':
 print('V8.1 already prepared; nothing to do')
elif digest(base)==patch['target_sha256']:
 print('V8 already prepared; nothing to do')
elif digest(base)!=patch['base_sha256']:
 raise SystemExit('Source SHA differs: refusing to overwrite original game asset')
else:
 lines=base.splitlines(keepends=True)
 for a,b,text in reversed(patch['operations']):
  lines[a:b]=[text]
 result=''.join(lines)
 if digest(result)!=patch['target_sha256']:raise SystemExit('Patch checksum mismatch')
 source.write_text(result,encoding='utf-8')
 print('Android V8 coop 5 prepared:',len(result),'chars')
