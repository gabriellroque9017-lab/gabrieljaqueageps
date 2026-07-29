// ============================================================
//  O código Pix — copie e cole do seu banco
// ============================================================
//  Este é o "Pix copia e cola" gerado pelo aplicativo do banco e já
//  testado por um pagamento real. É ele que vira o QR da página.
//
//  Não monte esse código por conta própria: o do banco carrega o
//  identificador da conta, e um código montado à mão pode até parecer
//  válido e cair na conta errada. Para trocar, gere outro no banco,
//  teste, e substitua a linha abaixo inteira.
//
//  Se ficar vazio, a página avisa e não desenha QR nenhum — melhor
//  nada do que um código errado.
// ============================================================
//  Este veio de dentro do QR que o banco gerou (pix_qrcode_gabriel.jpeg):
//  li a imagem e copiei o conteúdo exato, para o QR da página e o botão
//  "Copiar o código" entregarem a mesma coisa, sem chance de divergirem.
const CODIGO_PIX =
  '00020126560014br.gov.bcb.pix0127gabriellroque9017@gmail.com0203Pix5204000053039865802BR5925GABRIEL_HOSSANA_LOPES_ROQ6014RIO_DE_JANEIRO6229052542Cj2vmSiterbhKJeKD5yQMoi63042D44';

// ------------------------------------------------------------
// Desenha na página
// ------------------------------------------------------------
const tela = document.getElementById('qrcode');
const botaoCopiar = document.getElementById('pix-copiar');
const aviso = document.getElementById('pix-aviso');

// o código não aparece na página; vive só aqui e vai direto para a área
// de transferência quando alguém pede
function porCampoTemporario(texto) {
  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(campo);
  campo.select();
  const deu = document.execCommand('copy');
  campo.remove();
  return deu;
}

async function copiarTexto(texto) {
  // a API moderna recusa quando a aba não está em foco ou a página não é
  // segura; nesses casos o campo temporário ainda funciona
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(texto);
      return;
    }
  } catch {
    /* cai para o método antigo */
  }
  if (!porCampoTemporario(texto)) throw new Error('sem acesso à área de transferência');
}

if (!CODIGO_PIX) {
  aviso.hidden = false;
  document.querySelector('.pix__cartao').hidden = true;
  botaoCopiar.hidden = true;
} else {
  const codigo = CODIGO_PIX;

  const qr = qrcode(0, 'M'); // versão automática, correção média
  qr.addData(codigo);
  qr.make();
  tela.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });

  botaoCopiar.addEventListener('click', async () => {
    try {
      await copiarTexto(codigo);
      botaoCopiar.textContent = 'Código copiado';
    } catch {
      botaoCopiar.textContent = 'Não consegui copiar';
    }
    setTimeout(() => (botaoCopiar.textContent = 'Copiar o código'), 3200);
  });
}
