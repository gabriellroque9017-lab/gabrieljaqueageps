# Entre Videiras e Promessas

Site do casamento de Gabriel Hossana e Jaqueline — 12 de dezembro de 2026,
Vila Botané, Vassouras (RJ).

Site estático: HTML, CSS e JavaScript, sem nenhuma etapa de build. Publicado
pelo GitHub Pages em <https://www.gabrieljaquelineageps.com.br>.

## Páginas

| Arquivo | No site |
|---|---|
| `index.html` | Entre Videiras e Promessas (inicial) |
| `nossa-historia.html` | Nossa História |
| `contato.html` | Contatos |
| `viagem-e-estada.html` | Viagem e Estadia |
| `lista-de-casamento.html` | Presentes |
| `portfolio.html` | Portfolio |
| `confirmar-presenca.html` | Confirmar presença |

## Modo de edição

O site pode ser editado no próprio ar. Abra qualquer página **menos a inicial**
com `?editar=1` no fim do endereço:

```
https://www.gabrieljaquelineageps.com.br/nossa-historia.html?editar=1
```

Sem esse `?editar=1` ninguém vê botão nenhum — os convidados enxergam o site
normal.

Na primeira vez, clique em **Conta do GitHub** e preencha usuário, repositório
e um token de acesso com permissão `Contents: Read and write`. Esses dados
ficam **apenas no seu navegador** (localStorage) e nunca são enviados para o
site. Cada edição vira um commit, e o site republica em cerca de um minuto.

O que dá para fazer: trocar qualquer foto, editar qualquer texto, acrescentar
textos posicionados à mão, e no Portfolio e na faixa de Nossa História também
apagar, reordenar e acrescentar fotos.

A página inicial não é editável de propósito.

### Para desligar a edição de vez

Apague `editor.js`, `editor-deposito.js`, `editor-remendo.js` e `editor.css`,
e remova as três linhas que os carregam no fim de cada página. As fotos e os
textos já estão gravados no HTML — nada se perde.

## Lista de presenças

O formulário de `confirmar-presenca.html` envia para um Google Apps Script que
escreve numa planilha privada; o endereço está em `rsvp.js`. A planilha só é
acessível pela conta dos noivos. Quem responde "não vou conseguir" entra na
lista com o nome riscado.

## Pix

O código em `pix.js` foi gerado pelo aplicativo do banco e testado com um
pagamento real. Não monte esse código à mão: para trocar, gere outro no banco,
teste, e substitua a linha inteira.

## Música

Duas faixas em `assets/`, tocadas em sequência e retomadas de onde pararam ao
trocar de página (`musica.js`). O botão de silenciar fica no canto inferior
direito. Nenhum navegador toca som antes do primeiro clique na página — isso é
regra do navegador, não do site.

## Fontes

Cormorant Garamond nos títulos, EB Garamond no corpo e Pinyon Script no nome
do casal, carregadas do Google Fonts. Sem internet o navegador cai para uma
serifada do sistema e o layout continua de pé.
