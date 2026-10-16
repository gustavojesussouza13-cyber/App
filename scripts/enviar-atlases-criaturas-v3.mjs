/**
 * Envia somente cinco PNGs V3 à branch de revisão do GitHub.
 * Dry-run: node scripts/enviar-atlases-criaturas-v3.mjs /pasta/do/pacote --dry-run
 * Envio: node scripts/enviar-atlases-criaturas-v3.mjs /pasta/do/pacote --confirm-upload
 * Usa GH_TOKEN/GITHUB_TOKEN ou gh auth token. Nunca cole o token no chat.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const repo='gustavojesussouza13-cyber/App';
const branch='feature/criaturas-v3-review-20261016';
const names=['limo','lobo','aranha','esqueleto','golem'];
const approved=Object.freeze({
 limo:'fe1cf22702a956f11701bf3c787488bae7362677af3492575ed5ca0ce6066675',
 lobo:'e2245b04292ffa26393385af6b60bd2f523aeaa7b5bf6920d3252be8d50f7091',
 aranha:'77eb109b847e94b2b76bc15b1535a86b356de315be9720509fc58479c2f23779',
 esqueleto:'336fa26b5303d55ddecbd0f523d598ccdc3427189dc0db27db56881cc044e49c',
 golem:'35c9c164a263bf6ffe5985172b6606cba12439677f5d7a20b01bc176751c07bb'
});
const dir=path.resolve(process.argv[2]||'.');
const command=process.argv[3];
if(!['--dry-run','--confirm-upload'].includes(command)){
 console.error('Uso: node enviar-atlases-criaturas-v3.mjs /pasta/do/pacote --dry-run|--confirm-upload');
 process.exit(2);
}
const files=[];
for(const name of names){
 const rel=`public/assets/creatures-v3/${name}_v3.png`;
 const file=path.join(dir,rel);
 const b=fs.readFileSync(file);
 const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
 if(!b.subarray(0,8).equals(pngSignature)||b.readUInt32BE(16)!==768||
    b.readUInt32BE(20)!==960||b[25]!==6)throw Error(`${rel} nao e PNG RGBA 768x960`);
 const sha256=createHash('sha256').update(b).digest('hex');
 if(sha256!==approved[name])throw Error(`${rel} hash is not the approved asset; refusing upload`);
 const sha=createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
 files.push({name,rel,b,sha});
 console.log(`${rel}: ${b.length} bytes, sha ${sha.slice(0,12)}`);
}
if(command==='--dry-run'){
 console.log('Dry-run concluido: nenhum arquivo enviado.');
 process.exit(0);
}
let token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
if(!token){try{token=execFileSync('gh',['auth','token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{}}
if(!token)throw Error('Autenticacao GitHub indisponivel. Use gh auth login ou GH_TOKEN.');
const api='https://api.github.com';
async function github(method,url,body){
 const r=await fetch(api+url,{
  method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined
 });
 const payload=await r.json().catch(()=>({}));
 if(!r.ok&&r.status!==404)throw Error(`GitHub HTTP ${r.status}: ${payload.message||'erro'}`);
 return {status:r.status,payload};
}
const branchCheck=await github('GET',`/repos/${repo}/branches/${encodeURIComponent(branch)}`);
if(branchCheck.status!==200)throw Error('Branch de revisao nao encontrada.');
for(const f of files){
 const url=`/repos/${repo}/contents/${f.rel}`;
 const previous=await github('GET',`${url}?ref=${encodeURIComponent(branch)}`);
 if(previous.status===200&&previous.payload.sha===f.sha){
  console.log(`${f.name}: ja identico; ignorando`);continue;
 }
 const body={message:`assets(creatures): add approved ${f.name} V3 sprite atlas`,
  branch,content:f.b.toString('base64')};
 if(previous.status===200)body.sha=previous.payload.sha;
 await github('PUT',url,body);
 console.log(`${f.name}: enviado para ${branch}`);
}
console.log('Cinco atlas verificados e processados. NAO houve merge nem deploy.');
