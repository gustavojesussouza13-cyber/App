'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../public',p),'utf8');
test('V8.0 approved hero PNG remains on-screen during attack, skill, hurt for all four classes',()=>{
 const sprite=require('../public/appearance-sprite-v76.js');
 const app=require('../public/appearance16.js');
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
  for(const action of ['attack','skill','hurt']){
   assert.equal(sprite.drawWorld({drawImage(){}},{role,action,appearance:app.DEFAULT,x:60,y:70}),false,
    'unloaded PNG returns false but never draws obsolete art for '+role+'/'+action);
  }
 }
 assert.ok(sprite.combatPose('attack',175,1).angle>0);
 assert.ok(sprite.combatPose('attack',175,3).angle<0);
 assert.ok(sprite.combatPose('skill',175,2).dy<0);
 assert.ok(sprite.combatPose('hurt',80,2).alpha<1);
 assert.equal(sprite.combatPose('idle',20,2).angle,0);
 const world=read('art16.js'),mmo=read('mmo.js');
 assert.ok(world.includes("state.hurt?'hurt':attacking?(skill?'skill':'attack')"));
 assert.ok(world.includes('action:combatAction,frame:Math.floor(now/118),elapsed:state.elapsed'));
 assert.ok(world.includes('Boolean(lastActionWasSkill)'));
 assert.ok(world.includes('window.OsPeregrinosAppearanceSpriteV76?.drawWorld'));
 assert.ok(mmo.includes('lastActionWasSkill'));
});
test('tree foreground culls distant creatures, puts trees in front of wolves behind but not wolves in front',()=>{
 const o=require('../public/scenery-occlusion-v80.js');
 const tree={kind:'tree',x:180,y:320,w:110,h:126,image:{width:80,height:100}};
 assert.equal(o.needed(tree,[{x:177,y:267,boss:false}]),true,'wolf behind trunk must be hidden by leaves');
 assert.equal(o.needed(tree,[{x:175,y:340}]),false,'wolf in front stays visible');
 assert.equal(o.needed(tree,[{x:30,y:260}]),false,'distant wolf does not trigger repaint');
 assert.equal(o.needed(tree,[{x:177,y:120}]),false,'wolf nowhere near canopy');
 assert.equal(o.needed({...tree,kind:'rock'},[{x:180,y:280}]),false,'only trees covered');
 assert.equal(o.needed({...tree,image:null},[{x:180,y:280}]),false,'missing PNG never painted');
});
test('canonical foreground uses exactly the static approved original tree art and unchanged coordinates',async()=>{
 const canonical=await import('../public/world-scenery-v72-canonical.mjs');
 const dummy={width:77,height:130};
 const original=[{x:300,y:480,w:112,h:131,kind:'tree'},
   {x:390,y:490,w:45,h:45,kind:'bush'},
   {x:620,y:800,w:112,h:131,kind:'tree'}];
 const got=canonical.canonicalForegroundObjects({biome:'forest',objects:original},
  {replacement:()=>dummy});
 assert.equal(got.length,2);
 assert.equal(got[0].x,300);
 assert.equal(got[0].y,480);
 assert.equal(got[0].image,dummy);
 assert.ok(got[0].w<=112&&got[0].h<=131);
 assert.ok(Object.isFrozen(got[0]));
 const world=read('world-25d.mjs'),renderer=read('art16.js'),mmo=read('mmo.js');
 assert.ok(world.includes('foregroundProps=canonicalForegroundObjects(sourceMap)'));
 assert.ok(renderer.includes('depth:o.y'));
 assert.ok(renderer.includes('occlusion.needed(o,candidates)'));
 assert.ok(mmo.includes('world25d?.foregroundProps||[]'));
 assert.ok(!world.includes('guild-city-3d'));
});
