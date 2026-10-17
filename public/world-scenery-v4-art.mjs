'use strict';
/**
 * Os Peregrinos · cenografia 2.5D V4.2 · acabamento artesanal.
 * Camada opcional sobre a arte V4: silhuetas com volumes em pixel clusters,
 * detalhes específicos de bioma e novos pontos de interesse ESTÁTICOS.
 * Nenhum movimento, física, spawn, banco de dados, animação ou fortaleza 3D.
 */
export const ART_VERSION='scenery-v42-handcrafted-20261017';
const BIOMES=['meadow','forest','river','desert','mountain','ruins','swamp','coast','city','dungeon'];
const TONAL={
 meadow:['#214838','#43854f','#78b768','#bee2a3','#e8d1a2','#aa774a'],
 forest:['#153b34','#316749','#58955f','#a4c580','#eed7a0','#76523b'],
 river:['#235956','#478875','#83b39b','#c2ddbd','#e7dbb3','#695741'],
 desert:['#765d43','#a28854','#c5af71','#eee1ad','#f9e7ba','#75523e'],
 mountain:['#354d50','#617d76','#93a697','#c3d5bc','#e4debe','#675b4a'],
 ruins:['#304f47','#59825f','#86a486','#c4d0ac','#e8dcb5','#695b4c'],
 swamp:['#1b423d','#426e58','#779875','#b2c5a0','#d5d2b1','#574d3f'],
 coast:['#26695b','#4e9a76','#8ac89e','#c7e2bc','#f0e4b7','#876a48'],
 city:['#375643','#628467','#9bae81','#d8d6a8','#f7dda0','#876346'],
 dungeon:['#293e49','#536d77','#88a7a1','#c5c9b7','#e7e1c9','#6c5656']
};
const STONE=['#263541','#47535c','#717d7d','#a3b0aa','#c8cebd','#e5debd'];
const WOOD=['#2e3032','#4d4038','#79583e','#a1794c','#d1a16b','#f0c68e'];
const INK='#1d2c35';
export const EXTRA_KINDS=Object.freeze(['mushroom','stump','obelisk','market','boat','statue','crystal','grave','fountain','watchtower']);
export const EXTRA_SIZES=Object.freeze({
 mushroom:[49,54],stump:[60,55],obelisk:[64,114],market:[139,120],
 boat:[105,59],statue:[73,112],crystal:[58,83],grave:[64,72],
 fountain:[115,89],watchtower:[116,149]
});
const px=(g,color,x,y,w=1,h=1)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function polygon(g,color,pts){g.fillStyle=color;g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.closePath();g.fill();}
function rng(n){n|=0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);n=(n^(n>>>16))>>>0||1;return ()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);}
function diamond(g,c,x,y,w,h){polygon(g,c,[[x,y-h],[x+w,y],[x,y+h],[x-w,y]]);}
function ellipse(g,c,x,y,w,h){g.fillStyle=c;g.beginPath();g.ellipse(x,y,w,h,0,0,Math.PI*2);g.fill();}
function leafCluster(g,x,y,palette,r){
  const poly=Array.from({length:9},(_,i)=>{
    const a=Math.PI*2*i/9,d=(.77+.22*r())*13;
    return [Math.round(x+Math.cos(a)*d),Math.round(y+Math.sin(a)*d*.73)];
  });
  polygon(g,palette[0],poly);
  for(let i=0;i<7;i++){
    const xx=x-10+r()*20|0,yy=y-8+r()*13|0;
    px(g,palette[1+(r()*3|0)],xx,yy,2+(r()*5|0),1+(r()*3|0));
  }
  px(g,palette[3],x-6,y-9,5,2);
}
function masonry(g,r,baseX,baseY,cols,rows,palette,stepX=13,stepY=9){
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=baseX+i*stepX+((j%2)*6),y=baseY+j*stepY;
    const block=palette[(r()*palette.length)|0];
    px(g,block,x,y,stepX-2,stepY-2);
    if(r()>.70)px(g,'#f1e3c080',x+2,y+1,4,2);
    if(r()>.81)px(g,'#243c3c88',x+2,y+stepY-4,7,1);
  }
}
function ivy(g,r,x,y,count=13,colors=TONAL.forest){
  for(let i=0;i<count;i++){
    const dx=x+(r()*24|0),dy=y+i*3;
    px(g,colors[0],dx,dy,2,8);
    if(i%2===0){px(g,colors[1],dx-4,dy+2,7,4);px(g,colors[2],dx+1,dy+1,5,3);}
  }
}
function sparkle(g,r,cx,cy,n,palette){
 for(let i=0;i<n;i++){const x=cx+(r()-.5)*24|0,y=cy+(r()-.5)*17|0;
  px(g,palette[2+(i%2)],x,y,3+(r()*4|0),1+(r()*2|0));
 }
}

