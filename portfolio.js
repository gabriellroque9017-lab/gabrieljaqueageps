// revela cada foto conforme ela entra na tela
const fotos = [...document.querySelectorAll('.mosaico figure')];
const pendentes = new Set(fotos);

function revelar(foto) {
  foto.classList.add('revelada');
  pendentes.delete(foto);
  observador.unobserve(foto);
  if (pendentes.size === 0) removeEventListener('scroll', aoRolar);
}

const observador = new IntersectionObserver(
  (entradas) => entradas.forEach((e) => e.isIntersecting && revelar(e.target)),
  { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
);

fotos.forEach((foto) => observador.observe(foto));

// Rede de segurança: quem pula direto para o fim da página faz as fotos do meio
// passarem sem nunca intersectar a tela, e o observer não dispara para elas.
// Aqui revelamos tudo que já ficou para trás.
let agendado = false;
function aoRolar() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    pendentes.forEach((foto) => {
      if (foto.getBoundingClientRect().top < innerHeight * 0.88) revelar(foto);
    });
  });
}
addEventListener('scroll', aoRolar, { passive: true });
