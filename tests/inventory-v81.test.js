'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const inv=require('../public/inventory-v81.js');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../public',p),'utf8');
test('V8.1 inventory only shows server-owned items with correct counts, class restrictions and names',()=>{
 const supplied={pocao:3,superpocao:2,espada:1,arco:1,amuleto:1,chave:1,chave_coroa_aurora:1,
  sabre_peregrino:1,cajado_misericordia:1,manto_luz:1,not_owned:0};
 const list=inv.owned(supplied,{espada:{name:'Espada temperada'}},{manto_luz:{name:'Manto da Luz Serena',rarity:'raro'}});
 assert.equal(list.length,10);
 assert.ok(list.every(x=>x.count>0),'only legitimate positive server quantities');
 assert.equal(list.find(x=>x.id==='pocao').count,3);
 assert.equal(list.find(x=>x.id==='manto_luz').rarity,'raro');
 assert.ok(list.find(x=>x.id==='chave_coroa_aurora').category==='quests');
 assert.ok(list.find(x=>x.id==='superpocao').canUse);
 assert.ok(!list.find(x=>x.id==='amuleto').canUse);
 assert.deepEqual(inv.defaultQuick(list).slice(0,3),['pocao','superpocao','espada']);
 assert.equal(inv.LIMIT,35);assert.equal(inv.QUICK_COUNT,8);
});
test('V8.1 equipment shown is solely the already server-authorized passive equipment',()=>{
 const p={espada:1,arco:1,sabre_peregrino:1,cajado_misericordia:1,manto_luz:1,amuleto:1};
 assert.equal(inv.equipped('peregrino',p).arma,'sabre_peregrino');
 assert.equal(inv.equipped('curandeiro',p).arma,'cajado_misericordia');
 assert.equal(inv.equipped('guardiao',p).arma,'espada');
 assert.equal(inv.equipped('arqueiro',p).arma,'arco');
 assert.equal(inv.equipped('arqueiro',{}).arma,'arco_simples');
 assert.equal(inv.equipped('peregrino',p).armadura,'manto_luz');
 assert.equal(inv.equipped('peregrino',p).amuleto,'amuleto');
 assert.equal(inv.equipped('peregrino',p).elmo,null,'no invented equip slots');
});
test('V8.1 twelve item categories use ORIGINAL integer-pixel drawing commands, not emoji/image URLs',()=>{
 for(const item of Object.values(inv.IDS)){
  const draws=[];const ctx={fillStyle:'',clearRect(){},fillRect(x,y,w,h){draws.push([x,y,w,h])}};
  assert.equal(inv.drawIcon(ctx,item.icon),true,item.icon);
  assert.ok(draws.length>=8,'dedicated pixel drawing commands '+item.icon);
  assert.ok(draws.every(x=>x.every(Number.isInteger)),item.icon+' uses pixel grid');
 }
});
test('V8.1 real overlay opens via I and Escape, blocks movement, syncs inventory and dispatches only authorized use',()=>{
 const html=read('mundo.html'),game=read('mmo.js'),style=read('inventory-v81.css'),module=read('inventory-v81.js');
 for(const name of ['opInventory','opInventoryClose','opInventoryGrid','opInventoryPortrait',
  'opInventoryEquipment','opInventoryHotbar','opQuickbar','openInventoryBtn'])assert.ok(html.includes('id="'+name+'"'),name);
 for(const token of ['inventoryUI.open()','inventoryUI.quickUse','inventoryUI?.sync(c,session.shop,session.relics)',
  '!inventoryUI.openState','inventoryUI?.close()'])assert.ok(game.includes(token),token);
 assert.ok(game.includes("if(e.code==='Escape'||e.code==='KeyI')"));
 assert.ok(module.includes("send('use',{item:id})"));
 assert.ok(!module.includes("send('equip'"));
 assert.ok(!module.includes("item.buy"));
 assert.ok(style.includes('#opInventory[hidden]'));
 assert.ok(html.includes('inventory-v81.css?v=pixel-inventory-v81'));
 assert.ok(html.includes('inventory-v81.js?v=handpainted-icons-v81'));
 assert.ok(html.includes('mmo.js?v=interactive-inventory-v81'));
});

test('V8.1 keyboard can bind an item to an EMPTY slot, and menu canvas icons override MMO stretch rules',()=>{
 const src=read('inventory-v81.js'),css=read('inventory-v81.css');
 assert.ok(src.indexOf('if(state.open&&state.assign&&state.selected)')<
   src.indexOf('const item=find(state.quick[index]);if(!item)return false;'));
 assert.ok(css.includes('.canvas-shell canvas.op-item-icon'));
 assert.ok(css.includes('.canvas-shell #opInventoryPortrait'));
 assert.ok(!src.includes('.cloneNode(true)'), 'canvas clones discard hand-painted pixels');
});
