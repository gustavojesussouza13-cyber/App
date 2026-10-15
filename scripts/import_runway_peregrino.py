#!/usr/bin/env python3
"""Converte a folha de 16 poses do Runway em um atlas RGBA utilizável.
Executado somente na branch experimental; não depende dos módulos 3D da guilda.
A URL assinada da arte é passada por RUNWAY_SOURCE_URL, nunca persistida em metadados.
"""
import io
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image

W_FRAME, H_FRAME, COLUMNS, ROWS = 128, 160, 4, 4
TASK_ID = "ef4014c5-292b-4fd5-afb6-222c138b8de6"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/peregrino"
URL = os.environ.get("RUNWAY_SOURCE_URL", "")
if not URL or not URL.startswith("https://dnznrvs05pmza.cloudfront.net/"):
    raise SystemExit("RUNWAY_SOURCE_URL precisa apontar ao PNG assinado do Runway.")
request = Request(URL, headers={"User-Agent": "Mozilla/5.0 (OsPeregrinosAssetImporter)"})
with urlopen(request, timeout=45) as response:
    blob = response.read(14_000_000)
image = Image.open(io.BytesIO(blob)).convert("RGBA")
width, height = image.size
if width < 800 or height < 500:
    raise SystemExit(f"Dimensões inválidas para spritesheet Runway: {width}x{height}")
pixels = image.load()
# Separação precisa da cor chroma magenta e de seus pixels de antialiasing.
mask = Image.new("L", image.size)
alpha = mask.load()
for y in range(height):
    for x in range(width):
        r, g, b, _ = pixels[x, y]
        excess = min(r, b) - g
        if r > 160 and b > 160 and excess >= 115:
            value = 0
        elif r > 135 and b > 135 and excess > 60:
            value = max(0, min(255, int((112 - excess) * 255 / 52)))
        else:
            value = 255
        alpha[x, y] = value
image.putalpha(mask)
atlas = Image.new("RGBA", (COLUMNS*W_FRAME, ROWS*H_FRAME))
boxes = []
# Detecta cada coluna dentro da faixa de linha, porque o Runway nem sempre
# posiciona os centros exatamente no meio dos quatro quadrantes.
for row in range(ROWS):
    y0 = max(0, round(row*height/ROWS))
    y1 = min(height, round((row+1)*height/ROWS))
    active = []
    for x in range(width):
        found = 0
        for y in range(y0, y1, 2):
            if alpha[x, y] > 140:
                found += 1
        active.append(found >= max(3, round((y1-y0)/140)))
    runs = []
    start = None
    for x, on in enumerate(active + [False]):
        if on and start is None:
            start = x
        elif not on and start is not None:
            if x-start >= max(12, width//180):
                runs.append([start, x])
            start = None
    # Une artefatos internos da mesma silhueta; não junta personagens vizinhos.
    merged = []
    for a, b in runs:
        if merged and a-merged[-1][1] <= width//45:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    runs = [q for q in merged if q[1]-q[0] >= width//75]
    if len(runs) != COLUMNS:
        # Segmentação pelas projeções independentes dentro de quatro faixas.
        runs = []
        for col in range(COLUMNS):
            left = col*width//COLUMNS
            right = (col+1)*width//COLUMNS
            xactive = [x for x in range(left, right) if active[x]]
            if xactive:
                runs.append([min(xactive), max(xactive)+1])
            else:
                raise SystemExit(f"Pose faltando na linha {row+1}, coluna {col+1}")
    boxes.append([])
    for col, (left, right) in enumerate(runs):
        ys = []
        for y in range(y0, y1):
            for x in range(max(0,left-2), min(width,right+2),2):
                if alpha[x, y] > 150:
                    ys.append(y)
                    break
        if not ys:
            raise SystemExit(f"Pose vazia: linha {row+1}, coluna {col+1}")
        box = (max(0,left-2), max(y0,min(ys)-2),
               min(width,right+2), min(y1,max(ys)+3))
        boxes[row].append(box)
maxw = max(b[2]-b[0] for row in boxes for b in row)
maxh = max(b[3]-b[1] for row in boxes for b in row)
scale = min(114/maxw, 148/maxh)
for row in range(ROWS):
    for col in range(COLUMNS):
        l,t,r,b=boxes[row][col]
        cell=image.crop((l,t,r,b))
        cw=max(1,round(cell.width*scale))
        ch=max(1,round(cell.height*scale))
        if (cw,ch)!=cell.size:
            cell=cell.resize((cw,ch),Image.Resampling.LANCZOS)
        # Runway desenhou os dois perfis apontando para a direita; para Oeste
        # espelhamos a QUARTA linha, preservando os quatro quadros originais.
        if row==3:
            cell=cell.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        destx=col*W_FRAME+round((W_FRAME-cw)/2)
        desty=row*H_FRAME+(H_FRAME-4-ch)
        atlas.alpha_composite(cell,(destx,desty))
OUTPUT.mkdir(parents=True, exist_ok=True)
png = OUTPUT / "peregrino-runway-walk.png"
atlas.save(png, format="PNG", optimize=True)
manifest={
 "source":"Runway", "taskId":TASK_ID, "layout":"4-colunas-x-4-linhas",
 "frameWidth":W_FRAME, "frameHeight":H_FRAME, "columns":4, "rows":4,
 "directions":{"south":0, "north":1, "east":2, "west":3},
 "westMirrored":True, "frameCount":16, "sourceSize":[width,height],
 "image":"peregrino-runway-walk.png", "action":"walk",
 "warning":"Os quadros vieram de geração artística. Ataque, dano e morte usam animações originais como fallback."
}
(OUTPUT/"peregrino-runway-walk.json").write_text(
    json.dumps(manifest,ensure_ascii=False,indent=2)+"\n", encoding="utf8"
)
# Sanidade: áreas transparentes + cor real de todas as 16 poses.
for row in range(4):
    for col in range(4):
        a=atlas.crop((col*W_FRAME,row*H_FRAME,(col+1)*W_FRAME,(row+1)*H_FRAME))
        occupied=sum(v>128 for v in a.getchannel("A").getdata())
        if occupied<250:
            raise SystemExit(f"Sprite vazio após remoção do fundo {row=} {col=} {occupied=}")
print("RUNWAY_SPRITES_IMPORTED",png.name,atlas.size,
      f"original={width}x{height}",f"scale={scale:.3f}",
      f"size={png.stat().st_size} bytes")
