// Trilha do site — uma faixa só.
//
// Cada página é um documento novo, então o navegador para o áudio ao navegar.
// Para dar continuidade, guardamos em que segundo estava e retomamos dali na
// página seguinte — em vez de recomeçar do zero.
//
// Os navegadores bloqueiam som automático antes de qualquer interação. Quando
// isso acontece, esperamos o primeiro clique, toque ou rolagem.

const FAIXA = 'assets/alianca.mp3';

const audio = document.getElementById('musica');
const botao = document.getElementById('som');

const CHAVE_TEMPO = 'musica:segundo';
const CHAVE_PAUSA = 'musica:pausada';

/* ------------------------------------------------------------
   O disco e a barra de posição, ao lado do botão
   ------------------------------------------------------------ */
const tocador = document.createElement('div');
tocador.className = 'tocador';
tocador.innerHTML =
  '<div class="tocador__barra" role="slider" tabindex="0" aria-label="Posição da música"' +
  ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
  '<span class="tocador__feito"></span></div>' +
  '<img class="tocador__disco" src="assets/disco.png" alt="" draggable="false">';
document.body.appendChild(tocador);

const barra = tocador.querySelector('.tocador__barra');
const feito = tocador.querySelector('.tocador__feito');

/* O disco e a barra só existem enquanto a música anda de verdade. Pausada ou
   terminada, os dois somem — o canto volta a ter só o botão. */
function mostrarTocador(ligado) {
  tocador.dataset.tocando = String(ligado);
}

function pintarBarra() {
  if (!audio.duration || !isFinite(audio.duration)) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  feito.style.width = pct.toFixed(2) + '%';
  barra.setAttribute('aria-valuenow', Math.round(pct));
}

/* clique ou arraste na barra move a música para aquele ponto */
function irPara(evento) {
  if (!audio.duration || !isFinite(audio.duration)) return;
  const r = barra.getBoundingClientRect();
  const x = (evento.touches ? evento.touches[0].clientX : evento.clientX) - r.left;
  audio.currentTime = Math.max(0, Math.min(1, x / r.width)) * audio.duration;
  pintarBarra();
}

let arrastando = false;
barra.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  arrastando = true;
  barra.setPointerCapture(e.pointerId);
  irPara(e);
});
barra.addEventListener('pointermove', (e) => arrastando && irPara(e));
barra.addEventListener('pointerup', () => (arrastando = false));
barra.addEventListener('keydown', (e) => {
  if (!audio.duration) return;
  if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
  else if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
  else return;
  e.preventDefault();
  pintarBarra();
});

/* ------------------------------------------------------------
   Estado
   ------------------------------------------------------------ */
audio.src = FAIXA;

const retomarEm = parseFloat(sessionStorage.getItem(CHAVE_TEMPO)) || 0;
if (retomarEm > 0) {
  const aplicar = () => {
    if (retomarEm < audio.duration) audio.currentTime = retomarEm;
    pintarBarra();
  };
  if (audio.readyState >= 1) aplicar();
  else audio.addEventListener('loadedmetadata', aplicar, { once: true });
}

function pintarBotao() {
  const parada = audio.paused;
  botao.dataset.mudo = String(parada);
  botao.setAttribute('aria-pressed', String(parada));
  botao.setAttribute('aria-label', parada ? 'Tocar a música' : 'Parar a música');
}

function tocar() {
  const p = audio.play();
  if (p) p.catch(() => {}); // bloqueado: os ouvintes abaixo tentam de novo
}

audio.addEventListener('play', () => { mostrarTocador(true); pintarBotao(); });
audio.addEventListener('pause', () => { mostrarTocador(false); pintarBotao(); });
audio.addEventListener('timeupdate', pintarBarra);
audio.addEventListener('loadedmetadata', pintarBarra);

/* Terminou: para de vez. O disco e a barra somem, e a posição volta ao começo
   para que o próximo toque no botão recomece a música do início. */
audio.addEventListener('ended', () => {
  audio.pause();
  audio.currentTime = 0;
  sessionStorage.setItem(CHAVE_TEMPO, '0');
  sessionStorage.setItem(CHAVE_PAUSA, 'sim');
  pintarBarra();
  mostrarTocador(false);
  pintarBotao();
});

// quem pausou numa página continua pausado na seguinte
const pausadaAntes = sessionStorage.getItem(CHAVE_PAUSA) === 'sim';
mostrarTocador(false);
pintarBotao();
if (!pausadaAntes) tocar();

// se o navegador barrou o som, a primeira interação libera
const gestos = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
function aoInteragir() {
  if (sessionStorage.getItem(CHAVE_PAUSA) === 'sim') return;
  tocar();
  if (!audio.paused) gestos.forEach((g) => removeEventListener(g, aoInteragir));
}
gestos.forEach((g) => addEventListener(g, aoInteragir, { passive: true }));

botao.addEventListener('click', () => {
  if (audio.paused) {
    sessionStorage.setItem(CHAVE_PAUSA, 'nao');
    tocar();
  } else {
    audio.pause();
    sessionStorage.setItem(CHAVE_PAUSA, 'sim');
  }
});

// guarda a posição de forma econômica (uma vez por segundo) e ao sair da página
let ultimo = 0;
audio.addEventListener('timeupdate', () => {
  if (Math.abs(audio.currentTime - ultimo) < 1) return;
  ultimo = audio.currentTime;
  sessionStorage.setItem(CHAVE_TEMPO, String(audio.currentTime));
});
addEventListener('pagehide', () => sessionStorage.setItem(CHAVE_TEMPO, String(audio.currentTime)));
