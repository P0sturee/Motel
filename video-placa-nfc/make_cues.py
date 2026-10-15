"""Gera cues.js (tempos de cada frase da narração) para sincronizar a animação.

Uso:
  python make_cues.py estimate            -> tempos estimados pelo roteiro
  python make_cues.py words words.json    -> tempos reais (palavras com start/end)
"""
import json
import sys
import unicodedata

LEAD_IN = 0.5     # segundos de respiro antes da primeira fala
OUTRO = 2.6       # segundos de tela final depois da última palavra

# (nome do cue, trecho do roteiro que começa nesse cue)
SEGMENTS = [
    ("s1",  "Seu cliente amou o atendimento…"),
    ("s1b", "e foi embora sem avaliar."),
    ("s2",  "Com a placa de avaliação Google, isso muda."),
    ("s3",  "É só aproximar o celular,"),
    ("s3b", "e a página de avaliação do seu negócio abre na hora."),
    ("s4",  "Sem aplicativo,"),
    ("s4b", "sem procurar nada."),
    ("s5",  "Em segundos…"),
    ("s5b", "avaliação feita!"),
    ("s6",  "Mais avaliações,"),
    ("s6b", "mais destaque…"),
    ("s6c", "mais clientes."),
    ("s7",  "Funciona em iPhone e Android,"),
    ("s7b", "já vai configurada,"),
    ("s7c", "pode ser reprogramada…"),
    ("s7d", "e é pagamento único, sem mensalidade."),
    ("s8",  "Peça já a sua placa."),
]

SCRIPT = " ".join(t for _, t in SEGMENTS)


def norm(w):
    w = unicodedata.normalize("NFKD", w.lower())
    w = "".join(c for c in w if not unicodedata.combining(c))
    return "".join(c for c in w if c.isalnum())


def estimate():
    cps = 14.5
    pauses = {"…": 0.45, ",": 0.18, ".": 0.4, "!": 0.4, ":": 0.25}
    t = LEAD_IN
    cues = {}
    for name, text in SEGMENTS:
        cues[name] = round(t, 3)
        t += len(text) / cps + pauses.get(text[-1], 0.1)
    cues["vend"] = round(t - 0.4, 3)
    cues["end"] = round(cues["vend"] + OUTRO, 3)
    return cues


def from_words(path):
    words = json.load(open(path))
    seq = [(norm(w["word"]), w["start"], w["end"]) for w in words if norm(w["word"])]
    cues = {}
    i = 0
    for name, text in SEGMENTS:
        first = [norm(x) for x in text.split() if norm(x)][:2]
        # procura a partir da posição atual a sequência das 2 primeiras palavras
        j = i
        while j < len(seq):
            if seq[j][0] == first[0] and (len(first) < 2 or j + 1 >= len(seq) or seq[j + 1][0] == first[1]):
                break
            j += 1
        if j >= len(seq):
            raise SystemExit(f"não achei o início de {name}: {text!r}")
        cues[name] = round(seq[j][1], 3)
        i = j + 1
    offset = LEAD_IN - cues["s1"]
    cues = {k: round(v + offset, 3) for k, v in cues.items()}
    cues["vend"] = round(seq[-1][2] + offset, 3)
    cues["end"] = round(cues["vend"] + OUTRO, 3)
    cues["audio_offset"] = round(offset, 3)
    return cues


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "estimate"
    cues = estimate() if mode == "estimate" else from_words(sys.argv[2])
    with open("cues.js", "w") as f:
        f.write("window.CUES = " + json.dumps(cues, indent=1) + ";\n")
    json.dump(cues, open("cues.json", "w"), indent=1)
    print(json.dumps(cues))
