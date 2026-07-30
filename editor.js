/* ============================================================
   MODO DE EDIÇÃO
   ------------------------------------------------------------
   No seu computador: grava no disco pelo servidor node.
   No site publicado: grava no repositório do GitHub, pela API.
   Quem decide isso é o editor-deposito.js; as costuras no HTML
   estão no editor-remendo.js. Aqui fica só a interface.

   No site publicado o editor só aparece com ?editar=1 no endereço.
   Sem isso, nenhum convidado vê botão nenhum.
   ============================================================ */
(function () {

const PAGINA = location.pathname.split('/').pop() || 'index.html';
const REMOTO = Deposito.modo() === 'github';

/* Fora do celular. Arrastar fotos, posicionar texto e a alça de largura
   dependem de mouse; numa tela pequena viram armadilha — foi ali que um
   texto acabou esmagado a 15% sem querer. */
if (matchMedia('(max-width: 1149px)').matches || matchMedia('(pointer: coarse)').matches) return;

/* No site publicado o editor fica desligado por padrão. Quem liga é o botão
   discreto do canto — ou o ?editar=1 no endereço, que continua valendo.
   Uma vez ligado, fica ligado na aba enquanto você navega. */
const MARCA = 'editor:ligado';
const pediuNoEndereco = /[?&]editar=1(&|$)/.test(location.search);

/* Precisa ficar ACIMA da trava: quando o editor está desligado, o `return`
   abaixo interrompe o arquivo, e um const declarado depois nunca passa a
   existir — o painel do botão quebrava ao tentar lê-lo.

   Estes três são sempre os mesmos, então já vêm preenchidos; só o token é
   segredo. Deixá-los no código não abre brecha: o endereço do repositório é
   público de qualquer jeito, e sem o token ninguém grava nada. */
const PADRAO = { dono: 'gabriellroque9017-lab', repo: 'gabrieljaqueageps', ramo: 'main' };

if (REMOTO) {
  if (pediuNoEndereco) sessionStorage.setItem(MARCA, '1');
  if (!sessionStorage.getItem(MARCA)) {
    botaoDiscreto();
    return;
  }
}

/* O botão que aparece para todo mundo. Sozinho ele não dá acesso a nada:
   sem um token válido, nenhuma gravação passa. */
function botaoDiscreto() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ed-entrar';
  b.textContent = 'editar';
  b.title = 'Editar o site (só para os noivos)';
  b.onclick = () => {
    // já configurado antes? entra direto, sem perguntar de novo
    if (Deposito.conf()) {
      sessionStorage.setItem(MARCA, '1');
      location.reload();
      return;
    }
    painelGitHub(true);
  };
  document.body.appendChild(b);
}

/* Os links internos passam a carregar o ?editar=1, para o endereço na barra
   contar a verdade e um F5 não derrubar a edição. */
function marcarLinks() {
  if (!REMOTO) return;
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || !/\.html(\?|#|$)/.test(href) || /^https?:/i.test(href)) return;
    if (/[?&]editar=1(&|$)/.test(href)) return;
    a.setAttribute('href', href + (href.includes('?') ? '&' : '?') + 'editar=1');
  });
}

function sairDaEdicao() {
  sessionStorage.removeItem(MARCA);
  location.href = location.pathname;
}

/* ------------------------------------------------------------
   Avisos
   ------------------------------------------------------------ */
function aviso(texto, tipo = 'ok', fixo = false) {
  let barra = document.querySelector('.ed-aviso');
  if (!barra) {
    barra = document.createElement('div');
    barra.className = 'ed-aviso';
    document.body.appendChild(barra);
  }
  barra.textContent = texto;
  barra.dataset.tipo = tipo;
  barra.dataset.visivel = 'true';
  clearTimeout(barra._t);
  if (!fixo) barra._t = setTimeout(() => (barra.dataset.visivel = 'false'), 4500);
}

/* ------------------------------------------------------------
   O passo comum: ler o arquivo, costurar, gravar
   ------------------------------------------------------------ */
async function operar(remendar, mensagem, recarregar = true) {
  try {
    aviso('Gravando…', 'aguarde');
    const { texto, sha } = await Deposito.ler(PAGINA);
    const novo = await remendar(texto);
    await Deposito.gravar(PAGINA, novo, mensagem, sha);
    concluir(recarregar);
    return true;
  } catch (e) {
    aviso('Não deu: ' + e.message, 'erro', true);
    return false;
  }
}

