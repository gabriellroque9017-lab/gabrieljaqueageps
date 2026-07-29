// Mapa de Vassouras com os pontos do casamento.
//
// Coordenadas conferidas uma a uma:
//   Vila Botané  — do endereço da Casa do Lago Bistrô (Rua Luiz Francisco de Souza, 555)
//   Santa Amália — registro do próprio hotel no OpenStreetMap, com número da avenida
//   Vila Hibisco — eixo da Rua Abreu César (o número 55 não está mapeado)
//   Vassouras    — sede do município, pelo verbete da Wikipédia
//
// O Vale Zirá não existe em base nenhuma de endereços. O ponto aqui é
// ESTIMADO: peguei o traçado da RJ-121 no OpenStreetMap e marquei onde
// caem os "10 minutos do centro" que o site deles informa — tempo que
// também fecha com os "20 minutos de Miguel Pereira" da mesma página.
// (O "km 21" do endereço daria 28 minutos daqui, contradizendo os dois.)
// Por isso o pino é tracejado e o balão avisa que é aproximado.

const PONTOS = {
  botane: [-22.4180665, -43.6448295],
  santaAmalia: [-22.407639, -43.668653],
  vilaHibisco: [-22.4089977, -43.6598181],
  cidade: [-22.403889, -43.662778],
  valeZira: [-22.470678, -43.637124], // estimado
};

const cama =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M3 18v-8h18v8"/><path d="M3 14h18"/><path d="M6 10V7h5v3"/></svg>';

function icone(classe, dentro, tamanho) {
  return L.divIcon({
    className: '',
    html: `<span class="pino ${classe}">${dentro}</span>`,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
    popupAnchor: [0, -tamanho / 2],
  });
}

const mapa = L.map('mapa', {
  center: [-22.4115, -43.6555],
  zoom: 14,
  scrollWheelZoom: false, // rolar a página não deve prender o mapa
  attributionControl: true,
});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(mapa);

L.marker(PONTOS.cidade, { icon: icone('pino--cidade', '', 16) })
  .addTo(mapa)
  .bindPopup('<strong>Vassouras</strong><br>centro da cidade');

const pinoNoiva = L.icon({
  iconUrl: 'assets/pin-noiva.png',
  iconSize: [64, 87],
  iconAnchor: [32, 87], // a ponta do pino é que aponta o lugar
  popupAnchor: [0, -80],
  className: 'pino-noiva',
});

L.marker(PONTOS.botane, { icon: pinoNoiva, zIndexOffset: 1000 })
  .addTo(mapa)
  .bindPopup('<strong>Vila Botané</strong><br>cerimônia e recepção<br>no mesmo endereço da Casa do Lago');

L.marker(PONTOS.santaAmalia, { icon: icone('pino--estadia', cama, 30) })
  .addTo(mapa)
  .bindPopup('<strong>Santa Amália</strong><br>hotel');

L.marker(PONTOS.vilaHibisco, { icon: icone('pino--estadia', cama, 30) })
  .addTo(mapa)
  .bindPopup('<strong>Vila Hibisco</strong><br>pousada e apart');

L.marker(PONTOS.valeZira, { icon: icone('pino--estadia', cama, 30) })
  .addTo(mapa)
  .bindPopup(
    '<strong>Hotel Vale Zirá</strong><br>posição aproximada na RJ-121<br>' +
      'Estrada dos Matacães, 4800 &middot; (24) 99271-2570'
  );

// enquadra todos os pontos com folga
mapa.fitBounds(L.latLngBounds(Object.values(PONTOS)), { padding: [60, 60] });