export function finishSceneryGround(g,biome,zone){
 if(!TONAL[biome])return false;
 const r=rng(15001+zone*637+BIOMES.indexOf(biome)*1399),c=TONAL[biome];
 const stone=['city','ruins','mountain','dungeon'].includes(biome),dry=['desert','coast'].includes(biome);
 for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=32){
   if(stone){
    if(r()>.49){
     for(let k=0;k<4;k++){const xx=x+4+(r()*22|0),yy=y+3+(r()*23|0);
      px(g,c[(1+r()*3)|0],xx,yy,4+(r()*6|0),2);
      if(k===0)px(g,c[0],xx+2,yy+3,1,6);
     }
    }
    if(biome==='ruins'&&r()>.72){
     px(g,c[0],x+7,y+16,4,4);px(g,c[1],x+10,y+12,7,3);
     px(g,c[2],x+13,y+16,4,3);
    }
   }else if(dry){
    if(r()>.43)for(let i=0;i<3;i++){
     const px0=x+(r()*25|0),py0=y+(r()*29|0);
     px(g,c[i%2?2:1],px0,py0,8+(r()*8|0),1);
    }
    if(biome==='coast'&&r()>.88){
      px(g,'#f6e1c1',x+15,y+21,6,2);px(g,'#b28c6b',x+18,y+19,2,5);
    }
   }else{
    if(r()>.41){
     const px0=x+6+(r()*18|0),py0=y+4+(r()*21|0);
     px(g,c[0],px0,py0,3,8);px(g,c[2],px0+2,py0-2,3,8);
     px(g,c[3],px0+4,py0+2,3,3);
     if(biome==='river'||biome==='swamp'){px(g,c[1],px0-4,py0+6,11,2);}
    }
    if(r()>.85&&biome!=='dungeon'){
     const px0=x+7,py0=y+23;
     px(g,'#f3dca5',px0,py0,3,3);px(g,'#d6adce',px0+5,py0-3,4,3);
     px(g,c[0],px0+2,py0+3,8,2);
    }
   }
 }
 return true;
}