function concluir(recarregar) {
  if (!REMOTO) {
    if (recarregar) {
      aviso('Pronto — recarregando');
      setTimeout(() => location.reload(), 500);
    } else {
      aviso('Gravado');
    }
    return;
  }
  aviso('Gravado no GitHub. O site publicado se atualiza em cerca de 1 minuto — recarregue depois disso.', 'ok', true);
}

/* ------------------------------------------------------------
   Imagens: reduzir no navegador antes de subir
   ------------------------------------------------------------ */
function larguraAlvo(img) {
  if (img.closest('.capa__fundo')) return 2400;
  if (img.closest('.convite__moldura')) return 1800;
  if (img.closest('.bloco__foto')) return 1800;
  if (img.closest('.galeria__quadro')) return 1600;
  if (img.closest('.mosaico')) return 1400;
  if (img.closest('.coluna__foto, .retrato__foto, .abertura__foto')) return 1600;
  return 1200;
}

function preparar(arquivo, largura) {
  return new Promise((ok, falhou) => {
    if (!arquivo.type.startsWith('image/')) return falhou(new Error('não é uma imagem'));
    const leitor = new FileReader();
    leitor.onerror = () => falhou(new Error('não consegui ler o arquivo'));
    leitor.onload = async () => {
      const img = new Image();
      img.src = leitor.result;
      try { await img.decode(); } catch { return falhou(new Error('imagem corrompida')); }
      const L = Math.min(largura, img.naturalWidth);
      const A = Math.round((L * img.naturalHeight) / img.naturalWidth);
      const tela = document.createElement('canvas');
      tela.width = L; tela.height = A;
      const ctx = tela.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, L, A);
      ok({ dados: tela.toDataURL('image/jpeg', 0.84), L, A });
    };
    leitor.readAsDataURL(arquivo);
  });
}

async function subirImagem(arquivo, largura, prefixo) {
  aviso('Preparando a imagem…', 'aguarde');
  const { dados, L, A } = await preparar(arquivo, largura);
  const caminho = await Deposito.nomeLivre(prefixo);
  aviso(`Enviando ${L}×${A}…`, 'aguarde');
  const r = await Deposito.gravarImagem(caminho, dados, 'site: foto nova');
  // o servidor local pode ter mudado o nome para evitar colisão
  return r && r.caminho ? r.caminho : caminho;
}

function escolherArquivo(multiplo = false) {
  return new Promise((ok) => {
    const campo = document.createElement('input');
    campo.type = 'file';
    campo.accept = 'image/*';
    campo.multiple = multiplo;
    campo.onchange = () => ok([...campo.files]);
    campo.click();
  });
}

/* ------------------------------------------------------------
   1. Trocar uma foto qualquer
   ------------------------------------------------------------ */
async function trocarFoto(img, arquivo) {
  const chave = img.dataset.editavel;
  try {
    const caminho = await subirImagem(arquivo, larguraAlvo(img), chave);
    await operar((html) => Remendo.trocarFoto(html, chave, caminho), 'site: troca de foto');
  } catch (e) {
    aviso('Não deu: ' + e.message, 'erro', true);
  }
}

function prepararFoto(img) {
  const caixa = img.parentElement;
  if (getComputedStyle(caixa).position === 'static') caixa.style.position = 'relative';
  caixa.classList.add('ed-alvo');

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'ed-botao';
  botao.textContent = 'Trocar foto';
  botao.onclick = async (e) => {
    e.preventDefault(); e.stopPropagation();
    const [arq] = await escolherArquivo();
    if (arq) trocarFoto(img, arq);
  };
  caixa.appendChild(botao);

  caixa.addEventListener('dragover', (e) => { e.preventDefault(); caixa.dataset.arrastando = 'true'; });
  caixa.addEventListener('dragleave', () => (caixa.dataset.arrastando = 'false'));
  caixa.addEventListener('drop', (e) => {
    e.preventDefault();
    caixa.dataset.arrastando = 'false';
    const arq = e.dataTransfer.files[0];
    if (arq) trocarFoto(img, arq);
  });
}

