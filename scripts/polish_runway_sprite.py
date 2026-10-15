#!/usr/bin/env python3
"""Pós-processamento offline do atlas real do Runway.
Elimina os halos magenta residuais do chroma key, sem afetar azul/couro/ouro.
"""
from pathlib import Path
from PIL import Image

png=Path(__file__).resolve().parents[1]/"public/assets/peregrino/peregrino-runway-walk.png"
im=Image.open(png).convert("RGBA")
pixel=im.load()
fixed=0
for y in range(im.height):
    for x in range(im.width):
        r,g,b,a=pixel[x,y]
        if a==0:continue
        # A borda residual do chroma tem R e B simultaneamente mais fortes
        # que o verde; os azuis e turquesas do traje não satisfazem isso.
        excess=min(r-g,b-g)
        if r>103 and b>111 and excess>61:
            # Cor púrpura da tela, não material do personagem.
            pixel[x,y]=(r,g,b,0)
            fixed+=1
im.save(png,optimize=True)
assert im.size==(512,640)
assert fixed>0,"O atlas não tinha nenhum pixel rosa a remover."
print(f"RUNWAY_PINK_HALO_POLISHED pixels={fixed} size={png.stat().st_size}")
