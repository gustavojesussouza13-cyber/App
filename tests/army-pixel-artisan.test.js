'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
require('../public/army-pixel16');
const ARMY=globalThis.PeregrinosArmyPixel16;
function mock(){
 const calls=[],motions=[];
 return{
  calls,motions,imageSmoothingEnabled:true,
  fillStyle:'',
  save(){motions.push(['save'])},restore(){motions.push(['restore'])},
  translate(x,y){
   assert.ok(Number.isInteger(x)&&Number.isInteger(y),'desenho na grade inteira');
   motions.push(['translate',x,y]);
  },
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'sem pixels quebrados');
   assert.ok(w>0&&h>0);calls.push([this.fillStyle,x,y,w,h]);
  },
  fillText(text,x,y){calls.push(['text',text,x,y])},
  set font(v){this._font=v},set textAlign(v){this._textAlign=v}
 };
}
test('milícia, arqueiro, cavaleiro e balista possuem contornos rasterizados separados',()=>{
 assert.deepEqual(ARMY.TYPES,['militia','archer','knight','siege']);
 const signatures=new Set();
 for(const type of ARMY.TYPES){
  const g=mock();
  ARMY.figure(g,type,150,140,0,2);
  assert.ok(g.calls.length>30,'faltam linhas pintadas para '+type);
  assert.equal(g.imageSmoothingEnabled,false);
  assert.ok(g.motions.some(x=>x[0]==='translate'));
  signatures.add(JSON.stringify(g.calls));
 }
 assert.equal(signatures.size,4);
});
test('formações mantêm tropas, quantidade e movimento',()=>{
 const units={militia:24,archer:12,knight:15,siege:3};
 const a=mock(),b=mock();
 ARMY.drawFormation(a,units,120,150,0);
 ARMY.drawFormation(b,units,120,150,450);
 assert.ok(a.calls.some(x=>x[0]==='text'&&x[1].includes('tropas')));
 assert.ok(a.calls.length>200);
 assert.notDeepEqual(a.motions,b.motions);
 const none=mock();ARMY.drawFormation(none,{},10,10);assert.equal(none.calls.length,0);
});
test('tropas não dependem do editor da fortaleza 3D',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../public/army-pixel16.js'),'utf8');
 assert.match(src,/const poly=\(col,pts\)=>/);
 assert.doesNotMatch(src,/three|guild-city-3d|WebSocket|fetch\(/i);
 const scope={};vm.createContext(scope);vm.runInContext(src,scope);
 assert.equal(scope.PeregrinosArmyPixel16.TYPES.length,4);
});