/* ------------------------------------------------------------
   2. Portfolio
   ------------------------------------------------------------ */
function ordemVisual() {
  const colunas = [...document.querySelectorAll('.mosaico__coluna')].map((c) => [...c.querySelectorAll('figure')]);
  const lista = [];
  const maior = Math.max(...colunas.map((c) => c.length), 0);
  for (let i = 0; i < maior; i++) colunas.forEach((c) => c[i] && lista.push(c[i]));
  return lista;
}

function prepararMosaico() {
  const secao = document.querySelector('.mosaico');
  if (!secao) return;

  ordemVisual().forEach((fig, i) => {
    fig.classList.add('ed-item');
    fig.draggable = true;

    const ordem = document.createElement('span');
    ordem.className = 'ed-ordem';
    ordem.textContent = i + 1;
    fig.appendChild(ordem);

    const apagar = document.createElement('button');
    apagar.type = 'button';
    apagar.className = 'ed-apagar';
    apagar.title = 'Apagar esta foto';
    apagar.textContent = '×';
    apagar.onclick = (e) => {
      e.stopPropagation();
      if (confirm('Apagar esta foto do Portfolio?')) {
        operar((html) => Remendo.mosaico(html, 'apagar', { indice: i }), 'site: foto removida do Portfolio');
      }
    };
    fig.appendChild(apagar);

    fig.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/indice', String(i));
      fig.dataset.movendo = 'true';
    });
    fig.addEventListener('dragend', () => (fig.dataset.movendo = 'false'));
    fig.addEventListener('dragover', (e) => { e.preventDefault(); fig.dataset.sobre = 'true'; });
    fig.addEventListener('dragleave', () => (fig.dataset.sobre = 'false'));
    fig.addEventListener('drop', async (e) => {
      e.preventDefault();
      fig.dataset.sobre = 'false';
      const de = e.dataTransfer.getData('text/indice');
      if (de !== '') {
        return operar((html) => Remendo.mosaico(html, 'mover', { de: Number(de), para: i }), 'site: Portfolio reordenado');
      }
      const arq = e.dataTransfer.files[0];
      if (!arq) return;
      try {
        const caminho = await subirImagem(arq, 1400, 'portfolio');
        await operar((html) => Remendo.mosaico(html, 'trocar', { indice: i, caminho }), 'site: troca de foto no Portfolio');
      } catch (err) { aviso('Não deu: ' + err.message, 'erro', true); }
    });
  });

  const zona = zonaDeSoltar(
    'Adicionar fotos ao Portfolio',
    'Clique para escolher no computador, ou arraste os arquivos aqui',
    async (arqs) => {
      try {
        const caminhos = [];
        for (const a of arqs) caminhos.push(await subirImagem(a, 1400, 'portfolio'));
        await operar((html) => Remendo.mosaico(html, 'adicionar', { caminhos }), 'site: fotos novas no Portfolio');
      } catch (e) { aviso('Não deu: ' + e.message, 'erro', true); }
    }
  );
  secao.after(zona);
}

/* ------------------------------------------------------------
   3. Faixa de fotos de Nossa História
   ------------------------------------------------------------ */
