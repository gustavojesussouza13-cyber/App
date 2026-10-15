'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../public/army-pixel16.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
const root={Math};
vm.createContext(root);
vm.runInContext(src,root);
const api=root.PeregrinosArmyPixel16;
function render(type,time=100,scale=2){
 const ops=[];
 const g={fillStyle:'#000',save(){},restore(){},translate(){},scale(){},
  fillRect(x,y,w,h){ops.push([this.fillStyle,x,y,w,h])}};
 api.figure(g,type,100,100,time,scale);
 return ops;
}
test('four families paint visible 1-by-1 logical pixels instead of large blocks',()=>{
 assert.deepEqual(Array.from(api.TYPES),['militia','archer','knight','siege']);
 const signatures=[];
 for(const type of api.TYPES){
  const ops=render(type);
  assert.ok(ops.length>200,type+': insufficient handcrafted pixels ('+ops.length+')');
  assert.ok(ops.every(([color,x,y,w,h])=>w===2&&h===2&&
   [x,y].every(Number.isInteger)),type+': broad rectangle in sprite');
  assert.ok(new Set(ops.map(x=>x[0])).size>=6,type+': lacking material shades');
  signatures.push(JSON.stringify(ops));
 }
 assert.equal(new Set(signatures).size,4);
});
test('every troop has authored anatomy glints and movement variation',()=>{
 const names=['militia','archer','knight','siege'];
 for(const type of names){
  const idle=render(type,0),moving=render(type,180);
  assert.notDeepEqual(idle,moving,type+' animation frozen');
 }
 for(const keyword of ['ENGRAVINGS','steel','leather','gold','green',
  'const marks=ENGRAVINGS','wheel','gait']){
  assert.ok(src.includes(keyword),'missing texture '+keyword);
 }
});
test('formations still draw troops without changing army composition or 3D castles',()=>{
 const g={fillStyle:'#000',save(){},restore(){},translate(){},scale(){},
  fillRect(){this.pixels=(this.pixels||0)+1}};
 api.drawFormation(g,{militia:25,archer:12,knight:10,siege:3},60,90,250,{label:false});
 assert.ok(g.pixels>800,'formation should draw each family');
 assert.match(html,/army-pixel16\.js\?v=army-pixel-artisan-v3/);
 assert.match(html,/guild-city-3d\.js/);
 assert.doesNotMatch(src,/requestAnimationFrame|setInterval|fetch\(|WebSocket/);
});
