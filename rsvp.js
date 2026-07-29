// ============================================================
//  TROCAR AQUI: o endereço do script que grava na planilha
// ============================================================
//  Cole abaixo a URL que o Google devolve ao publicar o Apps Script
//  (as instruções estão em CONFIRMACOES.md, na raiz do projeto).
//  Enquanto estiver vazio, o formulário avisa que ainda não está ligado
//  em vez de fingir que gravou.
// ============================================================
const DESTINO = 'https://script.google.com/macros/s/AKfycbzD4zVSjQZgxNjoYa_ZTQC3v7HJZe0nvi_6KCO11g07a0MDbFoFkmzrJUJgtvoHgKSA7g/exec';

const form = document.getElementById('rsvp');
const estado = document.getElementById('rsvp-estado');
const botaoEnviar = document.getElementById('rsvp-enviar');

const campoCompanhia = document.getElementById('campo-companhia');
const campoQuantidade = document.getElementById('campo-quantidade');
const campoNomes = document.getElementById('campo-nomes');
const listaNomes = document.getElementById('acompanhantes');
const quantidade = document.getElementById('quantidade');

const vai = () => form.resposta.value === 'vou';
const levaMais = () => form.companhia.value === 'mais';

// ------------------------------------------------------------
// Mostra e esconde os campos conforme as escolhas
// ------------------------------------------------------------
function ajustarCampos() {
  campoCompanhia.hidden = !vai();
  campoQuantidade.hidden = !vai() || !levaMais();
  campoNomes.hidden = campoQuantidade.hidden;
  if (!campoNomes.hidden) desenharNomes();
}

// um campo de nome para cada acompanhante, preservando o que já foi digitado
function desenharNomes() {
  const quantos = Math.max(1, Math.min(10, Number(quantidade.value) || 1));
  const jaDigitados = [...listaNomes.querySelectorAll('input')].map((i) => i.value);

  listaNomes.innerHTML = '';
  for (let i = 0; i < quantos; i++) {
    const campo = document.createElement('input');
    campo.className = 'campo__entrada acompanhante';
    campo.type = 'text';
    campo.name = `acompanhante-${i + 1}`;
    campo.placeholder = `${i + 1}ª pessoa`;
    campo.setAttribute('aria-label', `Nome da ${i + 1}ª pessoa que vem com você`);
    campo.value = jaDigitados[i] || '';
    listaNomes.appendChild(campo);
  }
}

form.querySelectorAll('input[name="resposta"], input[name="companhia"]').forEach((opcao) => {
  opcao.addEventListener('change', ajustarCampos);
});
quantidade.addEventListener('input', desenharNomes);
ajustarCampos();

// ------------------------------------------------------------
// Envio
// ------------------------------------------------------------
function avisar(texto, tipo) {
  estado.textContent = texto;
  estado.dataset.tipo = tipo;
  estado.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = form.nome.value.trim();
  if (!nome) return;

  const acompanhantes = vai() && levaMais()
    ? [...listaNomes.querySelectorAll('input')].map((i) => i.value.trim()).filter(Boolean)
    : [];

  const dados = {
    nome,
    vai: vai(),
    acompanhantes,
    total: vai() ? 1 + acompanhantes.length : 0,
    recado: form.recado.value.trim(),
    enviadoEm: new Date().toISOString(),
  };

  if (!DESTINO) {
    avisar('A lista de presenças ainda não foi ligada. Avise os noivos.', 'erro');
    return;
  }

  botaoEnviar.disabled = true;
  avisar('Enviando…', 'aguarde');

  try {
    // text/plain evita a checagem prévia de CORS, que o Apps Script não responde
    const envio = fetch(DESTINO, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(dados),
    });
    envio.catch(() => {}); // se falhar depois da corrida, não vira erro solto

    // O Apps Script grava e só então redireciona para outro domínio; com
    // no-cors o navegador segura essa resposta opaca por até 20s. Esperar não
    // diz nada (a resposta é ilegível de qualquer forma) e o convidado acharia
    // que travou. 2,5s é o bastante para uma falha de rede, que é imediata.
    await Promise.race([envio, new Promise((r) => setTimeout(r, 2500))]);

    // some com o formulário inteiro: campos, botão e o "preencha os campos
    // abaixo", que fica fora do <form> e sobraria sozinho na tela
    form.querySelectorAll('.campo, .rsvp__botao').forEach((el) => (el.hidden = true));
    document.querySelector('.rsvp__texto').hidden = true;
    avisar(
      dados.vai
        ? 'Presença confirmada. Até 12 de dezembro!'
        : 'Recado anotado. Vamos sentir sua falta.',
      'certo'
    );
  } catch {
    botaoEnviar.disabled = false;
    avisar('Não conseguimos enviar agora. Tente de novo, ou fale com a gente pelo WhatsApp.', 'erro');
  }
});