function prepararGaleria() {
  const trilho = document.getElementById('trilho');
  if (!trilho) return;
  const quadros = [...trilho.querySelectorAll('.galeria__quadro')];

  quadros.forEach((quadro, i) => {
    quadro.classList.add('ed-item');
    quadro.draggable = true;

    const ordem = document.createElement('span');
    ordem.className = 'ed-ordem';
    ordem.textContent = `${i + 1}/${quadros.length}`;
    quadro.appendChild(ordem);

    const apagar = document.createElement('button');
    apagar.type = 'button';
    apagar.className = 'ed-apagar';
    apagar.title = 'Apagar esta foto da faixa';
    apagar.textContent = '×';
    apagar.onclick = (e) => {
      e.stopPropagation();
      if (confirm('Apagar esta foto da faixa?')) {
        operar((html) => Remendo.galeria(html, 'apagar', { indice: i }), 'site: foto removida da faixa');
      }
    };
    quadro.appendChild(apagar);

    const trocar = document.createElement('button');
    trocar.type = 'button';
    trocar.className = 'ed-botao ed-botao--baixo';
    trocar.textContent = 'Trocar foto';
    trocar.onclick = async (e) => {
      e.stopPropagation();
      const [arq] = await escolherArquivo();
      if (!arq) return;
      try {
        const caminho = await subirImagem(arq, 1600, 'galeria');
        await operar((html) => Remendo.galeria(html, 'trocar', { indice: i, caminho }), 'site: troca de foto na faixa');
      } catch (err) { aviso('Não deu: ' + err.message, 'erro', true); }
    };
    quadro.appendChild(trocar);

    quadro.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/indice', String(i));
      quadro.dataset.movendo = 'true';
    });
    quadro.addEventListener('dragend', () => (quadro.dataset.movendo = 'false'));
    quadro.addEventListener('dragover', (e) => { e.preventDefault(); quadro.dataset.sobre = 'true'; });
    quadro.addEventListener('dragleave', () => (quadro.dataset.sobre = 'false'));
    quadro.addEventListener('drop', async (e) => {
      e.preventDefault();
      quadro.dataset.sobre = 'false';
      const de = e.dataTransfer.getData('text/indice');
      if (de !== '') {
        return operar((html) => Remendo.galeria(html, 'mover', { de: Number(de), para: i }), 'site: faixa reordenada');
      }
      const arq = e.dataTransfer.files[0];
      if (!arq) return;
      try {
        const caminho = await subirImagem(arq, 1600, 'galeria');
        await operar((html) => Remendo.galeria(html, 'trocar', { indice: i, caminho }), 'site: troca de foto na faixa');
      } catch (err) { aviso('Não deu: ' + err.message, 'erro', true); }
    });
  });

  const acrescentar = async (arqs) => {
    try {
      const caminhos = [];
      for (const a of arqs) caminhos.push(await subirImagem(a, 1600, 'galeria'));
      await operar((html) => Remendo.galeria(html, 'adicionar', { caminhos }), 'site: fotos novas na faixa');
    } catch (e) { aviso('Não deu: ' + e.message, 'erro', true); }
  };

  const zona = zonaDeSoltar(
    'Adicionar fotos à faixa de "Nossa História"',
    'Clique para escolher, ou arraste os arquivos aqui. Arraste uma foto sobre a outra para trocar a ordem.',
    acrescentar
  );
  document.querySelector('.galeria').after(zona);

  const mais = document.createElement('button');
  mais.type = 'button';
  mais.className = 'ed-mais';
  mais.textContent = '+ Adicionar foto';
  mais.onclick = async () => {
    const arqs = await escolherArquivo(true);
    if (arqs.length) acrescentar(arqs);
  };
  document.querySelector('.galeria__controles').appendChild(mais);
}

function zonaDeSoltar(titulo, dica, aoReceber) {
  const zona = document.createElement('div');
  zona.className = 'ed-adicionar';
  zona.innerHTML = `<strong>${titulo}</strong><span>${dica}</span>`;
  zona.onclick = async () => {
    const arqs = await escolherArquivo(true);
    if (arqs.length) aoReceber(arqs);
  };
  zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.dataset.arrastando = 'true'; });
  zona.addEventListener('dragleave', () => (zona.dataset.arrastando = 'false'));
  zona.addEventListener('drop', (e) => {
    e.preventDefault();
    zona.dataset.arrastando = 'false';
    const arqs = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (arqs.length) aoReceber(arqs);
  });
  return zona;
}

/* ------------------------------------------------------------
   4. Textos
   ------------------------------------------------------------ */
const FONTES = [
  ['display', 'Título (Cormorant)'],
  ['corpo', 'Corpo (EB Garamond)'],
  ['caligrafia', 'Caligrafia (Pinyon)'],
];

/* O campo editável do navegador é generoso demais: ao digitar ele cria <div>
   para cada linha, e ao colar traz <span style="font-size:49.8256px"> e
   companhia. Isso ia parar no HTML e travava o tamanho da letra, quebrando a
   escala tipográfica no celular. Aqui sai tudo o que não for conteúdo. */
const PERMITIDAS = new Set(['B', 'STRONG', 'I', 'EM', 'BR', 'A', 'CODE', 'SPAN']);

