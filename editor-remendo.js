/* ============================================================
   MODO DE EDIÇÃO — as costuras no HTML
   ------------------------------------------------------------
   Funções puras: recebem o texto de um arquivo .html, devolvem o
   texto alterado. Nada de DOM, nada de rede.

   Elas vivem aqui, e não no servidor, porque agora existem dois
   destinos possíveis para a gravação — o disco local e o
   repositório no GitHub — e os dois usam exatamente estas costuras.
   Uma implementação só, um lugar só para consertar.
   ============================================================ */
window.Remendo = (function () {

  const naoAchei = (o) => { throw new Error('não encontrei ' + o + ' no arquivo'); };

  /* ---------- fotos soltas ---------- */
  function trocarFoto(html, chave, caminho) {
    const alvo = new RegExp(`<img[^>]*data-editavel="${chave}"[^>]*>`);
    if (!alvo.test(html)) naoAchei('a foto ' + chave);
    return html.replace(alvo, (tag) => tag.replace(/src="[^"]*"/, `src="${caminho}"`));
  }

  /* ---------- mosaico do Portfolio ----------
     A busca precisa aceitar outros atributos antes do class: a seção ganhou
     data-ancora quando os textos soltos passaram a existir, e a versão
     estrita parou de casar — o Portfolio deixava de receber as fotos sem
     dar erro nenhum. */
  const SECAO_MOSAICO = /<section[^>]*class="mosaico"[^>]*>[\s\S]*?<\/section>/;
  const ABERTURA_MOSAICO = /<section[^>]*class="mosaico"[^>]*>/;
  /* width/height são a medida real do arquivo. É o que faz cada foto aparecer
     inteira: a moldura toma a forma da imagem em vez de recortá-la numa das
     quatro proporções fixas de antes. Precisam sobreviver a toda reordenação. */
  const FIGURA = /<figure([^>]*)><img src="([^"]+)"([^>]*)><\/figure>/g;
  const MEDIDA = (attrs, qual) => (attrs.match(new RegExp(`${qual}="(\\d+)"`)) || [])[1] || null;

  /* data-n guarda a posição da foto na lista. Sem ele ler e escrever deixariam
     de ser operações inversas — as colunas não têm mais o mesmo número de
     fotos, então não dá para deduzir a ordem intercalando-as, e cada edição
     salva embaralharia um pouco mais o mosaico. */
  function lerMosaico(html) {
    const secao = html.match(SECAO_MOSAICO);
    if (!secao) naoAchei('o mosaico');
    const colunas = [...secao[0].matchAll(/mosaico__coluna--(\d)">([\s\S]*?)<\/div>/g)]
      .map((m) => [...m[2].matchAll(FIGURA)].map((f) => ({
        src: f[2],
        larg: MEDIDA(f[3], 'width'),
        alt: MEDIDA(f[3], 'height'),
        n: Number(MEDIDA(f[1], 'data-n')),
      })));

    const todas = [...(colunas[0] || []), ...(colunas[1] || [])];
    if (todas.every((f) => Number.isFinite(f.n))) return todas.sort((a, b) => a.n - b.n);

    // ainda sem data-n (primeira gravação): a ordem antiga era intercalada
    const lista = [];
    const maior = Math.max(colunas[0]?.length || 0, colunas[1]?.length || 0);
    for (let i = 0; i < maior; i++) {
      if (colunas[0]?.[i]) lista.push(colunas[0][i]);
      if (colunas[1]?.[i]) lista.push(colunas[1][i]);
    }
    return lista;
  }

  function escreverMosaico(html, lista) {
    /* Cada foto vai para a coluna que estiver mais curta naquele momento, e não
       alternando uma a uma. Como as alturas agora são as reais das fotos, o
       revezamento cego deixaria uma coluna terminar muito antes da outra. */
    const colunas = [[], []];
    const altura = [0, 0];
    lista.forEach((f, n) => {
      const i = altura[0] <= altura[1] ? 0 : 1;
      colunas[i].push({ ...f, n });
      // altura relativa a uma largura de coluna igual a 1
      altura[i] += f.larg && f.alt ? Number(f.alt) / Number(f.larg) : 1.25;
    });

    const desenhar = (fs) =>
      fs.map((f) => {
        const medida = f.larg && f.alt ? ` width="${f.larg}" height="${f.alt}"` : '';
        return `        <figure data-n="${f.n}"><img src="${f.src}"${medida} alt="" loading="lazy"></figure>`;
      }).join('\n');

    /* reaproveita a tag de abertura original em vez de reescrevê-la: assim o
       data-ancora e qualquer outro atributo sobrevivem à reordenação */
    const abertura = (html.match(ABERTURA_MOSAICO) || ['<section class="mosaico" aria-label="Fotos do casal">'])[0];

    const nova =
      abertura + '\n' +
      `      <div class="mosaico__coluna mosaico__coluna--1">\n${desenhar(colunas[0])}\n      </div>\n\n` +
      `      <div class="mosaico__coluna mosaico__coluna--2">\n${desenhar(colunas[1])}\n      </div>\n    </section>`;
    return html.replace(SECAO_MOSAICO, nova);
  }

  function mosaico(html, acao, dados) {
    const lista = lerMosaico(html);
    if (acao === 'apagar') lista.splice(dados.indice, 1);
    else if (acao === 'mover') {
      const [item] = lista.splice(dados.de, 1);
      if (item) lista.splice(dados.para, 0, item);
    } else if (acao === 'adicionar') {
      // fotos vem com a medida real; caminhos é a forma antiga, sem medida
      const novas = dados.fotos || (dados.caminhos || []).map((src) => ({ src }));
      novas.forEach((f) => lista.push({ src: f.src, larg: f.larg, alt: f.alt }));
    } else if (acao === 'trocar') {
      if (lista[dados.indice]) {
        lista[dados.indice].src = dados.caminho;
        // a foto nova tem outra forma; sem a medida certa a moldura recortaria
        lista[dados.indice].larg = dados.larg || null;
        lista[dados.indice].alt = dados.alt || null;
      }
    } else throw new Error('ação desconhecida no mosaico: ' + acao);
    return escreverMosaico(html, lista);
  }

  /* ---------- faixa de fotos de Nossa História ---------- */
  const TRILHO = /<div class="galeria__trilho" id="trilho">[\s\S]*?<\/div>/;
  const QUADRO = /<figure class="galeria__quadro"><img src="([^"]+)"[^>]*><\/figure>/g;

  function galeria(html, acao, dados) {
    const bloco = html.match(TRILHO);
    if (!bloco) naoAchei('a faixa de fotos');
    const lista = [...bloco[0].matchAll(QUADRO)].map((m) => m[1]);

    if (acao === 'apagar') {
      if (lista.length <= 1) throw new Error('precisa sobrar ao menos uma foto na faixa');
      lista.splice(dados.indice, 1);
    } else if (acao === 'mover') {
      const [item] = lista.splice(dados.de, 1);
      if (item) lista.splice(dados.para, 0, item);
    } else if (acao === 'adicionar') {
      dados.caminhos.forEach((c) => lista.push(c));
    } else if (acao === 'trocar') {
      lista[dados.indice] = dados.caminho;
    } else throw new Error('ação desconhecida na faixa: ' + acao);

    const nova =
      '<div class="galeria__trilho" id="trilho">\n' +
      lista.map((s) => `        <figure class="galeria__quadro"><img src="${s}" alt="" loading="lazy"></figure>`).join('\n') +
      '\n      </div>';
    return html.replace(TRILHO, nova);
  }

  /* ---------- textos ---------- */
  // nenhum elemento de texto do site aninha outro do mesmo tipo, então a
  // primeira tag de fechamento é a certa
  const alvoTexto = (chave) =>
    new RegExp(`<(\\w+)([^>]*data-texto="${chave}"[^>]*)>([\\s\\S]*?)<\\/\\1>`);
  const aberturaTexto = (chave) =>
    new RegExp(`<(\\w+)([^>]*data-texto="${chave}"[^>]*)>`);

  function texto(html, chave, conteudo) {
    const alvo = alvoTexto(chave);
    if (!alvo.test(html)) naoAchei('o texto ' + chave);
    return html.replace(alvo, (t, tag, attrs) => `<${tag}${attrs}>${conteudo}</${tag}>`);
  }

  const escapar = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function textoNovo(html, d) {
    const usadas = [...html.matchAll(/data-texto="livre-(\d+)"/g)].map((m) => Number(m[1]));
    const chave = 'livre-' + (usadas.length ? Math.max(...usadas) + 1 : 1);

    const estilo = `left:${(+d.esquerda).toFixed(2)}%;top:${(+d.topo).toFixed(2)}%;--tam:${Math.round(d.tamanho)}`;
    const cor = d.cor === 'claro' ? ' data-cor="claro"' : '';
    const novo =
      `\n    <p class="texto-livre" data-fonte="${d.fonte}"${cor} ` +
      `data-texto="${chave}" style="${estilo}">${escapar(d.texto)}</p>`;

    const secao = new RegExp(`(<section data-ancora="${Number(d.ancora)}"[\\s\\S]*?)(\\n\\s*<\\/section>)`);
    if (!secao.test(html)) naoAchei('a âncora ' + d.ancora);
    return { html: html.replace(secao, (t, dentro, fecha) => dentro + novo + fecha), chave };
  }

  function textoMover(html, chave, esquerda, topo, tamanho) {
    const alvo = new RegExp(`(<p class="texto-livre"[^>]*data-texto="${chave}"[^>]*style=")([^"]*)(")`);
    if (!alvo.test(html)) naoAchei('o texto solto ' + chave);
    return html.replace(alvo, (t, a, estilo, c) => {
      const tam = tamanho != null ? Math.round(tamanho) : (estilo.match(/--tam:(\d+)/) || [, 24])[1];
      return `${a}left:${(+esquerda).toFixed(2)}%;top:${(+topo).toFixed(2)}%;--tam:${tam}${c}`;
    });
  }

  function textoLargura(html, chave, largura) {
    const alvo = aberturaTexto(chave);
    if (!alvo.test(html)) naoAchei('o texto ' + chave);
    const larg = Math.max(15, Math.min(100, Math.round(largura)));

    return html.replace(alvo, (t, tag, attrs) => {
      let a = attrs;
      if (/class="/.test(a)) {
        a = a.replace(/class="([^"]*)"/, (m, c) =>
          c.split(/\s+/).includes('tem-largura') ? m : `class="${c} tem-largura"`);
      } else {
        a = ` class="tem-largura"${a}`;
      }
      if (/style="/.test(a)) {
        a = a.replace(/style="([^"]*)"/, (m, s) =>
          /--larg:/.test(s)
            ? `style="${s.replace(/--larg:\s*[\d.]+/, `--larg:${larg}`)}"`
            : `style="${s.replace(/;?\s*$/, '')};--larg:${larg}"`);
      } else {
        a = `${a} style="--larg:${larg}"`;
      }
      return `<${tag}${a}>`;
    });
  }

  function textoApagar(html, chave) {
    const alvo = new RegExp(`\\n?\\s*<p class="texto-livre"[^>]*data-texto="${chave}"[^>]*>[\\s\\S]*?<\\/p>`);
    if (!alvo.test(html)) naoAchei('o texto solto ' + chave);
    return html.replace(alvo, '');
  }

  return {
    trocarFoto, mosaico, galeria, lerMosaico,
    texto, textoNovo, textoMover, textoLargura, textoApagar,
  };
})();
