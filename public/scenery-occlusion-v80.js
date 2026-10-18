'use strict';
/**
 * Tests foreground depth of a canonical tree against world entities.
 * A tree only covers creatures physically BEHIND its trunk, never nearby
 * entities standing in front. No changes to pathfinding or collision.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosSceneryOcclusionV80=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function inFrontOfActor(tree,actor){
  if(!tree||!actor||!Number.isFinite(tree.x)||!Number.isFinite(tree.y)||
     !Number.isFinite(tree.w)||!Number.isFinite(tree.h)||
     !Number.isFinite(actor.x)||!Number.isFinite(actor.y))return false;
  // Actor foot is BEHIND the tree foot, but inside its canopy silhouette.
  return actor.y<tree.y-5&&actor.y>tree.y-tree.h+15&&
   Math.abs(actor.x-tree.x)<tree.w/2+24;
 }
 function needed(tree,actors){
  return tree?.kind==='tree'&&!!tree.image&&Array.isArray(actors)&&
   actors.some(actor=>inFrontOfActor(tree,actor));
 }
 return Object.freeze({VERSION:'canonical-trees-front-occlusion-v80',inFrontOfActor,needed});
});
