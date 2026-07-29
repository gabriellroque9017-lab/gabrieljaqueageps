const trilho = document.getElementById('trilho');
const total = trilho.children.length;

// o original abre com o terceiro slide centralizado; com menos fotos que isso,
// abre no último que existir — e sem foto nenhuma não há o que percorrer
let indice = Math.max(0, Math.min(2, total - 1));

function mostrar() {
  trilho.style.setProperty('--slide', indice);
}

if (total > 0) mostrar();

document.querySelector('.galeria__seta--anterior').addEventListener('click', () => {
  if (total < 2) return;
  indice = (indice - 1 + total) % total;
  mostrar();
});

document.querySelector('.galeria__seta--proxima').addEventListener('click', () => {
  if (total < 2) return;
  indice = (indice + 1) % total;
  mostrar();
});
