'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ART=require('../public/heroes-master64');
const STUDIO=require('../public/sprite-studio');
const APP=require('../public/appearance16');
function paint(role,opts={}){
 const strokes=[],px=new Map(),ctx={fillStyle:null,
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'pixel art must remain native integer coordinates');
   assert.ok(w>0&&h>0,'no empty pixel clusters');
   strokes.push([this.fillStyle,x,y,w,h]);
   for(let yy=Math.max(0,y);yy<Math.min(80,y+h);yy++)
    for(let xx=Math.max(0,x);xx<Math.min(64,x+w);xx++)
     px.set(yy*64+xx,this.fillStyle);
  },
  save(){},restore(){},translate(){},scale(){}};
 assert.equal(ART.draw(ctx,{role,colors:STUDIO.ROLES[role],appearance:APP.DEFAULT,...opts}),true);
 return {strokes,px};
}
test('three hero torsos and capes are sculpted as irregular pixel contours, not huge filled boxes',()=>{
 assert.equal(ART.VERSION,'heroes-master64-v6');
 for(const role of ['guardiao','arqueiro','curandeiro']){
  const a=paint(role);
  assert.ok(a.strokes.length>180,role+' missing detail');
  for(const [,x,y,w,h]of a.strokes){
   if(x>=16&&x<=48&&y>=23&&y<=60){
    assert.ok(w*h<340,role+': rectangular torso of '+w+'x'+h+' at '+x+','+y);
   }
  }
  // Evaluate the *authored garments*, not the composite left border.
  // Guardião has a giant shield and Archer a bow, both covering the outline.
  const shapeRuns=a.strokes.filter(([col,x,y,w,h])=>
   h===1&&w>=3&&x>=16&&x<=47&&y>=32&&y<=70);
  assert.ok(shapeRuns.length>65,role+' garment needs hand-rasterized outlines');
  const edges=new Set(shapeRuns.map(([,x,y,w])=>x+':'+w));
  assert.ok(edges.size>=17,role+' garment edges must vary by row');
 }
});
test('all classes keep correct skin and outfits after contour replacement',()=>{
 for(const role of ['guardiao','arqueiro','curandeiro']){
  const app={...APP.DEFAULT,skin:'profundo',outfit:'safira',hairColor:'branco',cape:'marinho'};
  const changed=paint(role,{appearance:app});
  assert.ok(changed.strokes.some(x=>x[0]===APP.SKIN.profundo[0]),role+' lost face');
  assert.ok(changed.strokes.some(x=>x[0]===APP.COATS.safira[0]),role+' lost garment');
  const original=paint(role);
  assert.notDeepEqual(changed.strokes,original.strokes);
 }
});
test('walk, attack, hurt, death stay within their own visual identity',()=>{
 for(const role of ['guardiao','arqueiro','curandeiro']){
  for(const action of ['idle','walk','attack','hurt','death']){
   const out=paint(role,{action,frame:2,dir:1});
   assert.ok(out.strokes.length>170,role+'/'+action+' not painted');
  }
  const walk=Array.from({length:6},(_,frame)=>JSON.stringify(paint(role,{action:'walk',frame}).strokes));
  assert.ok(new Set(walk).size>=5);
 }
});
test('no 3D fortress or backend changes required, browser loads updated art',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 assert.match(html,/heroes-master64\.js\?v=heroes-master64-v6/);
 assert.match(html,/world-art-master64\.js\?v=world-art-master64-v4/);
 assert.match(html,/guild-city-3d\.js/);
 const source=fs.readFileSync(path.join(__dirname,'../public/heroes-master64.js'),'utf8');
 assert.match(source,/Mantos desenhados como polígonos de pixel art/);
 assert.match(source,/Torsos anatômicos separados/);
 assert.doesNotMatch(source,/requestAnimationFrame|setInterval|fetch\(|WebSocket/);
});
