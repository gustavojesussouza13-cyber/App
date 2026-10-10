// Reconstructs the game HTML from an existing original asset blob and a small, reviewed patch.
// Keeps the generated multiplayer HTML byte-for-byte identical to the tested local version.
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const base=fs.readFileSync('public/jogo-base.html','utf8').split(/(?<=\n)/);
const patch=JSON.parse(fs.readFileSync('patch-game.json','utf8'));
for(const [start,count,replacement] of [...patch.changes].reverse())base.splice(start,count,replacement);
const game=base.join('');
const sha=crypto.createHash('sha256').update(game,'utf8').digest('hex');
if(sha!==patch.expected_sha256)throw Error('Source/patched game mismatch: '+sha);
fs.writeFileSync('public/jogo.html',game,'utf8');
console.log('Online game prepared and verified ('+game.length+' UTF-16 chars)');
