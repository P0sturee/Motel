#!/usr/bin/env bash
# Gera o vídeo final.
#   ./build.sh                    -> prévia sem narração (tempos estimados pelo roteiro)
#   ./build.sh narracao.mp3       -> versão final, sincronizada com a narração da ElevenLabs
set -euo pipefail
cd "$(dirname "$0")"
PY=${PY:-python3}
mkdir -p out

if [ -n "${1:-}" ]; then
  ffmpeg -y -loglevel error -i "$1" -ar 48000 -ac 1 out/voice.wav
  $PY words.py out/voice.wav out/words.json
  $PY make_cues.py words out/words.json
  NAME=placa-nfc-final.mp4
else
  $PY make_cues.py estimate
  NAME=placa-nfc-previa-sem-narracao.mp4
fi

$PY audio.py sfx
$PY audio.py music
node render.mjs video out=out/video.mp4
$PY audio.py mix ${1:+out/voice.wav}
ffmpeg -y -loglevel error -i out/video.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v copy \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest "out/$NAME"
echo "pronto: out/$NAME"
