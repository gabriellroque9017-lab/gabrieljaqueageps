// Rastro de pólen.
//
// As partículas nascem do movimento real do mouse, não do relógio: a cada
// trecho percorrido nasce uma. Quem move devagar solta pouquíssimas; quem
// atravessa a tela deixa um risco de luz. Parou o mouse, para tudo — o site
// volta ao silêncio.
//
// Cada partícula é um elemento com animação de CSS (roda na GPU) e se apaga
// sozinha ao terminar.

const temMouse = matchMedia('(hover:hover) and (pointer:fine)').matches;
const querMovimento = !matchMedia('(prefers-reduced-motion: reduce)').matches;

if (temMouse && querMovimento) {
  const campo = document.createElement('div');
  campo.className = 'polen-campo';
  campo.setAttribute('aria-hidden', 'true');
  document.body.appendChild(campo);

  // tons médios: precisam aparecer tanto sobre o creme claro do site
  // quanto sobre o verde escuro das fotos
  const CORES = ['#DFE777', '#B8BC7F', '#8C9150'];
  const PASSO = 28; // distância percorrida entre uma partícula e outra
  const TETO = 40; // no máximo isso vivo de uma vez

  let ultimoX = null;
  let ultimoY = null;
  let acumulado = 0;
  let vivas = 0;

  const entre = (a, b) => a + Math.random() * (b - a);

  function soltar(x, y) {
    if (vivas >= TETO) return;
    vivas++;

    const p = document.createElement('span');
    p.className = 'polen';
    const tam = entre(3, 7);
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--t', `${tam.toFixed(1)}px`);
    p.style.setProperty('--cor', CORES[(Math.random() * CORES.length) | 0]);
    p.style.setProperty('--op', entre(0.5, 0.9).toFixed(2));
    // sobe devagar e balança para um dos lados, como pólen ao vento
    p.style.setProperty('--dx1', `${entre(-14, 14).toFixed(0)}px`);
    p.style.setProperty('--dy1', `${entre(-14, -26).toFixed(0)}px`);
    p.style.setProperty('--dx2', `${entre(-30, 30).toFixed(0)}px`);
    p.style.setProperty('--dy2', `${entre(-48, -86).toFixed(0)}px`);
    p.style.setProperty('--dur', `${entre(1.6, 2.6).toFixed(2)}s`);

    p.addEventListener('animationend', () => {
      p.remove();
      vivas--;
    });
    campo.appendChild(p);
  }

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if (ultimoX === null) {
        ultimoX = e.clientX;
        ultimoY = e.clientY;
        return;
      }
      const dx = e.clientX - ultimoX;
      const dy = e.clientY - ultimoY;
      acumulado += Math.hypot(dx, dy);
      ultimoX = e.clientX;
      ultimoY = e.clientY;

      while (acumulado >= PASSO) {
        acumulado -= PASSO;
        // nasce um tico fora do ponteiro para o rastro não sair de dentro da seta
        soltar(e.clientX + entre(-6, 6), e.clientY + entre(-6, 6));
      }
    },
    { passive: true }
  );
}
