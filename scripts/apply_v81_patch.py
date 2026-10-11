#!/usr/bin/env python3
"""Atualização Android V8.1 - interface clara para salas com até 5 jogadores.

Sem dependência do site; conserva o motor do jogo e as músicas existentes.
Não modifica nem migra os salvamentos individuais.
"""
from pathlib import Path
import hashlib, json

root=Path(__file__).resolve().parents[1]
asset=root/'app/src/main/assets/index.html'
expected_v8='d87876edaa32f475075e6cc410882675614de18450b1e1324ff2f17b26ebc8cd'

def sha(s): return hashlib.sha256(s.encode('utf-8')).hexdigest()
def replace_once(s,a,b):
    n=s.count(a)
    if n!=1:raise SystemExit('Patch v8.1: trecho não corresponde à V8 original: '+a[:90]+f' (encontrado {n})')
    return s.replace(a,b,1)

s=asset.read_text(encoding='utf-8')
if 'EDIÇÃO 16-BIT V8.1' in s and '✦ Cooperativo online (até 5)' in s:
    print('V8.1 já instalada; nenhum arquivo alterado')
    raise SystemExit(0)
if sha(s)!=expected_v8:
    raise SystemExit('Patch v8.1 recusado: HTML não é a V8 esperada. Execute apply_coop_patch.py primeiro.')

fixes=[
 ('<title>Gustavo, O Peregrino — V7 Cooperativo de Dois Jogadores</title>',
  '<title>Gustavo, O Peregrino — V8.1 · Cooperativo até 5 jogadores</title>'),
 ('EDIÇÃO 16-BIT V8 · COOPERATIVO ATÉ 5',
  'EDIÇÃO 16-BIT V8.1 · COOPERATIVO ATÉ 5'),
 ("['✦ Cooperativo para dois',()=>coopPanel()]",
  "['✦ Cooperativo online (até 5)',()=>coopPanel()]"),
 ('// V8.0 — Co-op para até cinco aparelhos, sala privada de seis caracteres; servidor próprio Android.',
  '// V8.1 — Salas cooperativas independentes do site, até 5 aparelhos.'),
 ("ui(onlyCode?'Entrar na sala de um amigo':'Cooperativo — até cinco peregrinos'",
  "ui(onlyCode?'Entrar na sala de um amigo':'Cooperativo online — até cinco jogadores'"),
 ('Uma aventura cooperativa para <strong>até cinco jogadores em aparelhos diferentes</strong>. Lutem contra as mesmas criaturas, recolham centelhas e avancem juntos. Precisa de internet; o modo individual',
  'Joguem em uma sala privada com <strong>até 5 participantes (1 anfitrião + 4 amigos)</strong>. Compartilhem criaturas, combate, recompensas, centelhas e capítulos. Todos precisam instalar esta versão V8.1 e ter internet. O modo individual'),
 ("'<p>Confira a conexão de internet.</p>'",
  "'<p>Confira a conexão de internet. Este modo usa o servidor exclusivo do aplicativo; o modo solo continua funcionando offline.</p>'"),
 ("'Toque para copiar o código ou sair da sala'",
  "'Toque para ver os jogadores, compartilhar o código ou sair da sala'"),
 ('Convide até quatro pessoas a instalar a mesma versão do aplicativo.',
  'Convide até quatro pessoas a instalar a V8.1 do aplicativo. Os cinco jogadores precisam ter internet.'),
 ("msg('Sala '+coop.code+' conectada! Convide até quatro amigos com esse código.');",
  "msg('Cooperativo conectado: sala '+coop.code+' (máximo 5 jogadores).');"),
]
for old,new in fixes:s=replace_once(s,old,new)
asset.write_text(s,encoding='utf-8')
print('Atualização Android V8.1 aplicada. HTML:',len(s),'caracteres; SHA256:',sha(s))
