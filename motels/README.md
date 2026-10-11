# Alcova Motel · site

Site de uma página para um motel fictício, com animação ligada à rolagem e reserva online.
É só HTML, CSS e JavaScript, sem etapa de build.

## Como abrir

Abrir o `index.html` direto no navegador já funciona. Para testar como em produção (e sem avisos de fonte no console), rode um servidor local na pasta:

```bash
cd motels
python3 -m http.server 8000
# ou: npx serve .
```

e acesse `http://localhost:8000`.

## O que tem na página

1. **Fachada**: o letreiro de neon acende piscando, o portão da garagem sobe com a rolagem e a câmera atravessa a porta até o quarto.
2. **A casa**: o texto acende palavra por palavra; fotos com parallax.
3. **A rua de dentro**: cena 3D (CSS 3D + ScrollTrigger). A câmera desce a rua interna e passa pelas garagens das 6 suítes; o portão de cada uma sobe quando ela chega perto. O painel ao lado mostra descrição, preço e quantidade de suítes daquele tipo.
4. **Valores**: painel de letras que viram (estilo quadro de aeroporto) com 2h, 4h, pernoite e hora extra de cada suíte.
5. **Por dentro**: rolagem horizontal com parallax nas fotos.
6. **Discrição**: imagem fixa que troca a cada passo do texto.
7. **Reserva**: suíte, dia (calendário), permanência (2h, 4h ou pernoite), horário de chegada, quantidade de suítes, extras e contato. O resumo aparece num chaveiro de motel que balança a cada troca. Ao confirmar, gera um código e monta a mensagem pronta para o WhatsApp.
8. **Rodapé**: endereço, horários e o letreiro grande.

Quem usa "reduzir movimento" no sistema recebe a mesma página em layout estático, sem a cena 3D nem a rolagem suave.

## Onde editar

| O quê | Onde |
| --- | --- |
| Suítes, preços, quantidade, descrições e fotos | `js/data.js` |
| Extras da reserva e número do WhatsApp | `js/data.js` |
| Endereço, telefone, Instagram e textos | `index.html` |
| Cores e tipografia | variáveis no topo de `css/style.css` |

### Disponibilidade

A quantidade de suítes livres por dia e horário é **simulada** (`freeCount` em `js/booking.js`), para o site funcionar sozinho.
Para usar a ocupação real, troque essa função por uma chamada ao sistema da portaria.
A confirmação final é feita pelo WhatsApp (`whatsapp` em `js/data.js`); não há cobrança no site.

## Fotos

As fotos ficam em `img/`, cada uma em dois tamanhos (`nome.jpg` e `nome-800.jpg`, o menor para celular).
Todas são do [Pexels](https://www.pexels.com/license/) (uso livre, inclusive comercial, sem atribuição obrigatória) e recebem o mesmo tratamento de cor no CSS.
Para um motel de verdade, o ideal é trocar pelas fotos das próprias suítes: salve a foto nova com o mesmo nome em `img/` (nos dois tamanhos) ou mude o caminho em `js/data.js` e no `index.html`.

| Arquivo | Foto original |
| --- | --- |
| `fachada-quarto` | [Purple and red light in a dark room](https://www.pexels.com/photo/purple-and-red-light-in-a-dark-room-5198473/) |
| `suite-01-cortina` | [Dark hotel room with curtains drawn](https://www.pexels.com/photo/dark-hotel-room-with-curtains-drawn-10343928/) |
| `suite-02-rubra` | [Red light on the ceiling](https://www.pexels.com/photo/red-light-on-the-ceiling-10482375/) |
| `suite-03-vapor` | [Interior of sauna](https://www.pexels.com/photo/interior-of-sauna-8092430/) |
| `suite-04-espelho` | [Modern bathroom with round window](https://www.pexels.com/photo/interior-of-modern-bathroom-with-round-window-6621052/) |
| `suite-05-raia` | [Villa with a lit pool at night](https://www.pexels.com/photo/holiday-home-villa-pavruka-yayla-in-kalkan-19075395/) |
| `suite-06-alcova` | [Interior of a hotel room](https://www.pexels.com/photo/interior-of-a-hotel-room-5883728/) |
| `casa-espumante` | [Glasses with sparkling wine](https://www.pexels.com/photo/close-up-photography-of-glasses-with-sparkling-wine-11976218/) |
| `casa-cetim` | [Red silk satin fabric](https://www.pexels.com/photo/close-up-photo-of-a-red-silk-satin-fabric-4863069/) |
| `casa-letreiro` | [Neon lit motel in Los Angeles](https://www.pexels.com/photo/neon-lit-motel-at-night-in-los-angeles-31353872/) |
| `dentro-garagem` | [Car in a dim parking garage](https://www.pexels.com/photo/modern-car-in-dimly-lit-parking-garage-at-night-28984405/) |
| `dentro-cozinha` | [Dinner with wine and candles](https://www.pexels.com/photo/dinner-with-wine-and-candles-19763210/) |
| `dentro-adega` | [Wine glasses and candles](https://www.pexels.com/photo/two-almost-empty-long-stem-wine-glasses-beside-wine-bottle-and-lighted-candles-95949/) |
| `dentro-enxoval` | [Window in a dark room](https://www.pexels.com/photo/window-in-a-dark-room-14526240/) |
| `dentro-banho` | [A romantic setting in the bathroom](https://www.pexels.com/photo/a-romantic-setting-in-the-bathroom-4099354/) |
| `discricao-1-rua` | [Directional signs to motel](https://www.pexels.com/photo/directional-signs-to-motel-at-night-15439324/) |
| `discricao-2-luz` | [Doors to hotel rooms in darkness](https://www.pexels.com/photo/doors-to-hotel-rooms-in-darkness-18117654/) |
| `discricao-3-portao` | [Car in a covered car park](https://www.pexels.com/photo/a-car-in-the-covered-car-park-9661389/) |
| `discricao-4-janelinha` | [Couple clinking glasses](https://www.pexels.com/photo/crop-unrecognizable-couple-clinking-champagne-glasses-6581054/) |
| `discricao-5-fatura` | [Sign board of a motel](https://www.pexels.com/photo/sign-board-of-a-motel-9408443/) |

## Bibliotecas e fontes (inclusas na pasta)

- [GSAP 3.15](https://gsap.com) com ScrollTrigger e SplitText (`vendor/`), licença padrão gratuita da GreenSock.
- [Lenis 1.3.26](https://github.com/darkroomengineering/lenis) para rolagem suave (`vendor/`), MIT.
- Fontes Bodoni Moda, Archivo e DM Mono (`fonts/`), licença SIL Open Font License.

## Estrutura

```
motels/
├── index.html
├── css/style.css
├── js/
│   ├── data.js      suítes, preços, extras, contato
│   ├── booking.js   calendário, horários, quantidade, resumo e confirmação
│   └── main.js      rolagem suave e todas as animações
├── img/             fotos (2 tamanhos cada)
├── vendor/          gsap, ScrollTrigger, SplitText, lenis
└── fonts/           woff2 + licenças
```
