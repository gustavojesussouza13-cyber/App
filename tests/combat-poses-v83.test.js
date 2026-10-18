'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const comb=require('../public/combat-poses-v83.js');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../public',p),'utf8');
function doc(){
 const drawn=[];
 function ctx(){
  const ops=[];
  const context={
   imageSmoothingEnabled:true,fillStyle:'',globalAlpha:1,
   drawImage(...a){ops.push(['image',...a.slice(1)]);},
   fillRect(x,y,w,h){ops.push(['pixel',x,y,w,h,this.fillStyle]);},
   save(){ops.push(['save'])},restore(){ops.push(['restore'])},
   translate(x,y){ops.push(['translate',x,y])},rotate(v){ops.push(['rotate',v])}
  };
  context.ops=ops;return context;
 }
 return {
  drawn,createElement(name){assert.equal(name,'canvas');const context=ctx();
   const el={width:0,height:0,getContext:()=>context,ctx:context};
   drawn.push(el);return el;}
 };
}
test('V8.3 animated combat genuinely changes arm/weapon poses for EACH approved class, attack and skill',()=>{
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
  for(const action of ['attack','skill']){
   const d=doc(),base={width:128,height:160};
   const frames=[0,1,2].map(phase=>comb.render(base,{role,dir:1,action,phase,documentRef:d}));
   assert.equal(frames.length,3);
   const op=frames.map(f=>f.ctx.ops.filter(x=>x[0]==='pixel'));
   assert.ok(op.every(x=>x.length>=35),role+' '+action+' real pixel-painted weapon+arm visible');
   assert.notDeepEqual(op[0],op[1],role+' '+action+' second pose differs physically');
   assert.notDeepEqual(op[1],op[2],role+' '+action+' third pose differs physically');
   assert.deepEqual(frames.map(x=>[x.width,x.height]),[[128,160],[128,160],[128,160]],
    'same original sprite box and foot-anchor for all frames');
   assert.ok(frames.every(x=>x.ctx.ops[0][0]==='image'),
    'approved character PNG must be drawn FIRST');
  }
 }
});
test('V8.3 directional + phase progression and nearest-neighbour caching preserve each actual animated frame',()=>{
 assert.deepEqual([0,122,123,245,246,369].map(comb.step),[0,0,1,1,2,2]);
 assert.equal(comb.PHASE_MS,123);
 assert.equal(comb.DURATION,370);
 const right=comb.stance('peregrino',1,1,'attack'),left=comb.stance('peregrino',3,1,'attack');
 assert.ok(right.handX>right.shoulderX);
 assert.ok(left.handX<left.shoulderX);
 const d=doc(),body={width:128,height:160};
 const one=comb.renderCached(body,{role:'arqueiro',dir:3,action:'attack',phase:0,documentRef:d});
 const again=comb.renderCached(body,{role:'arqueiro',dir:3,action:'attack',phase:0,documentRef:d});
 assert.equal(one,again,'cached bitwise-equivalent action image avoids flicker');
 const next=comb.renderCached(body,{role:'arqueiro',dir:3,action:'attack',phase:1,documentRef:d});
 assert.notEqual(one,next,'next physically different frame exists');
 assert.ok(d.drawn.every(x=>x.ctx.imageSmoothingEnabled===false),'no pixel interpolation in generated art');
});
test('V8.3 original approved image stays at the same world size and foot anchor during entire attack',()=>{
 const d=doc(),body={width:128,height:160};
 const drawCtx={imageSmoothingEnabled:true,drawImage(...a){this.last=a}};
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
  for(const action of ['attack','skill']){
   assert.ok(comb.draw(drawCtx,{base:body,role,dir:2,action,elapsed:150,x:240,y:310,scale:.73,documentRef:d}));
   const call=drawCtx.last;
   assert.equal(call[1],Math.round(240-Math.round(128*.73)/2));
   assert.equal(call[2],Math.round(310-Math.round(160*.73)));
   assert.deepEqual(call.slice(3),[Math.round(128*.73),Math.round(160*.73)]);
  }
 }
});
test('V8.3 live game and lab both use real articulated poses instead of only fading idle PNG',()=>{
 const sprite=read('appearance-sprite-v76.js'),page=read('mundo.html'),lab=read('laboratorio-fidelidade-sprites-v82.html');
 assert.ok(sprite.includes('OsPeregrinosCombatPosesV83?.draw'));
 assert.ok(page.includes('combat-poses-v83.js?v=three-phase-actual-limb-art-v83'));
 assert.ok(page.indexOf('/combat-poses-v83.js')<page.indexOf('/appearance-sprite-v76.js'));
 assert.ok(lab.includes('OsPeregrinosCombatPosesV83?.render'));
 assert.ok(lab.includes('previewFrames'));
 assert.ok(lab.includes('setInterval(()=>'));
 assert.ok(lab.includes('id="animated"'));
 assert.ok(lab.includes('preparação, ação e recuperação'));
 assert.ok(!lab.includes('Faltam poses manuais de braços'));
});
