const botaoMenu = document.querySelector('.hamburguer');
const menu = document.getElementById('menu');

function alternar(abrir) {
  menu.dataset.aberto = String(abrir);
  botaoMenu.setAttribute('aria-expanded', String(abrir));
  botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');

  // o cabeçalho é irmão anterior do menu, então o CSS não consegue alcançá-lo
  // a partir dele; marcamos o body para trocar a tinta (nas páginas de capa
  // clara o X ficaria verde sobre verde) e travar a rolagem por trás do painel
  if (abrir) document.body.dataset.menu = 'aberto';
  else delete document.body.dataset.menu;
}

botaoMenu.addEventListener('click', () => {
  alternar(menu.dataset.aberto !== 'true');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu.dataset.aberto === 'true') alternar(false);
});
