// ---- fotos estilo scrapbook: deslizam e param tortas ----
const fotos = [...document.querySelectorAll('.abertura__foto, .retrato__foto')];
const aguardando = new Set(fotos);

function revelar(el) {
  el.classList.add('revelada');
  aguardando.delete(el);
  observador.unobserve(el);
}

const observador = new IntersectionObserver(
  (entradas) => entradas.forEach((e) => e.isIntersecting && revelar(e.target)),
  { rootMargin: '0px 0px -14% 0px', threshold: 0.1 }
);
fotos.forEach((f) => observador.observe(f));

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
    // rede de segurança para quem pula direto no meio da página
    aguardando.forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.86) revelar(el);
    });
  });
}

addEventListener('scroll', aoRolar, { passive: true });
addEventListener('resize', aoRolar, { passive: true });
desenhar();
