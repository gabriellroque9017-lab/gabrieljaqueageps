// Trilha do site — duas faixas em sequência.
//
// Cada página é um documento novo, então o navegador para o áudio ao navegar.
// Para dar continuidade, guardamos qual faixa estava tocando e em que segundo,
// e retomamos dali na página seguinte — em vez de recomeçar do zero.
//
// Os navegadores também bloqueiam som automático antes de qualquer interação.
// Quando isso acontece, esperamos o primeiro clique, toque ou rolagem.

const FAIXAS = ['assets/musica-1.mp3', 'assets/musica-2.mp3'];

const audio = document.getElementById('musica');
const botao = document.getElementById('som');

const CHAVE_FAIXA = 'musica:faixa';
const CHAVE_TEMPO = 'musica:segundo';
const CHAVE_MUDO = 'musica:mudo';

let atual = Number(sessionStorage.getItem(CHAVE_FAIXA)) || 0;
if (atual < 0 || atual >= FAIXAS.length) atual = 0;

function carregar(indice, retomarEm = 0) {
  atual = indice;
  sessionStorage.setItem(CHAVE_FAIXA, String(atual));
  audio.src = FAIXAS[atual];
  if (retomarEm > 0) {
    const aplicar = () => {
      if (retomarEm < audio.duration) audio.currentTime = retomarEm;
    };
    if (audio.readyState >= 1) aplicar();
    else audio.addEventListener('loadedmetadata', aplicar, { once: true });
  }
}

// retoma de onde parou
carregar(atual, parseFloat(sessionStorage.getItem(CHAVE_TEMPO)) || 0);

// acabou uma faixa, entra a seguinte; depois da última volta para a primeira
audio.addEventListener('ended', () => {
  carregar((atual + 1) % FAIXAS.length);
  sessionStorage.setItem(CHAVE_TEMPO, '0');
  tocar();
});

// o estado de mudo atravessa a sessão inteira
audio.muted = localStorage.getItem(CHAVE_MUDO) === 'sim';
pintarBotao();

function pintarBotao() {
  botao.dataset.mudo = String(audio.muted);
  botao.setAttribute('aria-pressed', String(audio.muted));
  botao.setAttribute('aria-label', audio.muted ? 'Ativar a música' : 'Silenciar a música');
}

function tocar() {
  const p = audio.play();
  if (p) p.catch(() => {}); // bloqueado: os ouvintes abaixo tentam de novo
}

tocar();

// se o navegador barrou o som, a primeira interação libera
const gestos = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
function aoInteragir() {
  tocar();
  if (!audio.paused) gestos.forEach((g) => removeEventListener(g, aoInteragir));
}
gestos.forEach((g) => addEventListener(g, aoInteragir, { passive: true }));

botao.addEventListener('click', () => {
  audio.muted = !audio.muted;
  localStorage.setItem(CHAVE_MUDO, audio.muted ? 'sim' : 'nao');
  pintarBotao();
  if (!audio.muted) tocar();
});

// guarda a posição de forma econômica (uma vez por segundo) e ao sair da página
let ultimo = 0;
audio.addEventListener('timeupdate', () => {
  if (Math.abs(audio.currentTime - ultimo) < 1) return;
  ultimo = audio.currentTime;
  sessionStorage.setItem(CHAVE_TEMPO, String(audio.currentTime));
});
addEventListener('pagehide', () => sessionStorage.setItem(CHAVE_TEMPO, String(audio.currentTime)));
