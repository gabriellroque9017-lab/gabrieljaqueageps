// ---- fotos que entram pelo lado ----
//
// A foto se revela quando entra na tela e volta a se esconder quando sai por
// baixo. Assim, subir a página desfaz a entrada, e descer de novo a repete —
// em vez de revelar uma vez e nunca mais, como era antes.
//
// Por isso o observador não é desligado depois de revelar.

const fotos = [...document.querySelectorAll('.abertura__foto, .retrato__foto, .capitulo__foto')];

const observador = new IntersectionObserver(
  (entradas) =>
    entradas.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('revelada');
        return;
      }
      // Só esconde de novo quando a foto sai por BAIXO — ou seja, quando a
      // pessoa subiu a página. Saindo por cima ela fica revelada: ver uma
      // foto se desmontar ao rolar para baixo seria estranho.
      if (e.boundingClientRect.top > 0) e.target.classList.remove('revelada');
    }),
  { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
);
fotos.forEach((f) => observador.observe(f));

// ---- o texto vai aparecendo conforme se desce ----
//
// Cada trecho entra logo depois do anterior, não todos de uma vez: é esse
// escalonamento que dá a sensação de a história estar sendo escrita à medida
// que a pessoa desce. Some de novo ao subir, igual às fotos.
//
// No modo de edição fica tudo visível — texto invisível não se clica.
//
// As três condições são as mesmas que ligam o editor: no seu computador ele
// está sempre ligado; no site publicado, só com ?editar=1 ou depois de entrar
// pelo botão. Repetidas aqui de propósito, para não depender de qual arquivo
// o navegador carrega primeiro.
// A prévia ("Ver sem editar") desliga o editor, então os efeitos voltam a
// valer. O ?ver=1 é lido aqui também para não depender de qual arquivo o
// navegador executa primeiro.
const previa =
  /[?&]ver=1(&|$)/.test(location.search) ||
  (sessionStorage.getItem('editor:previa') && !/[?&]ver=0(&|$)/.test(location.search));

const editando =
  !previa &&
  (location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:' ||
    /[?&]editar=1(&|$)/.test(location.search) ||
    sessionStorage.getItem('editor:ligado'));

if (!editando) {
  const TRECHOS = [
    '.abre__texto',
    '.capitulo__texto > *',
    '.fala__texto',
    '.citacao__texto',
    '.citacao__autor',
    '.marco__texto',
    '.retrato__risco',
    '.retrato__nome',
    '.retrato__paragrafo',
    '.fecho__texto',
    '.fecho__ultima',
    '.resto__titulo',
    '.resto__texto',
  ].join(',');

  const escrita = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('escrito');
          return;
        }
        if (e.boundingClientRect.top > 0) e.target.classList.remove('escrito');
      }),
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
  );

  // 'main' e nao '.trilha': a secao Nossas Etapas fica fora da trilha da videira
  document.querySelectorAll('main ' + TRECHOS.split(',').join(', main ')).forEach((el) => {
    el.classList.add('escreve');
    escrita.observe(el);
  });

  // dentro de uma mesma seção, um trecho espera o anterior
  document.querySelectorAll('main section').forEach((secao) => {
    [...secao.querySelectorAll('.escreve')].forEach((el, i) => {
      el.style.setProperty('--atraso-escrita', i * 130 + 'ms');
    });
  });
}

// ---- videira que se desenha conforme a rolagem ----
const trilha = document.querySelector('.trilha');
const videira = document.querySelector('.trilha__videira path');
let comprimento = 0;

if (videira) {
  comprimento = videira.getTotalLength();
  videira.style.strokeDasharray = comprimento;
  videira.style.strokeDashoffset = comprimento;
}

function desenhar() {
  if (!videira) return;
  const r = trilha.getBoundingClientRect();
  // começa quando o topo da trilha entra na tela e termina quando o pé dela passa do meio
  const inicio = innerHeight * 0.9;
  const fim = innerHeight * 0.75 - r.height;
  const bruto = (inicio - r.top) / (inicio - fim);
  const progresso = Math.min(1, Math.max(0, bruto));
  videira.style.strokeDashoffset = comprimento * (1 - progresso);
}

let agendado = false;
function aoRolar() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    desenhar();
  });
}

addEventListener('scroll', aoRolar, { passive: true });
addEventListener('resize', aoRolar, { passive: true });
desenhar();
