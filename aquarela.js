// Revelação em aquarela — usada na página inicial e em "Viagem e estada".

// Quebra os rótulos sobre as fotos em letras, para elas subirem uma a uma.
// O texto original vira aria-label, então leitores de tela seguem lendo a
// palavra inteira em vez de soletrar.
document.querySelectorAll('.coluna__tipo, .coluna__link').forEach((el) => {
  const texto = el.textContent.trim();
  el.setAttribute('aria-label', texto);
  el.textContent = '';
  [...texto].forEach((caractere, i) => {
    const span = document.createElement('span');
    span.className = 'letra';
    span.style.setProperty('--i', i);
    span.setAttribute('aria-hidden', 'true');
    span.textContent = caractere === ' ' ? ' ' : caractere;
    el.appendChild(span);
  });
});

// Fotos das hospedagens: com o mouse em cima, trocam a cada 3 segundos.
document.querySelectorAll('.coluna__foto').forEach((figura) => {
  const fotos = [...figura.querySelectorAll('img')];
  if (!fotos.length) return;
  fotos[0].classList.add('ativa');
  if (fotos.length < 2) return;

  let atual = 0;
  let relogio = null;

  const trocar = () => {
    fotos[atual].classList.remove('ativa');
    atual = (atual + 1) % fotos.length;
    fotos[atual].classList.add('ativa');
  };

  // não reinicia ao sair: a foto em que parou continua à mostra
  figura.addEventListener('pointerenter', () => {
    if (!relogio) relogio = setInterval(trocar, 2200);
  });
  figura.addEventListener('pointerleave', () => {
    clearInterval(relogio);
    relogio = null;
  });
});

const alvos = [...document.querySelectorAll('.bloco__foto, .convite__moldura, .coluna__foto')];
const aguardando = new Set(alvos);

function revelar(el) {
  el.classList.add('revelada');
  aguardando.delete(el);
  observador.unobserve(el);
  if (aguardando.size === 0) removeEventListener('scroll', aoRolar);
}

const observador = new IntersectionObserver(
  (entradas) => entradas.forEach((e) => e.isIntersecting && revelar(e.target)),
  { rootMargin: '0px 0px -14% 0px', threshold: 0.1 }
);
alvos.forEach((el) => observador.observe(el));

// quem pula direto para o fim não dispara o observer: revela o que ficou atrás
let agendado = false;
function aoRolar() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    aguardando.forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.86) revelar(el);
    });
  });
}
addEventListener('scroll', aoRolar, { passive: true });
