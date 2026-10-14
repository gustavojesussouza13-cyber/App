'use strict';
/* Painel de recrutamento medieval: uso exclusivo de textContent, sem HTML de usuários. */
window.PeregrinosGuildRecruitment=Object.freeze({render(parent,{directory,character,invite,send}){
 const make=(tag,cls='',text='')=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e};
 const text=(p,tag,value)=>{const e=make(tag,'',value);p.append(e);return e};
 const action=(parent,label,verb,details,disabled=false)=>{
  const b=make('button','',label);b.type='button';b.disabled=disabled;
  b.onclick=()=>send('guild',{action:verb,...details});parent.append(b);return b};
 const section=make('div','guild-recruitment');parent.append(section);
 text(section,'h3','⚑ Diretório de Guildas');
 text(section,'p','Conheça as guildas de Auren, examine seus membros e solicite entrada. Apenas líder e moderadores podem aprovar.');
 if(!directory){text(section,'small','Buscando registros do continente…');action(section,'Atualizar','list',{});return}
 const list=directory.guilds||[];
 const meta=make('p','guild-social-meta',list.length+' guilda(s) ativa(s) · '+(character.guild?'Sua guilda: '+character.guild:'Você ainda não pertence a uma guilda'));
 section.append(meta);
 const cards=make('div','guild-cards');section.append(cards);
 if(!list.length)text(cards,'p','Nenhuma guilda ativa no continente. Você pode fundar a primeira!');
 for(const guild of list){
  const card=make('details','guild-entry-card');card.open=Boolean(guild.isMember);
  const header=make('summary','guild-entry-summary');
  text(header,'strong','⚑ '+guild.name);text(header,'small',guild.members+'/'+guild.maxMembers+' membros');
  card.append(header);
  const contents=make('div','guild-entry-content');card.append(contents);
  if(guild.description)text(contents,'p',guild.description);
  text(contents,'small','Líder: '+guild.leaderName+' · '+(guild.level?'Fortaleza nível '+guild.level:'Sem fortaleza')+' · '+guild.region);
  if(guild.isMember){
   text(contents,'small','✓ Sua guilda'+(guild.isLeader?' · Líder':guild.isModerator?' · Moderador':' · Membro'));
   const roster=make('details','guild-nested'),summary=make('summary','','Membros e cargos ('+(guild.roster||[]).length+')');
   roster.append(summary);
   for(const member of guild.roster||[]){
    const line=make('div','guild-person');text(line,'span',member.name+' · '+member.role);
    if(guild.isLeader&&member.role!=='Líder')
     action(line,member.role==='Moderador'?'Remover mod.':'Promover',member.role==='Moderador'?'demote':'promote',{memberId:member.id});
    if((guild.isLeader||guild.isModerator&&member.role==='Membro')&&member.role!=='Líder'){
     const kick=make('button','','Expulsar');kick.type='button';
     kick.onclick=()=>{if(confirm('Expulsar '+member.name+'?'))send('guild',{action:'kick',memberId:member.id})};line.append(kick);
    }
    roster.append(line);
   }
   contents.append(roster);
   if(guild.canReview){
    const requests=make('details','guild-nested');requests.open=(guild.applicationCount||0)>0;
    requests.append(make('summary','','Candidaturas ('+guild.applicationCount+')'));
    if(!guild.applications?.length)text(requests,'small','Nenhuma candidatura pendente.');
    for(const person of guild.applications||[]){
     const line=make('div','guild-person');text(line,'span',person.name+' · nível '+person.level);
     action(line,'Aceitar','approve',{applicationId:person.id});
     action(line,'Recusar','reject',{applicationId:person.id});
     requests.append(line);
    }
    contents.append(requests);
   }
   if(guild.isLeader){
    const about=make('details','guild-nested');about.append(make('summary','','Editar descrição pública'));
    const input=make('textarea');input.maxLength=180;input.rows=2;
    input.value=guild.description||'';input.placeholder='Apresente os objetivos e as regras da sua guilda.';
    about.append(input);
    const save=make('button','','Salvar descrição');save.type='button';
    save.onclick=()=>send('guild',{action:'describe',description:input.value});about.append(save);contents.append(about);
   }
  }else if(!character.guild){
   action(contents,guild.hasApplied?'Cancelar candidatura':'Solicitar entrada',
    guild.hasApplied?'withdraw':'apply',{name:guild.name},
    !directory.canApply||(!guild.hasApplied&&guild.members>=guild.maxMembers));
   if(guild.hasApplied)text(contents,'small','Candidatura pendente de aprovação.');
  }else text(contents,'small','Saia da guilda atual para poder solicitar entrada.');
  cards.append(card);
 }
 const founding=make('details','guild-found-panel');
 founding.append(make('summary','','⚒ Fundar uma guilda · 250 moedas'));
 const name=make('input');name.maxLength=24;name.placeholder='Nome da nova guilda';founding.append(name);
 const create=make('button','','Fundar guilda (250 moedas)');create.type='button';
 create.disabled=Boolean(character.guild)||!directory.canApply;
 create.onclick=()=>send('guild',{action:'create',name:name.value.trim()});founding.append(create);
 text(founding,'small','Exige uma conta cadastrada. Ao sair, você poderá fundar outra.');
 section.append(founding);
 if(character.guild){
  const management=make('details','guild-found-panel');
  management.append(make('summary','','Administrar minha participação'));
  const target=make('input');target.maxLength=18;target.placeholder='Nome do jogador para convidar';management.append(target);
  const inviter=make('button','','Convidar jogador');inviter.type='button';
  inviter.disabled=!list.some(g=>g.isMember&&g.canReview);
  inviter.onclick=()=>send('guild',{action:'invite',target:target.value.trim()});management.append(inviter);
  const leave=make('button','','Sair da guilda');leave.type='button';
  leave.onclick=()=>{if(confirm('Sair de '+character.guild+'? A guilda será dissolvida caso não reste nenhum membro.'))send('guild',{action:'leave'})};
  management.append(leave);section.append(management);
 }
 if(invite)action(section,'Aceitar convite de '+invite.name,'accept',{name:invite.name});
 action(section,'↻ Atualizar diretório','list',{});
}});
