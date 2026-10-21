'use strict';
// Regressão V9.2: nunca pintar o PNG 3x2 legado por cima do Guardião V9.1.
// Exercita a condição REAL do renderizador com papéis e estados falsos/verdadeiros.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'public/art16.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/mundo.html'),'utf8');
const match=source.match(/const approvedHero=([\s\S]*?)\n\s*if\((?:newHealerHero\|\|)?(?:newArcherHero\|\|)?detailedGuardiao\|\|/);
assert.ok(match,'a condição e a ordem de prioridade precisam existir');
const expression=match[1].trim().replace(/;$/,'');
const selectLegacy=new Function('detailedGuardiao','newArcherHero','newHealerHero','customizedHero','useAurora25d','p','state','attacking','window','moved','local','now','dir','g','return '+expression);
function invoke({role='guardiao',newDrawn=true,customDrawn=false,hurt=false,attacking=false,dead=false}={}){
 let calls=0;
 const legacy={draw(){calls++;return true;}};
 const chosen=selectLegacy(newDrawn,role==='arqueiro'&&newDrawn,role==='curandeiro'&&newDrawn,customDrawn,true,
  {role,x:40,y:90,appearance:null},{hurt,dead},attacking,
  {OsPeregrinosApprovedClasses25D:legacy},false,true,1000,2,{});
 return {calls,chosen};
}
test('V9.2 Guardiao animado nunca recebe segundo desenho do atlas antigo',()=>{
 for(const action of [{},{hurt:true},{attacking:true},{dead:true}]){
  const result=invoke(action);
  assert.equal(result.calls,0,JSON.stringify(action));
  assert.equal(result.chosen,false);
 }
});
test('V9.2 mantém fallback apenas se novo Guardião não renderizar',()=>{
 assert.equal(invoke({newDrawn:false}).calls,1);
 assert.equal(invoke({newDrawn:false,customDrawn:true}).calls,0);
 assert.equal(invoke({role:'arqueiro',newDrawn:false}).calls,1);
 assert.equal(invoke({role:'arqueiro',newDrawn:true}).calls,0);
 assert.equal(invoke({role:'curandeiro',newDrawn:false}).calls,1);
 assert.equal(invoke({role:'curandeiro',newDrawn:true}).calls,0);
 assert.equal(invoke({role:'peregrino',newDrawn:false}).calls,0);
});
test('V9.2 atualização do cache e continuidade da V9.1',()=>{
 assert.match(html,/art16\.js\?v=(?:guardiao-v92-single-render|arqueiro-v4-single-painter|curandeiro-v4-single-painter)-20261021/);
 assert.match(html,/guardiao-v91\.js\?v=/);
 assert.match(source,/OsPeregrinosGuardiaoV91\?\.draw/);
 assert.match(source,/const approvedHero=!newHealerHero&&!newArcherHero&&!detailedGuardiao&&!customizedHero/);
});