function limparMarcacao(no) {
  [...no.children].forEach((f) => {
    limparMarcacao(f);

    // estilo embutido nunca sobrevive: é ele que quebra a tipografia fluida
    f.removeAttribute('style');
    f.removeAttribute('class');

    // <div> e <p> criados pelo navegador viram quebra de linha — mas não
    // antes do primeiro, senão o texto começa com uma linha vazia
    if (f.tagName === 'DIV' || f.tagName === 'P') {
      const primeiro = f.previousSibling === null;
      const conteudo = [...f.childNodes];
      const br = () => document.createElement('br');
      if (!conteudo.length || !f.innerHTML.trim()) f.replaceWith(br());
      else f.replaceWith(...(primeiro ? conteudo : [br(), ...conteudo]));
      return;
    }
    // <span> sem nada dentro que o justifique some, deixando o texto
    if (f.tagName === 'SPAN' && !f.attributes.length) f.replaceWith(...f.childNodes);
    else if (!PERMITIDAS.has(f.tagName)) f.replaceWith(...f.childNodes);
  });
}

function conteudoLimpo(el) {
  const copia = el.cloneNode(true);
  copia.querySelectorAll('.ed-alca, .ed-apagar, .ed-botao, .ed-ordem').forEach((n) => n.remove());
  limparMarcacao(copia);
  return copia.innerHTML.replace(/(<br>\s*){3,}/g, '<br><br>').trim();
}

/* ---- largura da caixa ---- */
function porAlcaDeLargura(el) {
  if (el.querySelector(':scope > .ed-alca')) return;

  const alca = document.createElement('span');
  alca.className = 'ed-alca';
  alca.title = 'Arraste para mudar a largura da caixa';
  alca.contentEditable = 'false';
  el.appendChild(alca);

  let arrastando = false, refLargura = 0, ancoraX = 0;

  alca.addEventListener('mousedown', (e) => {
    e.preventDefault(); e.stopPropagation();
    arrastando = true;
    el.dataset.medindo = 'true';

    /* O centro é o apoio: não se move enquanto a caixa estreita. Medir pela
       borda criava realimentação — ela fugia junto e a largura despencava. */
    const r = el.getBoundingClientRect();
    ancoraX = r.left + r.width / 2;

    /* A % vale contra o bloco que a define: a área na grade, para o texto do
       site, e a seção, para o texto solto. */
    if (el.classList.contains('texto-livre')) {
      const secao = el.closest('[data-ancora]') || el.parentElement;
      refLargura = secao.getBoundingClientRect().width;
    } else {
      const tinha = el.classList.contains('tem-largura');
      const antes = el.style.getPropertyValue('--larg');
      el.classList.remove('tem-largura');
      refLargura = el.getBoundingClientRect().width;
      if (tinha) { el.classList.add('tem-largura'); el.style.setProperty('--larg', antes); }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!arrastando) return;
    const larguraPx = Math.abs(e.clientX - ancoraX) * 2;
    const pct = Math.max(15, Math.min(100, (larguraPx / refLargura) * 100));
    el.classList.add('tem-largura');
    el.style.setProperty('--larg', pct.toFixed(1));
  });

  document.addEventListener('mouseup', () => {
    if (!arrastando) return;
    arrastando = false;
    el.dataset.medindo = 'false';
    const larg = parseFloat(el.style.getPropertyValue('--larg'));
    if (!Number.isFinite(larg)) return;
    operar((html) => Remendo.textoLargura(html, el.dataset.texto, larg), 'site: largura de texto', false);
  });
}

function tirarAlcas() {
  document.querySelectorAll('.ed-alca').forEach((a) => {
    if (!a.closest('.texto-livre')) a.remove();
  });
}

/* ---- editar o que já existe ---- */
let editando = false;

function alternarEdicao(ligar) {
  editando = ligar;
  document.body.dataset.editandoTexto = String(ligar);

  document.querySelectorAll('[data-texto]:not(.texto-livre)').forEach((el) => {
    if (ligar) {
      el.dataset.original = conteudoLimpo(el);
      el.contentEditable = 'true';
      el.spellcheck = false;
      porAlcaDeLargura(el);
    } else {
      el.contentEditable = 'false';
      delete el.dataset.original;
    }
  });
  document.querySelectorAll('.texto-livre').forEach((el) => {
    el.contentEditable = ligar ? 'true' : 'false';
    if (ligar) el.dataset.original = conteudoLimpo(el);
  });
  if (!ligar) tirarAlcas();

  aviso(ligar ? 'Clique em qualquer texto para editar. Sai do campo, grava.' : 'Edição de texto desligada');
}

