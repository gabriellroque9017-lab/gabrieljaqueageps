/* ============================================================
   MODO DE EDIÇÃO — onde as mudanças são gravadas
   ------------------------------------------------------------
   Dois destinos, a mesma interface:

   local   — o servidor node do seu computador grava no disco.
   github  — o navegador grava direto no repositório, pela API.
             Cada gravação é um commit; o GitHub Pages republica
             sozinho em cerca de um minuto.

   O token NUNCA entra no código. Ele é digitado uma vez e fica no
   localStorage do seu navegador. Se estivesse aqui dentro, qualquer
   visitante do site poderia alterar o repositório.
   ============================================================ */
window.Deposito = (function () {

  const LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const ARQUIVO = location.protocol === 'file:';
  const SERVIDOR = ARQUIVO ? 'http://localhost:4300' : '';

  // dentro de publicar/ o servidor local precisa saber a subpasta
  const PASTA = /[\\/]publicar[\\/]/i.test(decodeURIComponent(location.pathname)) ? 'publicar' : '';

  const CHAVE_CONF = 'editor:github';
  const modo = () => (LOCAL || ARQUIVO ? 'local' : 'github');

  /* ---------- base64 que respeita acentos ---------- */
  const paraBase64 = (texto) => {
    const bytes = new TextEncoder().encode(texto);
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  };
  const deBase64 = (b64) => {
    const bin = atob(String(b64).replace(/\s/g, ''));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  };

  /* ---------- configuração do GitHub ---------- */
  /* Guardado no aparelho (localStorage) só se a pessoa pedir. Sem isso vai
     para a aba (sessionStorage), e some quando ela fecha — o certo para um
     computador emprestado. */
  function conf() {
    for (const onde of [sessionStorage, localStorage]) {
      try {
        const c = JSON.parse(onde.getItem(CHAVE_CONF));
        if (c && c.token) return c;
      } catch { /* lixo guardado, ignora */ }
    }
    return null;
  }
  function salvarConf(c, lembrar) {
    const alvo = lembrar ? localStorage : sessionStorage;
    const outro = lembrar ? sessionStorage : localStorage;
    outro.removeItem(CHAVE_CONF);
    alvo.setItem(CHAVE_CONF, JSON.stringify({ ...c, lembrar: !!lembrar }));
  }
  function esquecerConf() {
    sessionStorage.removeItem(CHAVE_CONF);
    localStorage.removeItem(CHAVE_CONF);
  }

  function precisaConf() {
    const c = conf();
    if (!c || !c.dono || !c.repo || !c.token) {
      throw new Error('o acesso ao GitHub ainda não foi configurado — clique em "Conta do GitHub"');
    }
    return c;
  }

  async function api(caminho, opcoes = {}) {
    const c = precisaConf();
    let r;
    try {
      r = await fetch(`https://api.github.com/repos/${c.dono}/${c.repo}/${caminho}`, {
        ...opcoes,
        headers: {
          Authorization: 'Bearer ' + c.token,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(opcoes.headers || {}),
        },
      });
    } catch {
      // fetch só estoura assim quando a conexão nem aconteceu
      throw new Error('não consegui falar com o GitHub. Sem internet, ou algum bloqueador na frente?');
    }
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401) throw new Error('token recusado (401). Ele expirou ou foi revogado?');
      if (r.status === 403) throw new Error('sem permissão (403). O token precisa de "Contents: Read and write" neste repositório.');
      if (r.status === 404) throw new Error('não achei o repositório ou o arquivo (404). Confira dono/repositório.');
      if (r.status === 409) throw new Error('conflito (409) — alguém gravou antes. Recarregue e tente de novo.');
      throw new Error(`GitHub respondeu ${r.status}: ${corpo.message || 'erro'}`);
    }
    return corpo;
  }

  /* ---------- leitura ---------- */
  async function ler(caminho) {
    if (modo() === 'local') {
      const base = PASTA ? PASTA + '/' : '';
      const r = await fetch(`${SERVIDOR}/${base}${caminho}?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`não consegui ler ${caminho} (${r.status})`);
      return { texto: await r.text(), sha: null };
    }
    const c = precisaConf();   // avisa direito antes de tentar usar os dados
    const d = await api(`contents/${caminho}?ref=${c.ramo || 'main'}`);
    return { texto: deBase64(d.content), sha: d.sha };
  }

  /* ---------- gravação ---------- */
  async function gravar(caminho, conteudo, mensagem, sha) {
    if (modo() === 'local') {
      const r = await fetch(`${SERVIDOR}/_editor/gravar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasta: PASTA, caminho, texto: conteudo }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro || 'o servidor local recusou a gravação');
      return d;
    }
    const c = precisaConf();
    return api(`contents/${caminho}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: mensagem || 'site: edição pelo editor',
        content: paraBase64(conteudo),
        branch: c.ramo || 'main',
        ...(sha ? { sha } : {}),
      }),
    });
  }

  /* imagem: já vem como data URL do canvas */
  async function gravarImagem(caminho, dataUrl, mensagem) {
    const base64 = String(dataUrl).split(',').pop();
    if (modo() === 'local') {
      const r = await fetch(`${SERVIDOR}/_editor/gravar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasta: PASTA, caminho, base64 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro || 'o servidor local recusou a gravação');
      return d;
    }
    const c = precisaConf();
    // se o arquivo já existir é preciso mandar o sha; nomes são novos a cada
    // envio, então normalmente não existe
    let sha = null;
    try { sha = (await api(`contents/${caminho}?ref=${c.ramo || 'main'}`)).sha; } catch { /* não existe */ }
    return api(`contents/${caminho}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: mensagem || 'site: foto nova',
        content: base64,
        branch: c.ramo || 'main',
        ...(sha ? { sha } : {}),
      }),
    });
  }

  /* nome livre para um arquivo novo: consulta o que já existe na pasta */
  async function nomeLivre(prefixo) {
    let existentes = [];
    if (modo() === 'local') {
      // o servidor local resolve a colisão sozinho ao gravar
      return `assets/${prefixo}-${Date.now().toString(36)}.jpg`;
    }
    try {
      const c = conf();
      const lista = await api(`contents/assets?ref=${c.ramo || 'main'}`);
      existentes = lista.map((f) => f.name);
    } catch { /* pasta vazia ou inacessível */ }
    let n = 1;
    let nome;
    do { nome = `${prefixo}-${n++}.jpg`; } while (existentes.includes(nome));
    return 'assets/' + nome;
  }

  async function testar() {
    if (modo() === 'local') {
      const r = await fetch(`${SERVIDOR}/_editor/gravar`, { method: 'OPTIONS' });
      return { ok: r.ok || r.status === 204, onde: 'servidor local na porta 4300' };
    }
    const c = precisaConf();
    const d = await api('');
    return {
      ok: true,
      onde: `${d.full_name} (ramo ${c.ramo || 'main'})`,
      privado: d.private,
      permissao: d.permissions?.push ? 'pode gravar' : 'SEM permissão de gravação',
    };
  }

  return { modo, ler, gravar, gravarImagem, nomeLivre, testar, conf, salvarConf, esquecerConf, PASTA };
})();
