'use strict';
/**
 * Crônicas da Aurora — A Vigília Depois do Sino.
 * 24 capítulos originais para os seis subsolos de cada masmorra.
 * Os 16 capítulos fundadores são imutáveis: esta continuação começa no 17.
 * Escolhas continuam alterando o diário e o epílogo, sem vender vantagens.
 */
const BOOKS=Object.freeze([
 {name:'As Raízes do Amanhã',first:16,witness:'Testemunho das Raízes'},
 {name:'O Julgamento das Cinzas',first:22,witness:'Testemunho das Cinzas'},
 {name:'O Hino de Muitas Vozes',first:28,witness:'Testemunho das Vozes'},
 {name:'O Pacto do Amanhecer',first:34,witness:'Testemunho da Aurora'}
]);
const episodes=[
 // ATO II — RAÍZES: quem ficou para sustentar a cidade após o sino.
 {name:'Iria das Sementes',title:'Guardadora do jardim soterrado',chapter:'A primeira manhã depois do sino',
  lines:[
   'O sino voltou a tocar. Pensei que as raízes soltariam os braços da terra e tudo ficaria bem. Mas elas continuam sustentando casas vazias.',
   'Neri guardou os nomes. Eu guardo os lugares: cada semente tem o endereço de alguém que ainda não voltou.',
   'Uma raiz abriu uma galeria onde não havia passagem. Lá embaixo encontrei a lista de famílias que Auren não reconheceu como suas.',
   'Leve uma cópia a quem escuta. Não confunda o fim de um encantamento com o fim do trabalho de reparar.'
  ],ending:['Iria abre os dedos: uma semente cria raízes sem apagar a terra ferida.','Primeiro registro da Vigília: reconstruir significa escutar os ausentes.'],
  choices:[['compaixao','Vamos guardar um lugar para quem ainda não voltou.','Iria separa as sementes por nomes, não por posses.'],['coragem','Levarei a lista à superfície.','Iria entrega o registro: “Não permita que a pressa silencie outra família.”']]},
 {name:'Tarin, o Pedreiro',title:'Construtor de pontes vivas',chapter:'A ponte que ninguém atravessava',objective:2,
  lines:[
   'O caminho para o segundo subsolo ainda é uma ponte interrompida. Durante anos culpei as raízes por seus nós.',
   'Descobri que a ponte fora desmontada por moradores que temiam o retorno dos esquecidos. Eu mesmo carreguei as pedras.',
   'Dois guardiões de pedra bloqueiam a trilha. Afaste as ameaças; preciso reforçar o arco antes que alguém se machuque.',
   'Não quero ser chamado de salvador. Quero que quem foi impedido de passar possa escolher se deseja voltar.'
  ],ending:['A ponte recebe a primeira pedra nova, marcada com os nomes de quem foi barrado.','Tarin decide reconstruí-la com a ajuda das famílias que antes excluía.'],
  choices:[['compaixao','A ponte deve pertencer a todos.','Tarin faz lugar para os construtores recém-chegados.'],['coragem','Eu ajudarei a enfrentar o perigo da passagem.','“Então teremos tempo de fazer o trabalho direito”, diz Tarin.']]},
 {name:'Mila do Musgo',title:'Mensageira das trilhas esquecidas',chapter:'O chamado sob a raiz',objective:3,
  lines:[
   'No terceiro subsolo as criaturas perceberam nossa presença. Não estão sob ordens de Cálen: defendem os próprios ninhos assustados.',
   'Há um som sob a terra diferente do sino, como se alguém chamasse por socorro através de folhas secas.',
   'Proteja a passagem das criaturas que avançam. Assim poderei seguir o som sem levar uma batalha até os refugiados.',
   'A voz diz: “Quando a Aurora se acende, quem responde pelos que ficaram na sombra?”'
  ],ending:['A trilha antes coberta por musgo revela um selo do antigo Conselho.','Mila encontra a direção de uma sala que ninguém deveria ter lacrado.'],
  choices:[['compaixao','Vamos abrir a trilha sem destruir os ninhos.','Mila assinala rotas para que viajantes e criaturas não se encontrem.'],['coragem','Vamos descobrir quem pediu socorro.','A mensageira prende uma lanterna no teto da galeria.']]},
 {name:'Doral, a Anciã',title:'Memória dos nomes recusados',chapter:'O livro das portas fechadas',
  lines:[
   'Estes nomes não foram levados pelo Véu. Foram riscados por mãos humanas, quando as autoridades decidiram quem merecia abrigo.',
   'Cálen aceitou responsabilidade demais, mas os demais guardiões usaram seu sacrifício para não responder pelas próprias decisões.',
   'Eu escrevi de novo cada nome, mesmo sem saber se alguém os leria. Uma memória inteira inclui as histórias que nos envergonham.',
   'A quarta galeria guarda este livro. Não peço que o exponha para humilhar a cidade; peço que ela não o esconda outra vez.'
  ],ending:['Uma página vazia passa a receber relatos de quem antes não tinha voz.','A Vigília ganha um compromisso: nenhum nome será apagado por conveniência.'],
  choices:[['compaixao','Os testemunhos serão ouvidos com cuidado.','Doral lhe confia o livro e pede que nunca o use como arma.'],['coragem','A verdade será lida em praça pública.','“E você ficará ao lado de quem se sentir ferido por ela?”, pergunta Doral.']]},
 {name:'Eron das Fendas',title:'Guia dos caminhos instáveis',chapter:'A escolha do abismo',objective:3,
  lines:[
   'Há dois caminhos pelo abismo: um é rápido e passa sobre casas soterradas; o outro exige que abramos uma passagem nova.',
   'A cidade sempre escolheu o primeiro. Disseram que os atrasados podiam esperar. Alguns esperaram a vida inteira.',
   'Três criaturas guardam o desvio. Afaste-as para que ninguém tenha de cruzar as casas destruídas.',
   'Não basta abrir uma porta. É preciso perguntar a quem estava preso se quer atravessá-la.'
  ],ending:['A nova passagem contorna as moradias sem esmagar o que restou delas.','Eron marca no mapa um caminho seguro para o retorno dos antigos moradores.'],
  choices:[['compaixao','Atravessaremos respeitando quem viveu aqui.','Eron muda o traçado da ponte e sorri cansado.'],['coragem','Abrirei a trilha difícil.','“A coragem demora mais quando caminha com cuidado”, responde ele.']]},
 {name:'Neri da Nova Semente',title:'Testemunha das raízes despertas',chapter:'O testemunho da terra',objective:3,witness:'Testemunho das Raízes',
  lines:[
   'Você se lembra de mim? Eu me lembro. O sino me devolveu o nome, mas não devolveu os anos que passei sozinha.',
   'A raiz guardou um acordo secreto do Conselho: a verdade podia ser esquecida desde que as muralhas continuassem em pé.',
   'Três sombras protegem o registro no último salão. Sem enfrentá-las, o testemunho não poderá deixar este lugar.',
   'Quando a última cair, não pergunte se a cidade pode ser perdoada. Pergunte primeiro como ela pretende reparar.'
  ],ending:['O Testemunho das Raízes é inscrito num pergaminho vivo: a memória exige responsabilidade.','Neri entrega o primeiro dos quatro testemunhos. Uma trilha de cinzas se ilumina adiante.'],
  choices:[['compaixao','Levaremos a verdade e também os nomes das famílias.','Neri guarda uma semente junto ao registro.'],['coragem','A cidade terá de responder por suas escolhas.','“Sim”, diz Neri, “sem pedir que os feridos sejam os primeiros a esquecer.”']]},
 // ATO III — CINZAS: justiça, arquivo e reconstrução.
 {name:'Lúcio, o Porteiro',title:'Sentinela da correspondência',chapter:'Cartas que nunca chegaram',
  lines:[
   'O sino voltou, mas esta oficina continua cheia de cartas sem destinatário. Foram retidas para poupar famílias de notícias dolorosas.',
   'Eu obedeci a ordens de quem dizia saber o que era melhor para todos. Não percebi que roubava deles o direito de escolher.',
   'Ada pediu que eu abrisse o arquivo inteiro, inclusive as cartas que me acusam.',
   'Leia as cartas com respeito. Nenhum papel é só prova: é uma pessoa tentando atravessar a distância.'
  ],ending:['Lúcio libera a primeira correspondência e escreve seu próprio nome no livro de responsáveis.','Uma voz agradece do outro lado da parede de cinzas.'],
  choices:[['compaixao','As famílias decidirão quando ler suas cartas.','Lúcio prepara envelopes individuais e pede ajuda para entregá-los.'],['coragem','O arquivo não será trancado novamente.','Ele entrega a chave sem desculpas nem discursos.']]},
 {name:'Selma, a Ferreira',title:'Restauradora das ferramentas queimadas',chapter:'O ferro que guarda marcas',objective:2,
  lines:[
   'Estas ferramentas foram usadas tanto para salvar pessoas quanto para fechar seus portões. O ferro não escolhe; nós escolhemos.',
   'Tentei derreter as marcas dos antigos guardas. Ada me fez parar: apagar os vestígios apagaria também as provas.',
   'Duas criaturas cercam a oficina. Afaste-as para que eu recupere as ferramentas sem ferir os moradores.',
   'Quero devolver cada instrumento à família que pode dizer para que ele foi usado.'
  ],ending:['A primeira ferramenta restaurada traz duas datas: a do erro e a do reparo.','Selma guarda a memória do dano junto da possibilidade de criar algo novo.'],
  choices:[['compaixao','A devolução começará pelas famílias atingidas.','Selma organiza as ferramentas por antigos proprietários.'],['coragem','Vamos reabrir a oficina para todos.','O martelo volta a cantar sobre a bigorna.']]},
 {name:'Bren, o Relator',title:'Registrador das vozes abafadas',chapter:'As cinzas ainda falam',objective:3,
  lines:[
   'O terceiro subsolo reage à nossa presença. As criaturas defendem os corredores em que o arquivo foi queimado.',
   'Entre elas há páginas incompletas contando a verdade sobre uma assembleia interrompida por medo, não por força.',
   'Afastar três ameaças permitirá recolher esses fragmentos sem colocar os pesquisadores em perigo.',
   'Não vou escrever uma versão em que todos são culpados da mesma maneira. Responsabilidade exige nomes e escolhas precisas.'
  ],ending:['O relato ganha datas, testemunhas e espaço para contestação.','Uma anotação leva às chamas guardadas abaixo do tribunal.'],
  choices:[['compaixao','Vamos ouvir também quem discorda do relato.','Bren deixa páginas reservadas para novos testemunhos.'],['coragem','O registro será íntegro, mesmo quando doer.','Ele guarda as folhas num estojo resistente ao fogo.']]},
 {name:'Yara da Fornalha',title:'Mestre das cinzas frias',chapter:'O fogo que não absolve',
  lines:[
   'As cinzas não purificam tudo. Às vezes apenas escondem o que ainda arde embaixo.',
   'Eu queimei registros acreditando que preservava a paz. Depois ouvi uma mãe perguntar por que o nome de seu filho sumira.',
   'Carrego essa pergunta para não trocar arrependimento por um título de pessoa boa.',
   'Se a cidade quiser reconciliar-se, deverá permitir que quem foi ferido decida até onde deseja se aproximar.'
  ],ending:['Yara deixa a fornalha apagar e mantém as páginas sobreviventes à vista.','Ela escolhe servir como testemunha, não como juíza de seu próprio perdão.'],
  choices:[['compaixao','Os feridos definirão seus próprios limites.','Yara aceita a decisão sem tentar abreviar o processo.'],['coragem','Precisamos dizer o que aconteceu, sem disfarces.','Ela devolve as chaves dos arquivos aos sobreviventes.']]},
 {name:'Oswin, o Juiz Sem Trono',title:'Guardião de um tribunal vazio',chapter:'O peso de uma sentença',objective:3,
  lines:[
   'Diziam que uma sentença tornaria Auren inocente. Não existe veredicto capaz de devolver sozinho os anos perdidos.',
   'Recebi documentos que absolviam os poderosos antes mesmo de ouvir as testemunhas.',
   'Três sentinelas das cinzas impedem a entrada na sala de audiências. Precisamos abrir o caminho para todos.',
   'A justiça começa quando a cadeira mais alta não determina quem merece ser escutado.'
  ],ending:['O tribunal reabre com bancos na mesma altura e um lugar reservado aos ausentes.','Oswin renuncia ao privilégio de julgar sem ser questionado.'],
  choices:[['compaixao','Que cada testemunha tenha tempo e proteção.','Oswin retira a barreira que separava o público da sala.'],['coragem','As provas serão examinadas à luz do dia.','Ele manda abrir as janelas que haviam sido pregadas.']]},
 {name:'Ada, Guardiã das Cartas',title:'Escriba da reparação',chapter:'O testemunho do fogo',objective:3,witness:'Testemunho das Cinzas',
  lines:[
   'Quando você encontrou a Centelha da Verdade, eu ainda acreditava que bastava reconstruir as cartas. Hoje sei que alguém precisa entregá-las.',
   'O Conselho não foi uma única voz. Alguns ordenaram o silêncio, outros o aceitaram, outros resistiram. Todos deixaram rastros.',
   'Proteja a última caixa das criaturas desta sala e levaremos o arquivo a Auren, aberto a quem desejar consultar.',
   'O fogo queimou as páginas, mas não tem autoridade para decretar que os nomes deixaram de existir.'
  ],ending:['O Testemunho das Cinzas registra escolhas, danos e responsabilidades sem reduzir ninguém a um símbolo.','Ada entrega o segundo testemunho. Em outra masmorra, um cântico incompleto responde ao chamado.'],
  choices:[['compaixao','Entregaremos as cartas às pessoas a quem pertencem.','Ada separa os documentos sem alterar uma única assinatura.'],['coragem','Nenhuma sentença será escrita antes de ouvir todos.','“É assim que o fogo deixa de ser desculpa”, responde Ada.']]},
 // ATO IV — VOZES: o hino precisa incluir os discordantes.
 {name:'Ivo, o Afinador',title:'Guardião dos instrumentos mudos',chapter:'Uma nota fora do hino',
  lines:[
   'Quando o sino voltou, os músicos tocaram todos a mesma nota, para mostrar união. Soou bonito e assustador.',
   'Vi uma criança tentar cantar diferente. Mandaram que ficasse quieta, pois seu verso lembrava uma antiga tristeza.',
   'Eli trouxe um hino inacabado: há espaços nele para histórias que ainda não ouvimos.',
   'Talvez harmonia não seja cantar uma nota só, mas sustentar as diferenças sem abandonar a música.'
  ],ending:['Uma segunda nota encontra espaço no hino sem calar a primeira.','Ivo deixa a partitura aberta para os músicos que vierem depois.'],
  choices:[['compaixao','A criança também terá seu verso.','Ivo lhe entrega a primeira página livre.'],['coragem','Cantaremos sem fingir que discordar é traição.','O afinador solta a corda que mantinha os sinos presos.']]},
 {name:'Lea, a Regente',title:'Maestrina das vozes dispersas',chapter:'O coro dos que partiram',objective:2,
  lines:[
   'Há vozes faltando neste coro. Algumas pertenciam a pessoas que foram embora porque a cidade não as queria ouvir.',
   'Por anos tentei imitar suas melodias. Finalmente compreendi que imitar alguém não é o mesmo que convidá-lo de volta.',
   'Duas criaturas ocupam a antiga sala de ensaio. Afaste o perigo para que a música possa recomeçar.',
   'Se as pessoas escolherem não voltar, cantaremos mesmo assim com uma pausa para reconhecer sua ausência.'
  ],ending:['O coro ensaia com silêncios intencionais, e cada pausa traz um nome.','Lea promete não preencher a ausência de ninguém com sua própria voz.'],
  choices:[['compaixao','A ausência também merece respeito.','Lea escreve as pausas na partitura.'],['coragem','Convidaremos os exilados, sem exigir seu retorno.','Ela prepara cartas sem prazos nem cobranças.']]},
 {name:'Simão das Pedras Sonoras',title:'Escutador da terceira galeria',chapter:'O eco que responde',objective:3,
  lines:[
   'As criaturas aqui atacam quando nos aproximamos. O eco faz nosso medo parecer uma ordem.',
   'No meio da pedra ouço a gravação de uma assembleia. Uns queriam proteger Cálen; outros queriam expulsá-lo.',
   'Três ameaças cercam a pedra. Quando o caminho estiver seguro, poderemos reproduzir todas as vozes, não apenas as vencedoras.',
   'A pergunta que resta não é quem falou mais alto, mas por que os demais foram impedidos de responder.'
  ],ending:['O eco revela a voz de alguém que tentou impedir a expulsão de Cálen.','Simão copia a gravação para que nenhuma versão possa voltar a ser única.'],
  choices:[['compaixao','Vamos preservar também os sussurros.','Simão registra a voz quase inaudível no início da pedra.'],['coragem','A assembleia será ouvida inteira.','Ele leva o eco à superfície sem cortar o silêncio entre as falas.']]},
 {name:'Dalva das Notas',title:'Copista de partituras proibidas',chapter:'A canção das perguntas',
  lines:[
   'A quarta galeria guarda perguntas que os antigos mestres proibiam fazer durante as cerimônias.',
   'Eu queria saber quem decidia o valor de uma voz. Disseram que uma dúvida podia dividir o reino.',
   'Mas era a proibição da dúvida que dividia as pessoas entre os dignos de falar e os condenados a ouvir.',
   'Leve estas perguntas aos músicos. Um hino verdadeiro suporta ser interrogado por quem o canta.'
  ],ending:['A primeira margem da partitura recebe uma pergunta, não uma resposta.','Dalva guarda um lápis ao lado da música para que o futuro continue escrevendo.'],
  choices:[['compaixao','Ninguém será humilhado por perguntar.','Dalva oferece outra folha aos aprendizes.'],['coragem','As perguntas entrarão no concerto.','A copista abre as janelas da sala de estudos.']]},
 {name:'Enoque, o Vigia Surdo',title:'Leitor das vibrações do chão',chapter:'A voz que não precisa de som',objective:3,
  lines:[
   'Eu não ouço o sino. Quando era criança, disseram que não poderia participar das Crônicas por isso.',
   'Aprendi a sentir sua vibração nas tábuas. Minha irmã desenhava as notas com os dedos na minha palma.',
   'Três criaturas defendem o salão onde guardamos um mapa feito de pulsações. Afastá-las permitirá que mostremos outro jeito de compreender a canção.',
   'Não conserte meu silêncio. Construa comigo um caminho por onde ele também possa passar.'
  ],ending:['O chão recebe marcas táteis que traduzem a pulsação do hino.','A próxima cerimônia terá som, sinais e espaço para quem não pode ouvi-la.'],
  choices:[['compaixao','O hino terá lugar para todos os sentidos.','Enoque lhe mostra como ler a primeira vibração.'],['coragem','Abriremos o salão sem exigir que alguém mude quem é.','Ele sorri e desenha na pedra a palavra “pertencer”.']]},
 {name:'Eli, Guardião das Vozes',title:'Bibliotecário do hino reencontrado',chapter:'O testemunho das vozes',objective:3,witness:'Testemunho das Vozes',
  lines:[
   'Lembra o verso que encontrei na biblioteca? “Quando suas mãos tremerem, segurarei o peso com você.”',
   'Foi preciso atravessar galerias para descobrir que o hino havia perdido mais do que palavras: perdera quem podia cantá-lo.',
   'Proteja a partitura das sombras deste trono. Depois poderemos devolver os versos a todas as comunidades de Auren.',
   'Não será a mesma música cantada por todos. Será uma promessa que cada pessoa poderá reconhecer como sua.'
  ],ending:['O Testemunho das Vozes reúne música, pausas, dúvidas e sinais num livro aberto.','Eli lhe entrega o terceiro testemunho. Um clarão distante anuncia a última vigília.'],
  choices:[['compaixao','Que o canto alcance também quem prefere silêncio.','Eli fecha o livro apenas para protegê-lo da poeira.'],['coragem','O hino será partilhado, nunca imposto.','A biblioteca ecoa vozes diferentes em perfeita companhia.']]},
 // ATO V — AURORA: a conclusão não pertence a um único herói.
 {name:'Aurélia, a Sentinela',title:'Guardiã das lanternas comuns',chapter:'A luz nas mãos pequenas',
  lines:[
   'O sino acordou a cidadela, mas ninguém percebeu quantas pequenas lanternas mantiveram as aldeias vivas antes dele.',
   'Meu trabalho é cuidar das luzes comuns: as que não aparecem nos retratos dos heróis.',
   'As quatro galerias da Aurora guardam relatos de pessoas que ajudaram sem receber um nome numa estátua.',
   'Leve uma lanterna consigo. Talvez o amanhecer seja maior quando deixamos de perguntar a quem ele pertence.'
  ],ending:['Aurélia acende quatro lanternas com a mesma chama, sem diminuí-la.','A vigília começa a se espalhar para além das muralhas.'],
  choices:[['compaixao','Uma luz será deixada em cada caminho.','Aurélia oferece lanternas aos viajantes que chegaram por último.'],['coragem','Protegerei as pequenas luzes durante a travessia.','Ela põe uma lamparina em suas mãos e agradece.']]},
 {name:'Téo do Primeiro Dia',title:'Arquivista das promessas novas',chapter:'O pacto que pode mudar',objective:2,
  lines:[
   'Os antigos guardiões fizeram uma promessa sem perguntar se as gerações futuras desejariam carregá-la do mesmo modo.',
   'Não quero um pacto que seja belo e impossível. Quero um que possamos revisar quando alguém demonstrar que ele causou dano.',
   'Duas ameaças cercam as tábuas onde testamos as novas palavras. Afaste-as para que os representantes cheguem em segurança.',
   'Se o pacto não permitir mudança, será apenas uma muralha com letras douradas.'
  ],ending:['A nova inscrição termina com um espaço reservado para revisões futuras.','Téo convida os primeiros moradores a colocar suas próprias marcas.'],
  choices:[['compaixao','As próximas gerações poderão corrigir nossos erros.','Téo deixa uma linha livre para um nome ainda não conhecido.'],['coragem','Assinaremos um acordo que aceita ser questionado.','Ele apoia a caneta no centro da mesa, acessível a todos.']]},
 {name:'Noa das Quatro Portas',title:'Emissária das aldeias distantes',chapter:'A assembleia dos ausentes',objective:3,
  lines:[
   'A terceira galeria da Aurora abre quatro portas, mas o convite do Conselho chegou apenas às casas próximas do palácio.',
   'As criaturas atacam quem atravessa o corredor. Preciso de ajuda para abrir rotas seguras aos povos das montanhas e da costa.',
   'Afaste três ameaças para que nenhuma região seja impedida de participar por causa da distância ou do medo.',
   'Se quem mora longe não puder chegar, a assembleia não terá direito de falar em nome de todo o reino.'
  ],ending:['Mensageiros seguem pelas quatro estradas com o mesmo convite e nenhuma exigência de resposta.','Noa guarda lugar também para quem poderá dizer não.'],
  choices:[['compaixao','Cada comunidade terá tempo de decidir.','Noa altera os convites para incluir rotas acessíveis.'],['coragem','Nenhuma estrada ficará reservada aos poderosos.','Ela distribui lanternas aos últimos viajantes.']]},
 {name:'Calisto das Marés',title:'Relator dos votos discordantes',chapter:'A coragem de discordar',
  lines:[
   'Na quarta galeria encontrei os votos de quem discordava dos sete guardiões. Foram arquivados como se fossem ofensas.',
   'Entre eles estava a proposta de Cálen de dividir a dor. Havia também um alerta: ninguém deveria ser obrigado a salvá-lo sacrificando a própria vida.',
   'Hoje compreendo que um acordo só é livre quando admite recusas sem punição.',
   'Não quero que você decida qual voz merece vencer. Quero que proteja o direito de todas serem ouvidas.'
  ],ending:['Os votos discordantes recebem o mesmo selo das resoluções aprovadas.','Calisto abre espaço para o desacordo sem transformar diferenças em inimigos.'],
  choices:[['compaixao','Respeitaremos também quem não concordar.','Calisto registra o primeiro voto contrário sem julgamento.'],['coragem','Nenhuma discordância será apagada dos livros.','Ele quebra o lacre que impedia a consulta pública.']]},
 {name:'Vesper, o Guardião do Limiar',title:'Vigia do último abismo',chapter:'Quem guarda os guardiões',objective:3,
  lines:[
   'Fui criado para vigiar Cálen. Nunca me disseram quem vigiava aqueles que me davam ordens.',
   'Quando questionei o Conselho, fui mandado a este abismo para provar minha lealdade. Aqui aprendi que obediência sem responsabilidade vira abandono.',
   'Três ameaças protegem a última passagem. Enfrente-as e poderemos devolver a chave do comando à assembleia.',
   'Guardiões devem servir às pessoas. Quando esquecem isso, precisam poder ser substituídos.'
  ],ending:['Vesper deposita a insígnia sobre uma mesa onde todos podem vê-la.','A porta do trono se abre sem coroar outro senhor.'],
  choices:[['compaixao','Os guardiões também precisam prestar contas.','Vesper oferece o livro de ordens aos representantes.'],['coragem','O comando terá limites e poderá ser revogado.','Ele desfaz o juramento que exigia silêncio absoluto.']]},
 {name:'Cálen, o Homem que Lembra',title:'Testemunha da última aurora',chapter:'A aurora pertence a todos',objective:4,witness:'Testemunho da Aurora',
  lines:[
   'Você voltou. Eu recordo meu nome e tudo o que fiz. Alguns dias essa memória pesa mais do que o Véu.',
   'Os três testemunhos chegaram: terra, cinzas e vozes. Eles mostram que nosso primeiro erro foi entregar a uma pessoa a obrigação de salvar todas.',
   'Quatro últimas sombras cercam o testemunho da Aurora. Elas não guardam um trono; guardam o costume de procurar um único herói.',
   'Quando atravessarmos esta sala, não quero que minha história termine numa estátua. Quero voltar à cidade, responder pelas minhas escolhas e ajudar naquilo que ainda está por fazer.',
   'Se a promessa sobreviver, será porque ninguém precisará sustentá-la sozinho. Esse será nosso verdadeiro amanhecer.'
  ],ending:['A última sombra desaparece. No lugar de uma coroa, surge uma mesa com cadeiras para as comunidades de Auren.','Os quatro testemunhos são lidos diante do povo. O Sino da Aurora toca, e desta vez nenhuma voz precisa esperar do lado de fora.','O peregrino descobre que o fim da jornada não é possuir a luz, mas deixar outras mãos segurá-la.'],
  choices:[['compaixao','A aurora será uma promessa renovada por todos.','Cálen sorri: “Então até nossos erros poderão ensinar quem vier depois.”'],['coragem','Construiremos um reino em que ninguém precise ser um herói solitário.','“E amanhã continuaremos”, diz Cálen. “Juntos, mas livres.”']]}
];
const episodeBooks=episodes.map((episode,index)=>{
 const act=Math.floor(index/6),depth=index%6+1,zone=16+act*6+depth-1;
 return Object.freeze({
  ...episode,zone,book:BOOKS[act].name,act:act+2,depth,
  objective:episode.objective??0,
  // Recompensa acompanha a maior dificuldade das galerias profundas.
  xp:850+act*700+depth*155,coins:180+act*150+depth*35,
  role:['peregrino','guardiao','arqueiro','curandeiro'][(index+act)%4]
 });
});
if(episodeBooks.length!==24)throw new Error('A expansão precisa ter 24 capítulos.');
module.exports={BOOKS,additionalChapters:Object.freeze(episodeBooks)};
