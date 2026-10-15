"""Extrai o tempo de cada palavra da narração (faster-whisper, roda local).

  python words.py out/voice.wav out/words.json
"""
import json
import sys

from faster_whisper import WhisperModel

src, dst = sys.argv[1], sys.argv[2]
model = WhisperModel("small", device="cpu", compute_type="int8")
segments, _ = model.transcribe(src, language="pt", word_timestamps=True, vad_filter=False, beam_size=5)
words = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
         for seg in segments for w in seg.words]
json.dump(words, open(dst, "w"), ensure_ascii=False, indent=1)
print(" ".join(w["word"] for w in words))
print(f"{len(words)} palavras, fim em {words[-1]['end']}s")
