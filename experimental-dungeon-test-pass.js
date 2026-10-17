'use strict';
/**
 * Four story/crown dungeon test passes. Never creates items for trade, modifies
 * quest stage, edits the DB, or weakens the continental-crown economy.
 * ONLY signed-in, verified server account identity in the dedicated Render
 * preview service. Guest nickname equality must never qualify.
 */
const PREVIEW_RENDER_ID='srv-db9katmq1p3s738j1gq0';
const TARGET='gustavo123';
const ROOTS=Object.freeze([12,13,14,15]);
function canGrant(account,env=process.env){
 return !!(account&&typeof account.uid==='string'&&account.uid.length>0&&
  typeof account.username==='string'&&account.username.toLocaleLowerCase('pt-BR')===TARGET&&
  env?.RENDER_SERVICE_ID===PREVIEW_RENDER_ID&&
  env?.EXPERIMENTAL_DUNGEON_TEST_USERNAME===TARGET);
}
function issue(account,env=process.env){
 return canGrant(account,env)?[...ROOTS]:[];
}
function canEnter(player,root){
 return player?.isAccount===true&&ROOTS.includes(root)&&
  Array.isArray(player.previewDungeonPasses)&&player.previewDungeonPasses.includes(root);
}
module.exports=Object.freeze({PREVIEW_RENDER_ID,TARGET,ROOTS,canGrant,issue,canEnter});
