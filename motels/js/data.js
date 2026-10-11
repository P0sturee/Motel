/*
  Dados da casa. Tudo que muda com frequência (preços, quantidade de suítes,
  fotos, extras, contato) fica aqui, para não precisar mexer no resto do código.
*/
(function () {
  // Fotos do Pexels (licença livre). Para usar fotos próprias, troque `photo`
  // por uma URL ou caminho local, ex.: "img/suite-01.jpg".
  function pexels(id, w) {
    return 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id +
      '.jpeg?auto=compress&cs=tinysrgb&w=' + (w || 1400);
  }

  var suites = [
    {
      id: '01',
      name: 'Cortina',
      qty: 14,
      text: 'A mais pedida em dia de semana. Cortina blackout de verdade, ar split silencioso e chuveiro a gás que não perde pressão.',
      feat: ['Cama king', 'Blackout', 'TV 50"', 'Chuveiro a gás'],
      prices: { '2h': 89, '4h': 129, pernoite: 189, extra: 25 },
      photo: '13871317'
    },
    {
      id: '02',
      name: 'Rubra',
      qty: 10,
      text: 'Fita de luz vermelha no teto inteiro, com dimmer na cabeceira. Espelho lateral do tamanho da cama e som com bluetooth.',
      feat: ['Luz regulável', 'Espelho lateral', 'Som bluetooth', 'Frigobar'],
      prices: { '2h': 119, '4h': 159, pernoite: 239, extra: 32 },
      photo: '14434979'
    },
    {
      id: '03',
      name: 'Vapor',
      qty: 6,
      text: 'Sauna seca dentro do quarto, pronta 15 minutos depois de ligar. Ducha fria do lado e roupão para os dois.',
      feat: ['Sauna seca', 'Ducha fria', 'Roupões', 'Cama king'],
      prices: { '2h': 159, '4h': 209, pernoite: 309, extra: 40 },
      photo: '8092430'
    },
    {
      id: '04',
      name: 'Espelho',
      qty: 6,
      text: 'Hidromassagem para dois com cromoterapia, teto espelhado em cima da cama e uma janela redonda virada para o jardim interno.',
      feat: ['Hidro dupla', 'Teto espelhado', 'Cromoterapia', 'Jardim interno'],
      prices: { '2h': 179, '4h': 239, pernoite: 349, extra: 45 },
      photo: '6621052'
    },
    {
      id: '05',
      name: 'Raia',
      qty: 4,
      text: 'Piscina privativa aquecida a 30 °C, iluminada por baixo. Deck, ducha externa e a garagem logo ao lado da escada.',
      feat: ['Piscina aquecida', 'Deck', 'Ducha externa', 'Hidro'],
      prices: { '2h': 249, '4h': 329, pernoite: 469, extra: 60 },
      photo: '7974837'
    },
    {
      id: '06',
      name: 'Alcova',
      qty: 2,
      text: 'A suíte que dá nome à casa. Dois andares: piscina e sauna embaixo, hidro e cama redonda em cima, telão de 120 polegadas.',
      feat: ['Dois andares', 'Piscina + sauna', 'Cama redonda', 'Telão 120"'],
      prices: { '2h': 349, '4h': 459, pernoite: 649, extra: 85 },
      photo: '5883728'
    }
  ];

  suites.forEach(function (s) {
    if (/^\d+$/.test(s.photo)) {
      s.img = pexels(s.photo, 1400);
      s.imgSmall = pexels(s.photo, 800);
    } else {
      s.img = s.imgSmall = s.photo;
    }
  });

  window.ALCOVA = {
    suites: suites,
    periods: [
      { id: '2h', label: '2 horas', hours: 2 },
      { id: '4h', label: '4 horas', hours: 4 },
      { id: 'pernoite', label: 'Pernoite', hours: null }
    ],
    // Pernoite: entrada entre 20h e 23h30, saída até 12h do dia seguinte.
    pernoite: { from: 20 * 60, to: 23 * 60 + 30, checkout: 12 * 60 },
    extras: [
      { id: 'espumante', label: 'Espumante gelado na chegada', price: 89 },
      { id: 'petalas', label: 'Pétalas e velas de LED na cama', price: 120 },
      { id: 'cafe', label: 'Café da manhã para dois', price: 65, onlyPernoite: true }
    ],
    maxPerBooking: 4,
    bookAheadDays: 60,
    whatsapp: '5511900000000'
  };
})();
