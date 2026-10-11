'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {checkTargets,details}=require('../scripts/verify-postgres-restore');
test('restauração é barrada no próprio banco de produção',()=>{
 const same='postgresql://user:password@database.local:5432/peregrinos_personagens_contas';
 assert.throws(()=>checkTargets(same,same),/destino deve ter nome|mesmo banco/);
});
test('destino deve ser banco de testes explicitamente identificado',()=>{
 const source='postgresql://user:password@database.local/peregrinos_personagens_contas';
 assert.throws(()=>checkTargets(source,'postgresql://user:password@database.local/peregrinos_personagens_contas'),/destino deve ter nome/);
 assert.throws(()=>checkTargets(source,'postgresql://user:password@database.local/other'),/destino deve ter nome/);
 assert.doesNotThrow(()=>checkTargets(source,'postgresql://user:password@database.local/peregrinos_restore_teste1'));
});
test('endereço não-Postgres é rejeitado',()=>{
 assert.throws(()=>details('https://example.com/db'),/não é PostgreSQL/);
 assert.throws(()=>details(''),/Defina/);
});