document.addEventListener('focusout', (e) => {
  const el = e.target.closest?.('[data-texto]');
  if (!editando || !el) return;
  const novo = conteudoLimpo(el);
  if (novo === (el.dataset.original || '').trim()) return;
  if (!novo) {
    aviso('Texto vazio — não gravei. Para remover, use o × (só nos textos soltos).', 'erro');
    return;
  }
  el.dataset.original = novo;
  operar((html) => Remendo.texto(html, el.dataset.texto, novo), 'site: texto editado', false);
});

document.addEventListener('keydown', (e) => {
  if (!editando) return;
  const el = e.target.closest?.('[data-texto]');
  if (!el) return;
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
  if (e.key === 'Escape') { el.innerHTML = el.dataset.original; el.blur(); }
});

/* ---- texto novo ---- */
function painelNovoTexto() {
  const painel = document.createElement('div');
  painel.className = 'ed-painel';
  painel.innerHTML =
    '<strong>Texto novo</strong>' +
    '<textarea class="ed-campo" rows="2" placeholder="Escreva aqui"></textarea>' +
    '<label>Fonte<select class="ed-fonte">' +
    FONTES.map(([v, n]) => `<option value="${v}">${n}</option>`).join('') +
    '</select></label>' +
    '<label>Tamanho <span class="ed-valor">34</span>px' +
    '<input class="ed-tam" type="range" min="12" max="120" value="34"></label>' +
    '<label>Cor<select class="ed-cor">' +
    '<option value="escuro">Verde escuro</option><option value="claro">Creme (sobre foto)</option>' +
    '</select></label>' +
    '<div class="ed-painel__acoes">' +
    '<button type="button" class="ed-painel__ok">Escolher o lugar</button>' +
    '<button type="button" class="ed-painel__nao">Cancelar</button></div>' +
    '<span class="ed-painel__dica">Depois de clicar, mova o mouse na página e clique onde o texto deve ficar.</span>';
  document.body.appendChild(painel);

  const campo = painel.querySelector('.ed-campo');
  const tam = painel.querySelector('.ed-tam');
  const valor = painel.querySelector('.ed-valor');
  tam.oninput = () => (valor.textContent = tam.value);
  campo.focus();

  painel.querySelector('.ed-painel__nao').onclick = () => painel.remove();
  painel.querySelector('.ed-painel__ok').onclick = () => {
    const texto = campo.value.trim();
    if (!texto) { campo.focus(); return; }
    const dados = {
      texto,
      fonte: painel.querySelector('.ed-fonte').value,
      tamanho: Number(tam.value),
      cor: painel.querySelector('.ed-cor').value,
    };
    painel.remove();
    posicionar(dados);
  };
}

function posicionar(dados) {
  document.body.dataset.posicionando = 'true';
  const fantasma = document.createElement('p');
  fantasma.className = 'texto-livre ed-fantasma';
  fantasma.dataset.fonte = dados.fonte;
  if (dados.cor === 'claro') fantasma.dataset.cor = 'claro';
  fantasma.style.setProperty('--tam', dados.tamanho);
  fantasma.textContent = dados.texto;
  document.body.appendChild(fantasma);

  const seguir = (e) => {
    fantasma.style.left = e.clientX + 'px';
    fantasma.style.top = e.clientY + 'px';
  };
  const desistir = (e) => { if (e.key === 'Escape') { limpar(); aviso('Cancelado'); } };
  function limpar() {
    document.body.dataset.posicionando = 'false';
    fantasma.remove();
    document.removeEventListener('mousemove', seguir);
    document.removeEventListener('click', soltar, true);
    document.removeEventListener('keydown', desistir);
  }
  const soltar = (e) => {
    e.preventDefault(); e.stopPropagation();
    const ancoras = [...document.querySelectorAll('main [data-ancora]')];
    const alvo = ancoras.find((s) => {
      const r = s.getBoundingClientRect();
      return e.clientY >= r.top && e.clientY <= r.bottom;
    }) || ancoras[0];
    if (!alvo) { limpar(); aviso('Não achei onde ancorar o texto', 'erro'); return; }
    const r = alvo.getBoundingClientRect();
    const esquerda = ((e.clientX - r.left) / r.width) * 100;
    const topo = ((e.clientY - r.top) / r.height) * 100;
    limpar();
    operar(
      (html) => Remendo.textoNovo(html, { ...dados, ancora: Number(alvo.dataset.ancora), esquerda, topo }).html,
      'site: texto novo'
    );
  };

  document.addEventListener('mousemove', seguir);
  document.addEventListener('click', soltar, true);
  document.addEventListener('keydown', desistir);
  aviso('Clique no lugar onde o texto deve ficar. Esc cancela.', 'aguarde');
}

