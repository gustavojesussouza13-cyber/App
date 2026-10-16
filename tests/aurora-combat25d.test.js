'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const combat=require('../public/aurora-combat25d.js');
const creatures=require('../public/aurora-creatures25d.js');
function canvasMock(){
 const rects=[];
 const ctx={
  rects,globalAlpha:1,fillStyle:'',
  fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle})},
  beginPath(){},ellipse(){},fill(){},
  save(){},restore(){},translate(){},scale(){},drawImage(){}
 };
 return ctx;
}
test('Os efeitos são distintos nas quatro classes e visuais apenas',()=>{
 assert.equal(combat.VERSION,'aurora-combat25d-v1');
 const results={};
 for(const role of Object.keys(combat.ROLES)){
  const ctx=canvasMock();
  assert.equal(combat.drawHero(ctx,{role,x:150,y:190,dir:1,now:220,attackAt:0}),true);
  assert.ok(ctx.rects.length>=10,role+' deve ter partículas próprias');
  results[role]=ctx.rects.map(r=>r.color).join('|');
 }
 assert.equal(Object.keys(results).length,4);
 assert.equal(new Set(Object.values(results)).size,4);
 const idle=canvasMock();
 assert.equal(combat.drawHero(idle,{role:'guardiao',now:900,attackAt:0}),false);
 assert.equal(idle.rects.length,0);
});
test('Passos, ataque e criatura não provocam efeitos sem ação válida',()=>{
 const c=canvasMock();
 assert.equal(combat.drawSteps(c,{role:'arqueiro',x:50,y:60,now:0,moving:true}),true);
 assert.equal(combat.drawSteps(c,{role:'curandeiro',x:50,y:60,now:0,moving:false}),false);
 assert.equal(combat.drawHero(c,{role:'classe-inexistente',now:150,attackAt:1}),false);
 const start=c.rects.length;
 assert.equal(combat.drawCreature(c,{type:'lobo',now:900,at:0,action:'attack'}),false);
 assert.equal(c.rects.length,start);
 for(const type of ['limo','lobo','aranha','esqueleto','golem']){
  assert.equal(combat.drawCreature(c,{type,x:70,y:80,now:180,at:0,action:'attack'}),true);
 }
 assert.equal(combat.drawCreature(c,{type:'dragao',now:170,at:0,action:'hurt'}),true);
});
test('Sprites nativos das cinco criaturas são pré-renderizados em 64x80 e limitados em cache',()=>{
 assert.deepEqual(creatures.ROLES,['limo','lobo','aranha','esqueleto','golem']);
 assert.equal(creatures.WIDTH,64);
 assert.equal(creatures.HEIGHT,80);
 assert.deepEqual(creatures.ACTIONS,{idle:4,walk:6,attack:5,hurt:3,death:5});
 const source=fs.readFileSync(path.join(__dirname,'../public/aurora-creatures25d.js'),'utf8');
 assert.match(source,/MAX_CACHE=120/);
 assert.match(source,/OsPeregrinosWorldMaster64/);
 assert.match(source,/master\.creature\(g,/);
 assert.match(source,/if\(!ROLES\.includes\(type\)/);
});
test('Novos efeitos e criaturas só são desenhados no Mundo Aberto 2.5D',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const preview=fs.readFileSync(path.join(__dirname,'../public/visual-25d.html'),'utf8');
 assert.match(source,/const combat25d=useWorld25d\?window\.OsPeregrinosAuroraCombat25D:null/);
 assert.match(source,/const auroraMonster=Boolean\(useAurora25d&&/);
 assert.match(source,/combat25d\?\.drawHero/);
 assert.match(source,/combat25d\?\.drawCreature/);
 assert.match(html,/aurora-combat25d\.js/);
 assert.match(html,/aurora-creatures25d\.js/);
 for(const id of ['testAttack','testSkill','testCreature','creature'])assert.match(preview,new RegExp('id="'+id+'"'));
});
