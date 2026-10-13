'use strict';
/** Crônicas da Aurora: campanha narrativa principal e NPCs de ambientação, sem login. */
const {additionalChapters,BOOKS}=require('./story-afterlight');
const ROAD=z=>x=>496+Math.sin((x+z*117)/225)*54+Math.sin(x/79+z*2)*12;
const main=[
 {zone:0,name:'Lia, a Acendedora',title:'A guardiã do sino',chapter:'O sino que não tocou',objective:0,shard:null,
  lines:[
   'Escute. Sabe o que é mais triste que um sino quebrado? Um sino inteiro que ninguém se atreve a tocar.',
   'Esta manhã, as oliveiras amanheceram cobertas de cinza prateada. O Sino da Aurora, que despertava todas as vilas, ficou mudo. E, com ele, as pessoas começaram a esquecer o nome umas das outras.',
   'Minha avó contava que a Aurora não é uma pedra de poder. É uma promessa feita por sete guardiões: nenhuma vida deveria enfrentar sozinha a escuridão.',
   'Há um nome riscado no livro da torre: Cálen. Os conselheiros o chamam de traidor. Mas por que alguém apagaria o nome de um traidor em vez de contar sua história?',
   'Leve esta primeira chama até a Floresta da Promessa. Procure Moisés, o jardineiro. E guarde uma pergunta: o que perdemos quando deixamos de ouvir?' ],
  choices:[['compaixao','Levarei a chama e ouvirei quem foi esquecido.','Lia acende uma pequena lanterna: “A luz cresce quando alguém abre espaço para o outro.”'],['coragem','Vou descobrir quem silenciou o sino.','“Coragem é boa companhia”, diz Lia, “desde que não nos faça esquecer a bondade.”']]},
 {zone:1,name:'Moisés das Raízes',title:'Jardineiro da floresta',chapter:'A árvore das promessas',objective:0,key:true,
  lines:[
   'Estas árvores se curvam porque carregam promessas. Algumas foram cumpridas; outras ainda estão esperando por alguém.',
   'Cálen passou por aqui quando era jovem. Plantou uma oliveira para cada família que perdeu a casa na grande tempestade. Não parecia um homem que desejava apagar o mundo.',
   'Então chegou a Noite das Sete Cinzas. Um grito atravessou a floresta, e as raízes fecharam a passagem para proteger algo escondido sob a terra.',
   'Há uma menina chamada Neri na Masmorra da Raiz. Ela guarda a primeira verdade, mas ninguém voltou para escutá-la.',
   'Tome esta chave antiga. As portas não se abrem para quem é forte; abrem-se para quem está disposto a voltar com quem ficou para trás.' ],
  choices:[['compaixao','Prometo procurar Neri e trazê-la de volta.','“Então a floresta reconhecerá seus passos”, responde Moisés.'],['coragem','Entrarei nas raízes, apesar do perigo.','Moisés entrega a chave: “Não deixe o medo escolher por você.”']]},
 {zone:12,name:'Neri, Voz Sob a Terra',title:'A menina da raiz',chapter:'O nome escondido',objective:2,shard:'Centelha da Memória',
  lines:[
   'Você veio mesmo! Passei tanto tempo ouvindo raízes que comecei a achar que minha voz tinha desaparecido.',
   'Eu conheci Cálen. Quando a escuridão chegou, ele protegeu nossa aldeia. Para fechar a passagem, aceitou carregar dentro de si o Véu do Esquecimento.',
   'Mas o Véu é faminto. A cada ano ele toma uma lembrança. Primeiro os dias felizes, depois os rostos e, por fim, os nomes.',
   'Minha mãe deixou uma centelha aqui para que a verdade não morresse. As sombras rondam sua luz. Afaste duas delas para que eu consiga retirá-la da raiz.',
   'Se você puder escolher, não me salve como quem ganha uma recompensa. Salve-me porque ninguém deveria ser esquecido.' ],
  ending:['A raiz se abre. Neri recupera um medalhão gravado: “Lembrar é a primeira forma de amar.”','A primeira Centelha desperta. Há mais seis verdades a encontrar.'],
  choices:[['compaixao','Ninguém mais apagará o seu nome.','Neri sorri e escreve seu próprio nome na pedra.'],['coragem','Vou levar esta verdade ao resto do reino.','Neri entrega o medalhão: “Diga a verdade inteira, mesmo quando ela for difícil.”']]},
 {zone:2,name:'Elia, a Barqueira',title:'Condutora das águas',chapter:'O rio que recorda',objective:0,
  lines:[
   'A água sempre devolve o rosto de quem olha. Mas hoje o riacho reflete pessoas que nem estão aqui.',
   'Há muitos anos, atravessei este rio com Cálen. Ele carregava uma caixa tão pesada que seus braços tremiam. Dentro havia cartas de famílias que ninguém queria receber.',
   'Disseram que ele havia roubado a luz. Eu o vi repartir sua última comida com uma criança que o insultava.',
   'Quando soube do Véu, guardei silêncio. Tive medo de perder meu barco, minha casa e a confiança das pessoas.',
   'A verdade que guardamos por medo vira uma correnteza. Siga ao Deserto das Provações; Nael pode mostrar onde a segunda centelha foi enterrada.' ],
  choices:[['compaixao','Há tempo de dizer a verdade, Elia.','Elia limpa os olhos. “Então vou começar hoje.”'],['coragem','Não deixaremos o medo conduzir esta história.','A barqueira solta a corda da margem. “Às vezes é preciso atravessar.”']]},
 {zone:3,name:'Nael, o Cartógrafo',title:'Exilado das dunas',chapter:'As areias da culpa',objective:0,key:true,
  lines:[
   'Olhe estas dunas. O vento apaga pegadas em uma noite. Os homens conseguem apagar uma reputação em apenas uma conversa.',
   'Fui eu quem desenhou o mapa da noite em que o Sino se calou. O conselho me expulsou, dizendo que eu vendera a rota a Cálen.',
   'Na verdade, o conselho mandou destruir as cartas que provavam o sacrifício dele. Guardei uma cópia e perdi tudo por isso.',
   'As cinzas do arquivo foram levadas a uma masmorra. Lá vive Ada, que recolhe nomes como quem junta grãos de areia.',
   'Esta chave abre a Masmorra das Cinzas. Não confunda justiça com vingança: uma repara; a outra costuma espalhar a ferida.' ],
  choices:[['compaixao','Sua história será ouvida.','“Obrigado”, responde Nael. “O silêncio parecia uma segunda condenação.”'],['coragem','Vamos recuperar as cartas destruídas.','O cartógrafo desenha uma estrela no seu mapa. “Siga esta marca.”']]},
 {zone:13,name:'Ada das Cinzas',title:'Escriba das lembranças',chapter:'Cartas para quem ficou',objective:2,shard:'Centelha da Verdade',
  lines:[
   'Cada cinza aqui foi uma palavra. Passei anos tentando montá-las sem saber para quem devolver as cartas.',
   'Estas páginas contam que o Véu surgiu quando os sete guardiões tentaram guardar toda a dor do mundo dentro de uma única pessoa.',
   'Cálen não foi o primeiro a aceitar esse peso. Foi o último. E teve coragem de dizer sim quando todos os outros recuaram.',
   'A segunda centelha preserva a verdade. Mas as sombras do arquivo devoram os nomes recém-encontrados. Afaste duas criaturas e eu poderei abrir o cofre.',
   'Quando encontrar o conselho, lembre-se: revelar uma mentira não exige humilhar quem acreditou nela.' ],
  ending:['Ada abre um livro sem capa. Na primeira página se lê: “A verdade liberta apenas quando serve à vida.”','A Centelha da Verdade volta a brilhar entre os pergaminhos.'],
  choices:[['compaixao','Vamos contar a verdade sem ferir os inocentes.','“Você compreendeu”, diz Ada. “As palavras também podem ser abrigo.”'],['coragem','Essas cartas precisam ser lidas em Auren.','Ada lhe entrega os nomes dos desaparecidos. “Não esqueça nenhum.”']]},
 {zone:4,name:'Rúben dos Penhascos',title:'Guardião da passagem',chapter:'A montanha do eco',objective:2,
  lines:[
   'Nas montanhas, todo grito retorna. Por isso aprendi a pensar antes de falar.',
   'Meu irmão jurou que Cálen era um monstro. Repeti suas palavras até que um dia encontrei o velho protegendo uma caravana dos lobos de gelo.',
   'Pedi desculpas. Ele respondeu: “Não procure um homem inocente de tudo. Procure alguém disposto a assumir seus erros.”',
   'A trilha está tomada por criaturas assustadas com o chamado do Véu. Enfrente duas ameaças e poderemos abrir a passagem para as Ruínas do Crepúsculo.',
   'Não peço que vença para provar seu valor. Peço que permita que os viajantes voltem para casa.' ],
  ending:['Os últimos viajantes atravessam a ponte. Rúben toca a pedra e o eco devolve um antigo canto.', 'A passagem se abre para a jornada seguinte.'],
  choices:[['compaixao','Primeiro, vamos garantir que todos atravessem.','Rúben desce a trilha para ajudar a última família.'],['coragem','Protegerei a passagem enquanto passam.','“Há força em quem fica por último”, diz Rúben.']]},
 {zone:5,name:'Joana, a Vigia',title:'Última testemunha das ruínas',chapter:'O templo sem portas',objective:0,key:true,
  lines:[
   'As ruínas não são o que restou de uma guerra. São o que restou de uma escolha que ninguém quis explicar.',
   'Eu era guarda do Templo Esquecido. Quando os sete guardiões se desentenderam, Cálen tentou dividir a dor entre todos. O conselho recusou.',
   'Ele fechou o templo para impedir que o Véu devorasse os nomes das crianças. Depois o culparam pela escuridão que ele havia contido.',
   'Lá dentro vive Eli, um velho bibliotecário. Ele guardou o hino original da Aurora, aquele que o Sino deveria tocar.',
   'Receba esta chave. Não vá ao templo para tomar posse de seu segredo; vá para devolvê-lo ao mundo.' ],
  choices:[['compaixao','A história merece ser contada por todos os lados.','Joana sorri com tristeza. “Esperei muito por alguém que dissesse isso.”'],['coragem','Vou encontrar o hino e abrir o templo.','A vigia lhe entrega a chave marcada com sete riscos.']]},
 {zone:14,name:'Eli, o Bibliotecário',title:'Guardião do hino esquecido',chapter:'A terceira voz',objective:2,shard:'Centelha da Fé',
  lines:[
   'Fale baixo. Os livros aprenderam a temer o som das botas, mas ainda confiam nas vozes gentis.',
   'O hino da Aurora tinha sete versos. O conselho conservou apenas um: “Seja forte.” Cortaram os outros seis porque pareciam fracos demais.',
   'O segundo verso diz: “Quando suas mãos tremerem, segurarei o peso com você.” A força sem companhia vira uma prisão.',
   'Duas sombras vigiam as estantes onde guardo a terceira centelha. Afaste-as e eu lhe mostrarei as palavras que faltam.',
   'Se um dia encontrar Cálen, não pergunte apenas o que ele fez. Pergunte quem o ajudou quando ele ficou sozinho.' ],
  ending:['O bibliotecário canta baixinho. A pedra responde com uma luz que não ofusca.', 'A Centelha da Fé encontra abrigo em sua jornada.'],
  choices:[['compaixao','Ninguém deveria carregar um mundo sozinho.','Eli fecha os olhos: “Este é o verso que eu esperava ouvir.”'],['coragem','Levaremos o hino além destas paredes.','O velho bibliotecário tira o pó das últimas partituras.']]},
 {zone:6,name:'Míria dos Campos',title:'Padeira e cuidadora',chapter:'Pão para dois',objective:0,shard:'Centelha da Generosidade',
  lines:[
   'Não vendo este pão. Dou a quem tem fome; quem pode ajudar, ajuda. É assim que o forno nunca se apaga.',
   'Durante a Noite das Sete Cinzas, os moradores trancaram as portas. Minha mãe colocou uma mesa no caminho e deixou um prato a mais.',
   'Cálen sentou-se sozinho àquela mesa. Ninguém reconheceu seu rosto, mas minha mãe lhe ofereceu sopa. Ele chorou sem conseguir dizer por quê.',
   'Debaixo do forno ela guardou uma centelha. Disse que a generosidade é uma luz pequena que aprende a fazer companhia.',
   'Leve-a consigo. O Pântano dos Sussurros recebe muitos viajantes perdidos; alguns precisam mais de escuta do que de uma espada.' ],
  choices:[['compaixao','Vou deixar sempre um lugar livre à mesa.','Míria lhe entrega pão quente e sorri: “Então a promessa vive.”'],['coragem','Protegerei quem não consegue se defender.','“E permita que também protejam você”, aconselha a padeira.']]},
 {zone:7,name:'Caio dos Juncos',title:'Barqueiro do pântano',chapter:'A confissão do covarde',objective:2,
  lines:[
   'Escuta este pântano? Ele imita a voz de quem nos magoou. A pior que ouço é a minha própria.',
   'Eu estava com Cálen quando o Véu escapou do templo. Ele pediu que eu o ajudasse. Tive medo e corri.',
   'Contei a todos que ele me abandonou. Era mais fácil viver como vítima de um homem cruel do que admitir que havia sido eu quem o deixou.',
   'As criaturas das águas guardam a ponte de saída. Afaste duas delas e eu irei à Cidadela contar o que realmente aconteceu.',
   'Tenho uma pergunta para você: será que um homem que fugiu uma vez ainda pode voltar para fazer o certo?' ],
  ending:['A névoa abre um caminho. Caio pega o remo, com as mãos tremendo.', '“Vou voltar”, diz ele, e pela primeira vez sua voz não ecoa mentira.'],
  choices:[['compaixao','Pode voltar, Caio. O primeiro passo é hoje.','Caio chora em silêncio. “Eu precisava ouvir isso.”'],['coragem','A verdade será difícil, mas irei com você.','Caio ergue a cabeça e aceita caminhar ao seu lado.']]},
 {zone:8,name:'Áuria, a Faroleira',title:'Vigia da costa',chapter:'A luz no horizonte',objective:0,shard:'Centelha da Esperança',
  lines:[
   'Toda noite acendo o farol, mesmo quando não vejo navio algum. A esperança é um trabalho que acontece antes da chegada.',
   'As correntes trouxeram um barco vazio. Nele havia sete pequenas caixas, mas só uma ainda brilhava.',
   'A carta que veio junto era de Cálen. Ele escreveu: “Não apaguem o farol por minha causa. Se eu esquecer o caminho, alguém poderá me mostrar a volta.”',
   'Guarde esta centelha da esperança. Ela não promete que o oceano ficará calmo. Promete que uma luz continuará acesa na margem.',
   'Vá ao Bosque da Misericórdia. Zahra conhece a diferença entre perdoar e fingir que nada aconteceu.' ],
  choices:[['compaixao','Deixarei uma luz acesa para quem retornar.','Áuria coloca sua lanterna ao lado da sua.'],['coragem','Levaremos esse sinal até a cidade.','A faroleira mostra o caminho sob as estrelas.']]},
 {zone:9,name:'Zahra, a Curandeira',title:'Médica do bosque',chapter:'O perdão que não apaga',objective:0,shard:'Centelha da Misericórdia',
  lines:[
   'Tenho dois pacientes. Um causou uma ferida; o outro a carrega. Ambos precisam de cuidado, mas não da mesma resposta.',
   'Há quem confunda perdão com ausência de justiça. Perdoar não obriga ninguém a negar uma injustiça nem a entregar sua segurança.',
   'Cálen feriu pessoas quando o Véu cresceu dentro dele. Foi responsável por essas dores, mesmo enquanto tentava proteger o mundo.',
   'Você pode ajudá-lo sem chamar boas suas escolhas ruins. O caminho da misericórdia passa pela verdade, não ao redor dela.',
   'Esta centelha pertence a quem tem coragem de cuidar de uma ferida sem escondê-la. Leve-a à Cidadela de Auren.' ],
  choices:[['compaixao','Quero curar sem esconder a verdade.','“Então sua luz não será cega”, responde Zahra.'],['coragem','Defenderei as vítimas e ouvirei a história inteira.','A curandeira acena: “Justiça e compaixão podem caminhar juntas.”']]},
 {zone:10,name:'Éder de Auren',title:'Conselheiro da cidadela',chapter:'As portas de Auren',objective:0,
  lines:[
   'As portas estão abertas, mas a cidade anda trancada por dentro. Todos sabem algo sobre aquela noite; ninguém quer ser o primeiro a falar.',
   'Meu pai ordenou a expulsão de Cálen. Dizia que a população precisava de um culpado. Eu herdei seu cargo e o silêncio dele.',
   'Caio chegou hoje. Confessou que fugiu. Elia enviou suas cartas. Joana entregou os registros do templo. As mentiras começam a perder força.',
   'Se eu anunciar que Cálen foi inocente de tudo, contarei outra mentira. Ele aceitou o Véu, sim; e suas decisões feriram muita gente.',
   'Precisamos chamá-lo de volta sem esconder suas falhas. A Terra da Última Luz guarda o homem que ninguém teve coragem de acompanhar.' ],
  choices:[['compaixao','Abra as portas para a verdade e para as vítimas.','Éder ordena que os depoimentos sejam lidos em praça pública.'],['coragem','É hora de a cidade assumir sua parte na história.','O conselheiro tira o brasão da família e se coloca entre os cidadãos.']]},
 {zone:11,name:'Tomás, o Último Vigia',title:'Aprendiz de Cálen',chapter:'A vigília do último sino',objective:2,key:true,
  lines:[
   'Você chegou longe. Sou Tomás. Cálen me ensinou a fazer espadas, mas o que mais me ensinou foi a consertar ferramentas dos outros.',
   'No fim, ele já não lembrava do meu rosto. Pediu que eu fosse embora. Fiquei do outro lado da porta, escutando-o repetir os nomes que ainda sabia.',
   'A Câmara da Aurora fica além destas terras. O Véu a guarda com sombras que tomam forma dos nossos piores receios.',
   'Afaste duas criaturas próximas da antiga vigília. Depois lhe darei a chave. Nenhum guardião deveria entrar ali apenas para provar que é mais forte.',
   'Quando encontrar Cálen, leve também esta frase: “Seu nome foi lembrado, mesmo quando você não conseguiu lembrar o nosso.”' ],
  ending:['Tomás dobra o joelho diante do marco de pedra. A luz reaparece no último sino.', 'Ele lhe confia a chave da Câmara da Aurora e a coragem de atravessar o último caminho.'],
  choices:[['compaixao','Diga a Cálen que ele não está sozinho.','Tomás segura sua mão com gratidão.'],['coragem','Entrarei na câmara e voltarei com a verdade.','“Eu o esperarei”, diz Tomás, “sem abandonar esta porta.”']]},
 {zone:15,name:'Cálen, o Esquecido',title:'Antigo guardião da Aurora',chapter:'O sétimo verso',objective:3,shard:'Centelha da União',
  lines:[
   'Quem vem? Não... Não diga. Esqueci os nomes há tanto tempo que cada apresentação me parece uma despedida.',
   'Eu me lembro de sete vozes prometendo dividir um peso. Quando a escuridão chegou, todos hesitaram. Eu não consegui deixá-los sofrendo e tomei o Véu para mim.',
   'A princípio fui orgulhoso. Pensei que poderia salvar o reino sozinho. Depois meu orgulho virou culpa; minha culpa virou silêncio; meu silêncio virou a prisão que você vê.',
   'Não peço que digam que minhas escolhas foram corretas. Peço que ninguém mais acredite que precisa sofrer escondido para merecer ser amado.',
   'O Véu ainda lança três sombras na câmara. Enfrente-as. Quando a última cair, escutaremos juntos o verso que faltou ao Sino da Aurora.' ],
  ending:['As três sombras se desfazem. Pela primeira vez, Cálen consegue recordar o próprio nome.', 'Você aproxima as seis centelhas. Uma sétima luz surge entre suas mãos: ninguém a possuía, porque ela só poderia nascer quando a promessa fosse compartilhada.', 'O Sino da Aurora volta a tocar — não para anunciar um herói sem falhas, mas para chamar um povo inteiro à mesa.'],
  choices:[['compaixao','Você responderá pelos erros, mas não ficará sozinho.','Cálen abaixa a cabeça: “Obrigado por me permitir voltar.” A Aurora se abre como uma manhã depois de muitos anos.'],['coragem','Vamos reparar juntos o que foi quebrado.','“Então não terminamos”, responde Cálen. “Começamos de novo.” A Aurora devolve os nomes esquecidos.']]}
];
const extras=[
 [0,'Bento, o Mensageiro','Mensageiro das oliveiras',['A primeira regra dos viajantes? Não é correr. É parar quando alguém pede ajuda.','Ouvi a torre do sino soluçar, mas não tocar. Lia não dorme desde então. Talvez devesse falar com ela.']],
 [1,'Sara, a Tecelã','Tecelã do bosque',['Moisés amarra fitas nas árvores. Cada uma representa uma promessa de visitar alguém que ficou sozinho.','Quando voltar, conte a ele quantas pessoas cruzaram seu caminho. Essa é a colheita que importa.']],
 [12,'Oren, o Escavador','Escavador das raízes',['Debaixo desta terra há um labirinto de vozes. Algumas pedem socorro, outras repetem a última palavra que ouviram.','Neri conversa com as raízes, e elas respondem somente quando alguém escuta sem interromper.']],
 [2,'Davi, o Pescador','Pescador do riacho',['Sempre achei que o rio levasse tudo embora. Elia me ensinou que certas coisas ele devolve.','Uma vez encontrei uma carta numa garrafa. A assinatura estava borrada, mas a despedida dizia: “Voltarei para ouvir sua história.”']],
 [3,'Mara das Dunas','Guia do deserto',['O deserto não é vazio. Só exige que a gente aprenda a enxergar além do que falta.','Nael sabe ler rastros que o vento tenta esconder. Se você tiver dúvidas, pergunte a ele.']],
 [13,'Anselmo, o Encadernador','Guardião das cartas',['Nem toda página queimada está perdida. Algumas histórias sobrevivem na memória de quem as contou.','Ada recolhe cinzas para devolver nomes às famílias. Respeite o trabalho dela.']],
 [4,'Isaque, o Escalador','Vigia dos penhascos',['Eu costumava medir a coragem pela altura que conseguia subir. Então caí, e Rúben desceu para me buscar.','Hoje meço pela distância que alguém percorre para não deixar o amigo para trás.']],
 [5,'Helena das Ruínas','Historiadora',['Chamam isto de templo destruído, mas acho mais exato dizer templo interrompido.','Um dia alguém voltará a ler as inscrições até o fim. Joana esperou por esse dia toda a vida.']],
 [14,'Téo, o Copista','Aprendiz da biblioteca',['Os guardiões anotavam tudo. Menos suas dúvidas. Por isso pareciam infalíveis quando eram apenas pessoas.','Eli diz que um bom livro deixa espaço na margem para perguntas.']],
 [6,'Rosa, a Colhedora','Colhedora dos campos',['Míria sempre prepara comida para uma pessoa a mais. Quando perguntei por quê, ela disse: “Talvez essa pessoa seja você amanhã.”','Eu achei graça. Hoje não passo uma manhã sem pensar nisso.']],
 [7,'Jonas da Névoa','Barqueiro perdido',['Quis atravessar o pântano sozinho, mas a neblina cobriu as estrelas.','Caio me encontrou pelo som do remo. Ele acha que é covarde. Conheço poucos que teriam voltado para me buscar.']],
 [8,'Luna, a Marinheira','Capitã do farol',['Vi um barco voltar ao porto guiado por uma única vela acesa. Havia tempestade e a praia estava vazia.','Áuria ficou a noite inteira segurando aquela luz. Talvez esperança seja isso: insistir quando ninguém aplaude.']],
 [9,'Noemi, a Aprendiz','Aprendiz da curandeira',['Uma vez perguntei a Zahra por que ajudava alguém que tinha feito mal a outra pessoa.','Ela respondeu: “Cuidar não é absolver. É impedir que a ferida decida o futuro de todos.”']],
 [10,'Samuel, o Sineiro','Sineiro de Auren',['Minha família guardou o sino durante gerações. Quando ele calou, achei que nós tínhamos perdido o sentido de existir.','Agora entendo que um sino não faz a promessa. As pessoas fazem. Mas seria bom ouvi-lo outra vez.']],
 [11,'Raquel, a Sentinela','Sentinela da última luz',['Vi Tomás ficar sob a chuva, noite após noite. Ele pensava que ninguém via.','A porta da câmara não tem fechadura do lado de fora: a chave é o compromisso de voltar com quem está lá dentro.']],
 [15,'Ari, o Peregrino','Viajante sem lembranças',['Não lembro de onde vim. Às vezes tenho medo de que isso signifique que nunca pertenci a lugar algum.','Mas hoje alguém dividiu pão comigo. Sei que sou bem-vindo, mesmo sem conseguir explicar quem fui.']]
];
// IDs, ordem e recompensas dos 16 capítulos existentes não mudam.
const chapters=Object.freeze([...main,...additionalChapters].map((c,index)=>Object.freeze({
 ...c,index,id:'historia-'+index,kind:'chapter',
 x:820+(index%2)*48,y:Math.round(ROAD(c.zone)(820+(index%2)*48)-16),
 role:c.role||(index%4===0?'curandeiro':index%4===1?'guardiao':index%4===2?'arqueiro':'peregrino'),
 xp:c.xp??(95+index*45),coins:c.coins??(25+index*10)
})));
const lore=Object.freeze(extras.map(([zone,name,title,lines],i)=>Object.freeze({id:'morador-'+i,kind:'lore',name,title,zone,lines,x:625,y:Math.round(ROAD(zone)(625)-10),role:['peregrino','curandeiro','arqueiro','guardiao'][i%4]})));
const NPCS=Object.freeze([...chapters,...lore]);
const byId=new Map(NPCS.map(n=>[n.id,n]));
function publicNpc(n){return {id:n.id,zone:n.zone,name:n.name,title:n.title,kind:n.kind,index:n.index??null,x:n.x,y:n.y,role:n.role}}
function freshStory(){return {stage:0,active:false,progress:0,decisions:[],shards:[],testimonies:[]}}
function normalizeStory(s){
 const raw=s&&typeof s==='object'&&!Array.isArray(s)?s:{};
 const stage=Number.isInteger(raw.stage)?Math.max(0,Math.min(chapters.length,raw.stage)):0;
 const validWitnesses=new Set(BOOKS.map(b=>b.witness));
 const testimonies=Array.isArray(raw.testimonies)?[...new Set(raw.testimonies.filter(x=>validWitnesses.has(x)))]:[];
 return {stage,active:stage<chapters.length&&raw.active===true,
  progress:Number.isInteger(raw.progress)?Math.max(0,Math.min(10,raw.progress)):0,
  decisions:Array.isArray(raw.decisions)?
   raw.decisions.filter(x=>x&&Number.isInteger(x.chapter)&&x.chapter>=0&&x.chapter<chapters.length&&typeof x.id==='string').slice(0,chapters.length):[],
  shards:Array.isArray(raw.shards)?[...new Set(raw.shards.filter(x=>typeof x==='string'))].slice(0,7):[],
  testimonies};
}
function journal(story){
 const s=normalizeStory(story),next=chapters[s.stage];
 return {stage:s.stage,total:chapters.length,active:s.active,progress:s.progress,
  required:next?.objective||0,title:next?.chapter||'A aurora pertence a todos',
  npc:next?.name||'Jornada concluída',zone:next?.zone??39,book:next?.book||'O Sino da Aurora',
  shards:s.shards,testimonies:s.testimonies,decisions:s.decisions,
  finished:s.stage>=chapters.length};
}
module.exports={NPCS,chapters,lore,byId,publicNpc,freshStory,normalizeStory,journal};
