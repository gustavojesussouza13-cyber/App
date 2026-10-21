'use strict';
/**
 * Latest four official V4/V7 character sheets, used by both appearance panels.
 * No SpriteStudio legacy hero preview, no new game role or save schema.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PeregrinosAppearanceClassPreviewV75=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const ROLES=Object.freeze({
  peregrino:'Peregrino',guardiao:'Guardião',arqueiro:'Arqueiro',curandeiro:'Curandeiro'
 });
 const SOURCES=Object.freeze({
  peregrino:'/assets/peregrino/peregrino-runway-walk.png',
  guardiao:'/assets/guardiao-v91/guardiao-walk-4x8-v91.png',
  arqueiro:'/assets/arqueiro-v4/arqueiro-v4-acoes-4x4.png',
  curandeiro:'/assets/approved-classes/curandeiro-sprites-3x2-64x80.png'
 });
 function loaded(role){
  if(role==='peregrino')return !!root.OsPeregrinosPeregrinoV85?.isReady?.()||!!root.OsPeregrinosRunway25D?.isReady?.();
  if(role==='guardiao'&&root.OsPeregrinosGuardiaoV91)return !!root.OsPeregrinosGuardiaoV91.isReady();
  if(role==='arqueiro'&&root.OsPeregrinosArqueiroV4)return !!root.OsPeregrinosArqueiroV4.isReady();
  return !!root.OsPeregrinosApprovedClasses25D?.isReady?.(role);
 }
 function ensureLoaded(role){
  if(!Object.hasOwn(ROLES,role))return Promise.resolve(false);
  const p=role==='peregrino'?(root.OsPeregrinosPeregrinoV85?.load?.()||root.OsPeregrinosRunway25D?.load?.()):
    role==='guardiao'&&root.OsPeregrinosGuardiaoV91?root.OsPeregrinosGuardiaoV91.load():
    role==='arqueiro'&&root.OsPeregrinosArqueiroV4?root.OsPeregrinosArqueiroV4.load():
    root.OsPeregrinosApprovedClasses25D?.load?.(role);
  return p&&typeof p.then==='function'?p:Promise.resolve(false);
 }
 function draw(ctx,{role='peregrino',dir=2,action='idle',frame=0,appearance=null}={}){
  if(!Object.hasOwn(ROLES,role)||!ctx?.drawImage)return false;
  ctx.imageSmoothingEnabled=false;
  if(!loaded(role))return false;
  // Both the world renderer and character creator share EXACTLY the same Guardiao V9.1 RGBA palette.
  if(role==='guardiao'&&root.OsPeregrinosGuardiaoV91?.isReady?.())
   return !!root.OsPeregrinosGuardiaoV91.draw(ctx,{
    role,dir,appearance,action,frame,now:frame*118,x:64,y:151,scale:1,glow:false
   });
  // Single source of Archer art in the character creator and the world.
  if(role==='arqueiro'&&root.OsPeregrinosArqueiroV4?.isReady?.())
   return !!root.OsPeregrinosArqueiroV4.draw(ctx,{
    role,dir,appearance,action,frame,now:frame*115,x:64,y:151,scale:1
   });
  // Preview uses the real NEW Peregrino sheet; older PNG remains safe fallback.
  if(role==='peregrino'&&root.OsPeregrinosPeregrinoV85?.isReady?.())
   return !!root.OsPeregrinosPeregrinoV85.draw(ctx,{
    x:64,y:158,dir,appearance,action,frame,scale:1.75,now:frame*135,glow:false
   });
  // Don't collapse the four source walk frames into odd/even idle switching.
  const walking=action==='walk';
  return !!root.OsPeregrinosAppearanceSpriteV76?.draw(ctx,{
   role,x:64,y:160,dir,action:walking?'walk':'idle',frame:walking?frame:0,
   appearance,scale:1,preview:true
  });
 }
 function status(role,appearance){
  const a=root.PeregrinosAppearance16?.normalize?.(appearance);
  const d=root.PeregrinosAppearance16?.DEFAULT;
  const custom=!!a&&!!d&&Object.keys(d).some(k=>a[k]!==d[k]);
  return {
   role:Object.hasOwn(ROLES,role)?role:'peregrino',
   name:ROLES[role]||ROLES.peregrino,
   ready:loaded(role),custom,source:SOURCES[role]||SOURCES.peregrino
  };
 }
 return Object.freeze({VERSION:'appearance-classes-v78-full-gait-20261017',ROLES,SOURCES,loaded,ensureLoaded,draw,status});
});
