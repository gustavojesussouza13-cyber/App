'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const portal=require('../public/portais-v74.js');
function mockCtx(){
 const calls=[];
 const ctx={imageSmoothingEnabled:true,fillStyle:'',fillRect:(...v)=>calls.push(['rect',...v]),drawImage:(...v)=>calls.push(['image',...v])};
 return {ctx,calls};
}
const cases=[
 [{gateway:true,stair:null,dungeon:true,zone:10},'gateway'],
 [{stair:'down',dungeon:true,zone:16},'down'],
 [{stair:'up',dungeon:true,zone:12},'up'],
 [{dungeon:true,zone:15},'dungeon'],
 [{frontier:true,zone:40},'frontier'],
 [{zone:1},'surface']
];
test('V7.4 paints all six server-defined portal kinds with no old assets',()=>{
 assert.equal(portal.VARIANTS.length,6);
 assert.equal(portal.WIDTH,112);assert.equal(portal.HEIGHT,140);
 for(const [server,expected] of cases){
  assert.equal(portal.classifyPortal(server),expected);
  const a=mockCtx();
  portal.paint(a.ctx,{kind:expected,frame:0});
  const b=mockCtx();
  portal.paint(b.ctx,{kind:expected,frame:0});
  assert.deepEqual(a.calls,b.calls,'deterministic '+expected);
  assert.ok(a.calls.length>130,'detailed pixel blocks '+expected);
  assert.ok(a.calls.every(v=>v[0]==='rect'),'no blur or anti-aliased polygon');
 }
 assert.equal(portal.classifyPortal({gateway:true,stair:'up'}),'gateway');
});
test('V7.4 draws without shifting portal x/y or interfering with pointer gameplay',()=>{
 const {ctx,calls}=mockCtx(),source={x:720,y:490,zone:15,name:'Passagem do Reino',gateway:true};
 const copy=JSON.parse(JSON.stringify(source));
 const canvas={getContext:()=>mockCtx().ctx,width:0,height:0};
 const fakeDocument={createElement:()=>({...canvas})};
 assert.equal(portal.draw(ctx,source,{now:360,near:true,documentRef:fakeDocument}),true);
 const draw=calls.find(x=>x[0]==='image');
 assert.deepEqual(draw.slice(2),[664,350,112,140]);
 assert.deepEqual(source,copy);
 assert.equal(ctx.imageSmoothingEnabled,false);
});
test('portal pixels are replaced in the actual online scene without duplicate legacy layer',()=>{
 const src=read('art16.js'),page=read('mundo.html');
 assert.ok(page.includes('/portais-v74.js?v=portais-v74-original-20261017'));
 assert.ok(page.indexOf('/portais-v74.js')<page.indexOf('/art16.js'));
 assert.ok(src.includes('const freshPortal=window.OsPeregrinosPortalsV74?.draw'));
 assert.ok(src.includes('if(!freshPortal){'));
 assert.ok(src.includes('if(pixelDetail)pixelDetail.drawPortal(g,p,now);'));
 assert.ok(src.includes("actors.push({depth:p.y-1,paint:()=>portal(ctx,p,now,{x,y})});"));
 const server=fs.readFileSync(path.resolve(root,'../world-engine.js'),'utf8');
 assert.ok(server.includes('usePortal(p,z)'));
 assert.ok(server.includes("stair:kind==='stair'"));
 const mmo=read('mmo.js');
 assert.ok(mmo.includes("send('portal',{zone:gate.zone})"));
 assert.ok(mmo.includes("session.portals"));
});