function prepararTextosLivres() {
  document.querySelectorAll('.texto-livre').forEach((el) => {
    el.classList.add('ed-livre');

    const apagar = document.createElement('button');
    apagar.type = 'button';
    apagar.className = 'ed-apagar ed-apagar--texto';
    apagar.textContent = '×';
    apagar.title = 'Apagar este texto';
    apagar.onclick = (e) => {
      e.stopPropagation();
      if (confirm('Apagar este texto?')) {
        operar((html) => Remendo.textoApagar(html, el.dataset.texto), 'site: texto removido');
      }
    };
    el.appendChild(apagar);
    porAlcaDeLargura(el);

    let arrastando = false;
    el.addEventListener('mousedown', (e) => {
      if (editando || e.target !== el) return;
      arrastando = true;
      el.dataset.movendo = 'true';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!arrastando) return;
      const secao = el.closest('[data-ancora]');
      const r = secao.getBoundingClientRect();
      el.style.left = (((e.clientX - r.left) / r.width) * 100).toFixed(2) + '%';
      el.style.top = (((e.clientY - r.top) / r.height) * 100).toFixed(2) + '%';
    });
    document.addEventListener('mouseup', () => {
      if (!arrastando) return;
      arrastando = false;
      el.dataset.movendo = 'false';
      operar(
        (html) => Remendo.textoMover(html, el.dataset.texto, parseFloat(el.style.left), parseFloat(el.style.top)),
        'site: texto movido', false
      );
    });

    el.addEventListener('wheel', (e) => {
      if (!e.altKey) return;
      e.preventDefault();
      const atual = Number(getComputedStyle(el).getPropertyValue('--tam')) || 24;
      const novo = Math.max(12, Math.min(120, atual + (e.deltaY < 0 ? 2 : -2)));
      el.style.setProperty('--tam', novo);
      clearTimeout(el._t);
      el._t = setTimeout(() => {
        operar(
          (html) => Remendo.textoMover(html, el.dataset.texto, parseFloat(el.style.left), parseFloat(el.style.top), novo),
          'site: tamanho de texto', false
        );
      }, 700);
    });
  });
}

/* ------------------------------------------------------------
   Conta do GitHub
   ------------------------------------------------------------ */
