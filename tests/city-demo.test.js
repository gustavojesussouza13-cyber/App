'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('demonstração de cidades não envia dados ao servidor oficial e identifica o estado local',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/cidade-demo.html'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../public/city-isometric.js'),'utf8');
 assert.match(html,/Demonstração da Capital 3D/);
 assert.match(html,/sem conta, multiplayer ou salvamento/);
 assert.match(html,/city-isometric\.js/);
 assert.match(html,/window\.PeregrinosCity\.create/);
 assert.match(html,/Object\.hasOwn\(costs,type\)/);
 assert.doesNotMatch(html,/fetch\s*\(|WebSocket\s*\(|DATABASE_URL|localhost:3000/);
 assert.match(ui,/showModal\(\)/);
 assert.match(ui,/action:'construct'/);
});
