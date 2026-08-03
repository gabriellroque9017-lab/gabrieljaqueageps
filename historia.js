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