function painelGitHub(entrando) {
  const c = { ...PADRAO, ...(Deposito.conf() || {}) };
  const painel = document.createElement('div');
  painel.className = 'ed-painel ed-painel--conta';
  painel.innerHTML =
    '<strong>Entrar para editar</strong>' +
    '<span class="ed-painel__dica">Estes dados ficam só no seu navegador. Nunca vão para o site — ' +
    'se fossem, qualquer visitante poderia alterá-lo.</span>' +
    `<label>Usuário do GitHub<input class="ed-dono" value="${c.dono || ''}" placeholder="gabriellroque9017-lab"></label>` +
    `<label>Repositório<input class="ed-repo" value="${c.repo || ''}" placeholder="gabrieljaqueageps"></label>` +
    `<label>Ramo<input class="ed-ramo" value="${c.ramo || 'main'}"></label>` +
    `<label>Token — o único que falta<input class="ed-token" type="password" value="${c.token || ''}" placeholder="cole aqui o github_pat_..."></label>` +
    '<label class="ed-lembrar"><input type="checkbox" class="ed-check"' + (c.lembrar === false ? '' : ' checked') + '>' +
    'Manter salvo neste aparelho</label>' +
    '<span class="ed-painel__dica">Desmarque se este computador não for seu — aí os dados somem ao fechar a aba.</span>' +
    '<div class="ed-painel__acoes">' +
    '<button type="button" class="ed-painel__ok">Entrar</button>' +
    '<button type="button" class="ed-painel__nao">Cancelar</button></div>' +
    '<button type="button" class="ed-painel__limpar">Esquecer estes dados</button>';
  document.body.appendChild(painel);
  // o cursor já vai para o único campo que a pessoa precisa preencher
  painel.querySelector('.ed-token').focus();

  painel.querySelector('.ed-painel__nao').onclick = () => painel.remove();
  painel.querySelector('.ed-painel__limpar').onclick = () => {
    Deposito.esquecerConf();
    painel.remove();
    aviso('Dados esquecidos neste navegador');
  };
  painel.querySelector('.ed-painel__ok').onclick = async () => {
    const dados = {
      dono: painel.querySelector('.ed-dono').value.trim(),
      repo: painel.querySelector('.ed-repo').value.trim(),
      ramo: painel.querySelector('.ed-ramo').value.trim() || 'main',
      token: painel.querySelector('.ed-token').value.trim(),
    };
    if (!dados.dono || !dados.repo || !dados.token) {
      aviso('Falta preencher usuário, repositório ou token', 'erro');
      return;
    }
    Deposito.salvarConf(dados, painel.querySelector('.ed-check').checked);
    try {
      aviso('Testando…', 'aguarde');
      const r = await Deposito.testar();
      painel.remove();
      if (entrando) {
        sessionStorage.setItem(MARCA, '1');
        aviso(`Conectado a ${r.onde} — abrindo o editor…`, 'ok');
        setTimeout(() => location.reload(), 700);
      } else {
        aviso(`Conectado a ${r.onde} — ${r.permissao}`, 'ok', true);
      }
    } catch (e) {
      aviso('Não deu: ' + e.message, 'erro', true);
    }
  };
}

/* ------------------------------------------------------------
   Barra de botões e tarja
   ------------------------------------------------------------ */
function barra() {
  const b = document.createElement('div');
  b.className = 'ed-barra';

  const bEditar = document.createElement('button');
  bEditar.type = 'button';
  bEditar.className = 'ed-mais';
  bEditar.textContent = 'Editar texto';
  bEditar.onclick = () => {
    alternarEdicao(!editando);
    bEditar.textContent = editando ? 'Terminar edição' : 'Editar texto';
    bEditar.dataset.ligado = String(editando);
  };

  const bNovo = document.createElement('button');
  bNovo.type = 'button';
  bNovo.className = 'ed-mais';
  bNovo.textContent = '+ Adicionar texto';
  bNovo.onclick = painelNovoTexto;

  b.append(bEditar, bNovo);

  if (REMOTO) {
    const bConta = document.createElement('button');
    bConta.type = 'button';
    bConta.className = 'ed-mais';
    bConta.textContent = 'Conta do GitHub';
    bConta.onclick = painelGitHub;

    const bSair = document.createElement('button');
    bSair.type = 'button';
    bSair.className = 'ed-mais ed-mais--sair';
    bSair.textContent = 'Sair da edição';
    bSair.title = 'Voltar a ver o site como um convidado';
    bSair.onclick = sairDaEdicao;

    b.append(bConta, bSair);
  }
  document.body.appendChild(b);
}

function tarja() {
  const f = document.createElement('div');
  f.className = 'ed-faixa';
  f.innerHTML = REMOTO
    ? '<strong>Modo de edição — site publicado.</strong> Fica ligado nesta aba enquanto você navega. ' +
      'Cada mudança vira um commit no GitHub e entra no ar em ~1 min. ' +
      'Os convidados não veem nada disto.'
    : '<strong>Modo de edição — seu computador.</strong> As mudanças são gravadas em <code>assets/</code> e no HTML pelo servidor local.';
  document.body.appendChild(f);
}

/* ------------------------------------------------------------
   Liga tudo
   ------------------------------------------------------------ */
document.querySelectorAll('img[data-editavel]').forEach(prepararFoto);
prepararMosaico();
prepararGaleria();
prepararTextosLivres();
marcarLinks();
barra();
tarja();

if (REMOTO && !Deposito.conf()) {
  aviso('Primeiro passo: clique em "Conta do GitHub" e preencha os dados.', 'aguarde', true);
}

})();