export function finishSceneryRoad(g,biome,zone){
 if(!TONAL[biome])return false;
 const r=rng(31003+zone*911+BIOMES.indexOf(biome)*541),c=TONAL[biome];
 const stone=['city','ruins','dungeon','mountain'].includes(biome);
 for(let y=0;y<128;y+=8)for(let x=0;x<128;x+=8){
  if(r()>.58){
   px(g,stone?c[1]:c[5],x+2,y+5,4+(r()*4|0),1);
   if(r()>.65)px(g,stone?c[3]:c[4],x+1,y+3,3,1);
  }
  if(!stone&&r()>.94){px(g,c[0],x+2,y+2,1,5);px(g,c[2],x+4,y+1,2,4);}
 }
 for(let y=3;y<128;y+=13){
  for(let x of [0,123]){
   px(g,c[0],x,y,4,5);px(g,c[2],x+1,y+1,2,2);
  }
 }
 return true;
}
function finishTree(g,r,c){
  // Separate crown clusters that read in both 1:1 and 93x116.
  const foliage=[c[0],c[1],c[2],c[3]];
  const clusters=[[47,22],[26,36],[68,38],[34,56],[60,56],[49,43],[17,54],[77,54]];
  for(const [x,y] of clusters){
   if(r()>.24)leafCluster(g,x+(r()*8|0)-4,y+(r()*6|0)-3,foliage,r);
  }
  // Bark grain, limb intersections, lichen and sunlit leaf tips.
  for(let i=0;i<17;i++){let x=43+(r()*12|0),y=69+(r()*36|0);
   px(g,i%3?'#4d3b32':'#c7a16e',x,y,2+(r()*2|0),4+(r()*7|0));
  }
  for(let i=0;i<38;i++){const x=13+(r()*70|0),y=11+(r()*60|0);
   if((x-47)**2/42**2+(y-42)**2/37**2>1)continue;
   px(g,i%4===0?c[3]:i%3===0?'#deca87':c[2],x,y,2+(r()*4|0),2+(r()*2|0));
  }
  ivy(g,r,40,76,7,c);
}
function finishHouse(g,r,c){
  // Hand-painted roof courses follow both planes of the building.
  for(let row=0;row<5;row++)for(let i=0;i<9;i++){
   const y=25+row*7,x=47-row*6+i*5;
   const roofColor=r()>.35?'#344d62':'#7091a0';
   px(g,roofColor,x,y,4,2);px(g,'#d6c79c',x+1,y+1,2,1);
  }
  // Rough limestone at lower storey; consistent with a warm village.
  for(let i=0;i<27;i++){
   const x=14+(r()*68|0),y=63+(r()*38|0);
   if(x>38&&x<64&&y>79)continue;
   px(g,i%4===0?'#ebdcbe':i%3===0?'#7b776b':'#b6ac93',x,y,6+(r()*6|0),2+(r()*3|0));
  }
  // Chimney, lintel, carved jambs, flowerpot under a lit window.
  px(g,INK,68,12,14,21);px(g,'#9c8d7a',71,13,9,17);px(g,'#e3d2b4',71,13,6,2);
  px(g,INK,38,73,26,5);px(g,'#c99d60',42,75,18,2);
  for(const x of [17,70]){
   px(g,'#3b4248',x-1,75,15,15);px(g,'#b58056',x,76,13,2);
   px(g,'#e8b66c',x+2,80,10,7);px(g,'#fff0ba',x+4,80,4,6);
   px(g,'#664935',x+6,77,2,12);
  }
  px(g,'#3c4737',12,100,16,7);px(g,c[1],12,97,12,6);
  for(let i=0;i<8;i++){let x=12+(r()*20|0),y=94+(r()*8|0);
   px(g,['#edc18e','#e4aad1','#f6e5af'][i%3],x,y,3,3);
  }
  px(g,'#705943',36,111,29,3);px(g,'#dec599',40,112,20,2);
}
function finishStone(g,r,c){
  // Crack paths, quartz edge, moss, lichens at the bottom.
  for(let k=0;k<4;k++){
   const x=23+(r()*46|0),y=73+(r()*23|0);
   px(g,STONE[0],x,y,2,8);px(g,STONE[1],x+2,y+6,9,2);
   px(g,STONE[4],x-3,y-3,8,2);
  }
  for(let i=0;i<21;i++){const x=18+(r()*58|0),y=85+(r()*26|0);
   px(g,i%3?c[1]:c[2],x,y,3+(r()*5|0),2+(r()*3|0));
  }
  sparkle(g,r,46,77,8,STONE);
}
function finishRuin(g,r,c){
  masonry(g,r,22,44,4,6,['#8e9890','#b4b4a5','#c7c8b4','#637671'],12,8);
  // Cracked stone, horizontal lintel and a motif carved into the rock.
  for(let i=0;i<9;i++){
   const x=19+(r()*56|0),y=32+(r()*70|0);
   px(g,STONE[0],x,y,2,9);px(g,STONE[2],x+1,y+6,6,2);
  }
  px(g,'#c8b889',46,30,5,9);px(g,'#e3d7ac',43,34,11,2);
  if(r()>.32)ivy(g,r,21,48,11,c);
  if(r()>.48)ivy(g,r,67,47,12,c);
}
function finishFence(g,r,c){
  for(let x=7;x<91;x+=14)for(let y of [80,96]){
   px(g,WOOD[0],x,y,3,3);px(g,WOOD[5],x+1,y+1,1,1);
  }
  for(let x=9;x<93;x+=9)px(g,WOOD[4],x,87,6,1);
}
function finishFlora(g,r,c,kind){
 for(let i=0;i<(kind==='flower'?19:28);i++){
  const x=15+(r()*67|0),y=75+(r()*34|0);
  if(kind==='flower'){
   px(g,i%3?'#eab1bd':'#f4dc9d',x,y-5,4,4);
   px(g,'#ffe5a2',x+1,y-4,2,2);
  }else if(kind==='reeds'){
   px(g,'#7a8d61',x,y-7,2,16);
   px(g,i%3?'#dec28b':'#a2bb76',x+1,y-11,3,12);
  }else{
   px(g,c[0],x-5,y+2,7,4);px(g,c[2],x-2,y-2,9,4);
   px(g,c[3],x,y-3,3,2);
  }
 }
}
function finishSmallProp(g,r,c,kind){
 if(kind==='barrel'||kind==='crate'||kind==='well'){
  for(let i=0;i<10;i++){let x=25+(r()*45|0),y=76+(r()*26|0);
   px(g,i%2?WOOD[5]:WOOD[1],x,y,4,2);
  }
  if(kind==='well'){
   px(g,'#d8e8d7',43,75,13,2);px(g,'#65b3ad',48,80,9,2);
   ivy(g,r,20,91,5,c);
  }
 }else if(kind==='lamp'){
  px(g,'#ffedb4',43,35,10,15);px(g,'#fff5c9',45,39,5,6);
  px(g,'#6c4b37',37,29,23,3);
  px(g,'#e8be7b',44,22,10,3);
 }else if(kind==='sign'){
  for(let j=0;j<3;j++){
   px(g,WOOD[1],29,46+j*6,40-j*3,2);
   px(g,WOOD[4],34,47+j*6,14,1);
  }
 }
}
function mushroom(g,r,c){
 ellipse(g,'#142e2c66',49,108,25,5);
 for(const [x,y,size] of [[27,96,12],[46,83,21],[70,99,10]]){
  px(g,'#392e33',x-3,y,size*.35,size*1.1);
  px(g,'#e5d4ab',x-1,y,size*.28,size*.9);
  polygon(g,'#443a45',[[x-size,y],[x-size*.8,y-size*.5],[x,y-size],[x+size,y-size*.5],[x+size,y+1]]);
  polygon(g,size>15?'#b66764':'#ad8159',[[x-size+3,y-3],[x-size*.6,y-size*.55],[x,y-size+4],[x+size*.6,y-size*.6],[x+size-3,y-2]]);
  for(let j=0;j<5;j++){const xx=x+(r()-.5)*size*1.35|0,yy=y-size*.62+(r()-.5)*size*.4|0;
   px(g,'#ecd3a4',xx,yy,3,2);}
 }
}
function stump(g,r,c){
 ellipse(g,'#1b302866',48,112,29,6);
 polygon(g,WOOD[0],[[18,76],[72,73],[77,111],[20,115]]);
 polygon(g,WOOD[2],[[22,78],[68,77],[70,107],[23,108]]);
 for(let i=0;i<10;i++)px(g,i%2?WOOD[1]:WOOD[4],24+(r()*40|0),83+(r()*23|0),3,15);
 ellipse(g,WOOD[0],45,76,27,12);ellipse(g,WOOD[3],45,72,23,9);
 ellipse(g,WOOD[1],45,72,18,6);ellipse(g,WOOD[4],45,72,14,3);
 for(let i=0;i<13;i++){const x=23+(r()*51|0),y=106+(r()*8|0);
  px(g,c[i%3],x,y,3,3);}
}
function obelisk(g,r,c){
 ellipse(g,'#1b2a3566',47,115,26,6);
 polygon(g,STONE[0],[[23,111],[28,47],[44,16],[65,44],[71,111]]);
 polygon(g,STONE[2],[[30,103],[35,49],[45,23],[45,103]]);
 polygon(g,STONE[3],[[46,24],[62,48],[62,105],[46,102]]);
 px(g,STONE[4],39,34,4,32);px(g,'#aacabd',45,54,5,13);
 px(g,'#295963',35,82,24,4);px(g,'#a8d7cb',43,78,8,10);
 px(g,STONE[0],18,108,59,6);px(g,STONE[2],25,104,46,5);
}
function market(g,r,c){
 ellipse(g,'#132f2866',47,114,42,6);
 for(const x of [17,77]){px(g,WOOD[0],x,46,6,65);px(g,WOOD[3],x+2,49,3,60);}
 polygon(g,INK,[[10,50],[26,24],[74,24],[91,50],[81,63],[16,63]]);
 polygon(g,'#9d4b46',[[14,48],[29,28],[49,27],[49,59],[20,57]]);
 polygon(g,'#dec78e',[[49,27],[73,27],[87,48],[77,57],[49,59]]);
 for(let j=0;j<6;j++){
  px(g,j%2?'#f1c77d':'#b95e55',19+j*11,50,11,8);
  px(g,'#634c42',18+j*11,59,11,3);
 }
 px(g,WOOD[0],22,82,54,27);px(g,WOOD[2],26,84,48,21);
 for(let i=0;i<12;i++){let x=29+(r()*40|0),y=86+(r()*14|0);
  px(g,i%3?'#c49e65':'#8ba36a',x,y,6,4);}
 px(g,'#eed5a5',30,81,39,4);
}
function boat(g,r,c){
 ellipse(g,'#184b5366',49,104,41,6);
 polygon(g,WOOD[0],[[5,74],[23,67],[74,66],[94,75],[77,103],[23,101]]);
 polygon(g,WOOD[2],[[11,74],[25,69],[73,69],[88,75],[73,97],[25,96]]);
 for(let i=0;i<8;i++)px(g,WOOD[4],27,72+i*3,45,1);
 px(g,'#5c4440',45,70,6,19);px(g,'#e5d6aa',49,38,3,36);
 polygon(g,'#eee1bd',[[51,40],[76,70],[51,70]]);
 polygon(g,'#9bbcb2',[[54,47],[72,67],[53,67]]);
 px(g,WOOD[5],18,85,57,2);
}
function statue(g,r,c){
 ellipse(g,'#1c2b3566',50,114,31,5);
 masonry(g,r,20,105,4,1,[STONE[1],STONE[2],STONE[3]],14,9);
 polygon(g,STONE[0],[[36,54],[60,54],[66,98],[29,98]]);
 polygon(g,STONE[2],[[38,56],[57,56],[60,94],[34,94]]);
 polygon(g,STONE[1],[[36,44],[37,31],[48,22],[61,31],[60,48],[66,72],[59,75],[48,55],[35,71],[28,71]]);
 polygon(g,STONE[3],[[41,33],[47,27],[56,33],[55,42],[43,44]]);
 px(g,STONE[4],43,32,4,3);px(g,STONE[0],44,39,13,2);
 px(g,'#b59d6c',36,83,24,4);px(g,'#e2c993',44,79,7,12);
 ivy(g,r,24,88,9,c);
}
function crystal(g,r,c){
 ellipse(g,'#15323b66',46,114,23,5);
 polygon(g,STONE[0],[[21,105],[32,89],[65,92],[79,106]]);
 polygon(g,STONE[2],[[25,100],[45,90],[69,97],[71,107],[28,109]]);
 const gem=BIOMES.indexOf(c.biome)<0?['#1c5169','#367e90','#7abec2','#e5faf0']:['#275b66','#459aa3','#88d8cb','#e8fff6'];
 polygon(g,gem[0],[[35,87],[39,47],[52,29],[66,53],[62,89],[52,103]]);
 polygon(g,gem[1],[[40,84],[44,48],[52,34],[52,98]]);
 polygon(g,gem[2],[[53,36],[62,56],[59,86],[53,98]]);
 px(g,gem[3],49,50,4,21);px(g,gem[3],55,75,3,10);
 for(let i=0;i<5;i++){const x=24+(r()*48|0),y=100+(r()*8|0);px(g,gem[2],x,y,4,2);}
}
function grave(g,r,c){
 ellipse(g,'#172b2d66',48,110,26,5);
 polygon(g,STONE[0],[[25,108],[26,65],[35,45],[48,39],[62,48],[69,66],[69,109]]);
 polygon(g,STONE[2],[[30,105],[31,65],[38,49],[48,43],[59,51],[65,65],[65,105]]);
 px(g,STONE[4],43,56,9,23);px(g,STONE[1],38,62,19,5);
 px(g,STONE[1],44,75,7,12);px(g,STONE[4],43,57,10,2);
 ivy(g,r,29,81,9,c);
}
function fountain(g,r,c){
 ellipse(g,'#153e4466',48,114,37,5);
 ellipse(g,STONE[0],48,94,40,20);ellipse(g,STONE[2],48,89,37,16);
 ellipse(g,'#1f5267',48,89,29,11);ellipse(g,'#459aab',48,90,24,9);
 ellipse(g,STONE[0],48,68,16,10);ellipse(g,STONE[3],48,66,13,6);
 px(g,STONE[2],43,45,10,28);px(g,STONE[4],44,42,8,7);
 px(g,'#d1e6d6',47,37,4,17);px(g,'#86ced3',41,55,5,24);
 for(let j=0;j<8;j++){let x=23+(r()*48|0),y=85+(r()*18|0);px(g,j%2?'#b8e4d7':'#5cc6d0',x,y,5,2);}
}
function watchtower(g,r,c){
 ellipse(g,'#112c3266',46,120,38,6);
 masonry(g,r,24,51,4,6,['#596763','#7c8980','#9e9d86','#b1ad93'],12,10);
 polygon(g,STONE[0],[[25,102],[28,47],[64,47],[71,105]]);
 polygon(g,STONE[3],[[31,97],[31,55],[63,55],[65,96]]);
 px(g,STONE[0],40,75,15,24);px(g,WOOD[1],43,79,10,18);
 polygon(g,INK,[[17,49],[47,11],[78,49],[68,55],[48,28],[27,56]]);
 polygon(g,'#627b83',[[23,48],[47,17],[47,52],[30,58]]);
 polygon(g,'#a06c54',[[48,17],[73,48],[67,59],[47,52]]);
 for(let i=0;i<6;i++){px(g,'#d0b982',36+i*5,38+i%2*3,4,2);}
 px(g,STONE[0],23,49,46,5);
}
const EXTRA_DRAW={
 mushroom,stump,obelisk,market,boat,statue,crystal,grave,fountain,watchtower
};
export function finishScenerySprite(g,{kind,biome='meadow',variant=0}={}){
 const c=TONAL[biome]||TONAL.meadow,r=rng((variant+1)*1087+(BIOMES.indexOf(biome)+1)*931+Array.from(kind||'').reduce((a,ch)=>a+ch.charCodeAt(0),0)*59);
 if(EXTRA_DRAW[kind]){EXTRA_DRAW[kind](g,r,c);return true;}
 if(['tree','pine','palm'].includes(kind))finishTree(g,r,c);
 else if(kind==='house')finishHouse(g,r,c);
 else if(kind==='rock')finishStone(g,r,c);
 else if(['ruin','arch','pillar','altar'].includes(kind))finishRuin(g,r,c);
 else if(kind==='fence'||kind==='bridge')finishFence(g,r,c);
 else if(['shrub','flower','reeds'].includes(kind))finishFlora(g,r,c,kind);
 else if(['well','crate','barrel','lamp','sign'].includes(kind))finishSmallProp(g,r,c,kind);
 else if(kind==='log'||kind==='cactus'){
  for(let i=0;i<14;i++){const x=22+(r()*49|0),y=71+(r()*32|0);px(g,i%2?c[2]:c[1],x,y,2+(r()*4|0),1+(r()*3|0));}
 }
 return true;
}
