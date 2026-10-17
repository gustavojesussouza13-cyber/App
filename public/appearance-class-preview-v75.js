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
  guardiao:'/assets/approved-classes/guardiao-sprites-3x2-64x80.png',
  arqueiro:'/assets/approved-classes/arqueiro-sprites-3x2-64x80.png',
  curandeiro:'/assets/approved-classes/curandeiro-sprites-3x2-64x80.png'
 });
 function loaded(role){
  if(role==='peregrino')return !!root.OsPeregrinosRunway25D?.isReady?.();
  return !!root.OsPeregrinosApprovedClasses25D?.isReady?.(role);
 }
 function ensureLoaded(role){
  if(!Object.hasOwn(ROLES,role))return Promise.resolve(false);
  const p=role==='peregrino'?root.OsPeregrinosRunway25D?.load?.():
    root.OsPeregrinosApprovedClasses25D?.load?.(role);
  return p&&typeof p.then==='function'?p:Promise.resolve(false);
 }
 function draw(ctx,{role='peregrino',dir=2,action='idle',frame=0,appearance=null}={}){
  if(!Object.hasOwn(ROLES,role)||!ctx?.drawImage)return false;
  ctx.imageSmoothingEnabled=false;
  if(!loaded(role))return false;
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
