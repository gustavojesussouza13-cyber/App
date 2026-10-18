'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),view=require('../public/peregrino-nova-estetica-v85.js');
const appearance=require('../public/appearance16.js');
const {decode}=require('../scripts/png-rgba-v84');
const asset=path.join(root,'public/assets/peregrino/peregrino-nova-estetica-v85-64x80.png');
const read=n=>fs.readFileSync(path.join(root,'public',n),'utf8');
test('V8.5 approved aesthetic has 44 complete 64x80 frames with no body cropped at tile edges',()=>{
 const png=decode(fs.readFileSync(asset));
 assert.deepEqual([png.width,png.height],[256,880]);
 for(let row=0;row<11;row++)for(let col=0;col<4;col++){
  let ink=0,edge=0;
  for(let y=0;y<80;y++)for(let x=0;x<64;x++){
   const a=png.rgba[((row*80+y)*png.width+col*64+x)*4+3];
   if(a>10)ink++;
   if((x===0||x===63||y===0||y===79)&&a>10)edge++;
  }
  assert.ok(ink>=600,'non-empty full-body frame '+row+' '+col);
  assert.equal(edge,0,'frame clipped at borders '+row+' '+col);
 }
});
test('V8.5 frames give idle, three walking poses, damage, full death and three-phase attack in every direction',()=>{
 assert.equal(view.WIDTH,64);assert.equal(view.HEIGHT,80);
 assert.equal(view.COLS,4);assert.equal(view.ROWS,11);
 for(const dir of [0,1,2,3]){
  assert.equal(view.sourceRect(dir,4).sx,64*dir);
  assert.equal(view.sourceRect(dir,4).sy,320);
 }
 assert.equal(view.actionRow({action:'idle'}),0);
 assert.deepEqual([0,135,270].map(now=>view.actionRow({action:'walk',now})),[1,2,3]);
 assert.equal(view.actionRow({action:'hurt'}),4);
 assert.deepEqual([0,300,600].map(elapsed=>view.actionRow({action:'death',elapsed})),[5,6,7]);
 assert.deepEqual([0,140,320].map(elapsed=>view.actionRow({action:'attack',elapsed})),[8,9,10]);
 assert.deepEqual([0,140,320].map(elapsed=>view.actionRow({action:'skill',elapsed})),[8,9,10]);
});
test('V8.5 dynamic palette supports visible PINK and all existing character fields',()=>{
 assert.equal(appearance.normalize({outfit:'rosa'}).outfit,'rosa');
 assert.equal(appearance.normalize({cape:'rosa'}).cape,'rosa');
 assert.equal(appearance.normalize({hairColor:'rosa'}).hairColor,'rosa');
 const orig=new Uint8ClampedArray(64*80*4);orig.set([26,61,155,255],(22*64+24)*4);
 const altered=new Uint8ClampedArray(orig);
 view.recolor(altered,appearance.normalize({outfit:'rosa'}),2,0);
 assert.notDeepEqual(Array.from(altered.slice((22*64+24)*4,(22*64+24)*4+3)),
                    Array.from(orig.slice((22*64+24)*4,(22*64+24)*4+3)));
 const unchanged=new Uint8ClampedArray(orig);
 view.recolor(unchanged,appearance.DEFAULT,2,0);
 assert.deepEqual(unchanged,orig,'approved default colors remain');
});
test('V8.5 is experimental-only, retains all previous classes and avoids old attack fallback',()=>{
 const game=read('art16.js'),html=read('mundo.html'),preview=read('appearance-class-preview-v75.js');
 assert.ok(game.includes("p.role==='peregrino'"));
 assert.ok(game.includes('newPeregrinoHero||customizedHero||runwayHero||approvedHero'));
 assert.ok(game.includes("state.dead?'death':combatAction"));
 assert.ok(html.indexOf('/peregrino-nova-estetica-v85.js')<html.indexOf('/appearance-class-preview-v75.js'));
 assert.ok(preview.includes('OsPeregrinosPeregrinoV85.draw'));
 for(const role of ['guardiao','arqueiro','curandeiro'])assert.ok(preview.includes(role));
 assert.ok(fs.existsSync(path.join(root,'public/laboratorio-peregrino-v85.html')));
});

test('V8.8 new Peregrino never draws the obsolete Runway sprite over its own body',()=>{
 const game=read('art16.js'),page=read('mundo.html');
 const modern=game.indexOf('const newPeregrinoHero=Boolean(');
 const customized=game.indexOf('const customizedHero=!newPeregrinoHero&&Boolean(');
 const old=game.indexOf('const runwayHero=!newPeregrinoHero&&!customizedHero&&Boolean(');
 const select=game.indexOf('if(newPeregrinoHero||customizedHero||runwayHero||approvedHero');
 assert.ok(modern>=0&&modern<customized&&customized<old&&old<select,
  'only one Peregrino full-body renderer may draw in the current frame');
 assert.ok(game.includes('newPeregrinoHero||customizedHero||runwayHero||approvedHero'));
 assert.ok(!game.includes('const runwayHero=!customizedHero&&Boolean('),
  'old painter unconditionally overlaid the approved V8.6 sprite');
 assert.ok(page.includes('peregrino-v88-single-painter-no-double-sprite-20261018'),
  'force fresh JS on Android Chrome instead of cached double-painter implementation');
});
