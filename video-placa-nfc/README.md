# Vídeo · Placa NFC de avaliação Google

Vídeo motion vertical (1080×1920, 30 fps, ~35 s) para vender as placas NFC de avaliação no Google.
Feito para Reels, TikTok, Status do WhatsApp e anúncios.

Prévia pronta: `placa-nfc-previa-sem-narracao.mp4` (trilha e efeitos, ainda sem a narração).

## Cenas

1. **Gancho**: "Seu cliente amou o atendimento… e foi embora sem avaliar." (perfil com poucas avaliações, estrelas vazias)
2. **Revelação**: a placa real (foto recortada) entra em 3D com brilho de acrílico.
3. **Como funciona**: o celular aproxima, as ondas NFC aparecem, a página de avaliação abre, as 5 estrelas acendem e a avaliação é publicada (com confete).
4. **Valor**: mais avaliações, mais destaque, mais clientes (perfil sobe de 4,1 para 4,9; marcado como simulação ilustrativa).
5. **Vantagens**: iPhone e Android · já vai configurada · pode ser reprogramada · pagamento único, sem mensalidade.
6. **Chamada final**: "Peça já a sua placa" com a foto da placa na mão.

## Roteiro da narração

Voz ElevenLabs **Alexa - Young Voice** (`sXSV9RZ095VZyL64w3ap`), modelo `eleven_v4`:

> [softly] Seu cliente amou o atendimento… e foi embora sem avaliar. [warmly] Com a placa de avaliação Google, isso muda. É só aproximar o celular, e a página de avaliação do seu negócio abre na hora. Sem aplicativo, sem procurar nada. Em segundos… avaliação feita! Mais avaliações, mais destaque… mais clientes. Funciona em iPhone e Android, já vai configurada, pode ser reprogramada… e é pagamento único, sem mensalidade. Peça já a sua placa.

## Como gerar

```bash
./build.sh                  # prévia sem narração (tempos estimados pelo roteiro)
./build.sh narracao.mp3     # versão final: sincroniza cada cena com a fala
```

A versão final transcreve a narração localmente (`words.py`, faster-whisper), acha o início de cada frase
(`make_cues.py`) e recalcula a animação, a trilha e os efeitos a partir desses tempos.

## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `index.html` | Animação (GSAP). Os tempos das cenas vêm de `cues.js`. |
| `render.mjs` | Renderiza quadro a quadro com Chromium (Playwright) e gera o MP4 sem áudio. |
| `audio.py` | Trilha instrumental e efeitos sintetizados (originais) + mixagem com a narração. |
| `make_cues.py`, `words.py` | Sincronização das cenas com a narração. |
| `assets/img` | Placa recortada e tratada a partir das fotos do produto. |

Requisitos: Node 22 (`npm install` instala o Playwright), Chromium do Playwright, ffmpeg e Python 3 com `numpy`, `scipy`, `faster-whisper`.
Fonte Poppins (SIL Open Font License, `assets/fonts/OFL.txt`).
