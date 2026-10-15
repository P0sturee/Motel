"""Trilha sintetizada, efeitos sonoros e mixagem final do vídeo.

  python audio.py sfx                     -> sfx/*.wav
  python audio.py music                   -> out/music.wav (usa cues.json)
  python audio.py mix [voice.wav]         -> out/mix.wav (trilha + efeitos + narração)
"""
import json
import os
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
RNG = np.random.default_rng(5)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_ad(n, a, d):
    """envelope ataque linear + decaimento exponencial (d = constante de tempo)"""
    t = np.arange(n) / SR
    e = np.exp(-np.maximum(t - a, 0) / d)
    e[t < a] = t[t < a] / max(a, 1e-4)
    return e


def lp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'low')
    return signal.lfilter(b, a, x, axis=0)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x, axis=0)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x, axis=0)


def reverb_ir(rt=1.8, seed=3):
    r = np.random.default_rng(seed)
    n = int(rt * SR)
    t = np.arange(n) / SR
    decay = np.exp(-6.9 * t / rt)
    ir = r.standard_normal((n, 2)) * decay[:, None]
    ir = lp(ir, 5200)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(axis=0, keepdims=True))


IR = reverb_ir()


def verb(x, wet=0.25):
    """x estéreo (n,2) -> estéreo com reverb"""
    y = np.stack([signal.fftconvolve(x[:, c], IR[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet) + y * wet * 1.4


def pan(mono, p):
    """p em [-1,1]"""
    l = np.cos((p + 1) * np.pi / 4)
    r = np.sin((p + 1) * np.pi / 4)
    return np.stack([mono * l, mono * r], axis=1)


def add(buf, x, at):
    i = int(round(at * SR))
    if i < 0:
        x, i = x[-i:], 0
    if i >= len(buf) or len(x) == 0:
        return
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]


def norm_peak(x, peak=0.5):
    m = np.abs(x).max()
    return x * (peak / m) if m > 0 else x


def write(path, x):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    wavfile.write(path, SR, np.clip(x, -1, 1).astype(np.float32))


def read(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float32)
    if x.dtype.kind == 'i' or np.abs(x).max() > 1.5:
        x = x / 32768.0
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    if sr != SR:
        x = signal.resample_poly(x, SR, sr, axis=0)
    return x


def nf(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# ------------------------------------------------------------------ efeitos

def sfx_chime():
    n = int(1.4 * SR)
    out = np.zeros((n, 2))
    for k, (f, at, amp) in enumerate([(nf(88), 0.0, 0.9), (nf(95), 0.11, 1.0)]):
        m = int((1.4 - at) * SR)
        t = np.arange(m) / SR
        tone = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * 2 * f * t) + 0.06 * np.sin(2 * np.pi * 3.01 * f * t)
        tone *= env_ad(m, 0.002, 0.32) * amp
        add(out, pan(tone, -0.15 + 0.3 * k), at)
    t = np.arange(int(0.08 * SR)) / SR
    thump = np.sin(2 * np.pi * (180 - 600 * t) * t) * np.exp(-t / 0.02)
    add(out, pan(thump * 0.6, 0), 0)
    return norm_peak(verb(out, 0.3), 0.6)


def sfx_whoosh(dur=0.8):
    n = int(dur * SR)
    noise = RNG.standard_normal(n)
    out = np.zeros(n)
    block = 256
    zi = None
    for i in range(0, n, block):
        p = i / n
        fc = 350 + 2600 * np.sin(np.pi * min(p * 1.05, 1)) ** 1.5
        b, a = signal.butter(2, [fc * 0.6 / (SR / 2), min(fc * 1.6, 20000) / (SR / 2)], 'band')
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        seg, zi = signal.lfilter(b, a, noise[i:i + block], zi=zi)
        out[i:i + block] = seg
    t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    out *= e
    st = np.stack([out * np.cos((t / dur) * np.pi / 2), out * np.sin((t / dur) * np.pi / 2)], axis=1)
    return norm_peak(verb(st, 0.2), 0.5)


def sfx_sparkle():
    n = int(1.3 * SR)
    out = np.zeros((n, 2))
    notes = [96, 100, 103, 108, 105, 112, 108]
    for k, m in enumerate(notes):
        f = nf(m)
        L = int(0.4 * SR)
        t = np.arange(L) / SR
        ping = np.sin(2 * np.pi * f * t) * env_ad(L, 0.003, 0.09) * (1 - k * 0.09)
        add(out, pan(ping, RNG.uniform(-0.7, 0.7)), k * 0.042)
    return norm_peak(verb(out, 0.45), 0.45)


def sfx_pop(f0=760):
    L = int(0.25 * SR)
    t = np.arange(L) / SR
    f = f0 * (0.55 + 0.45 * np.exp(-t / 0.03))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env_ad(L, 0.002, 0.05)
    click = hp(RNG.standard_normal(L), 3000) * env_ad(L, 0.0005, 0.004) * 0.15
    return norm_peak(verb(pan(x + click, 0), 0.18), 0.5)


def sfx_success():
    n = int(1.8 * SR)
    out = np.zeros((n, 2))
    for k, m in enumerate([84, 88, 91, 96]):
        f = nf(m)
        L = int(1.2 * SR)
        t = np.arange(L) / SR
        tone = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.1 * np.sin(2 * np.pi * 3 * f * t))
        tone *= env_ad(L, 0.003, 0.35 if k < 3 else 0.6)
        add(out, pan(tone * (0.8 + 0.1 * k), -0.3 + 0.2 * k), k * 0.075)
    return norm_peak(verb(out, 0.35), 0.55)


def make_sfx():
    os.makedirs('sfx', exist_ok=True)
    write('sfx/chime.wav', sfx_chime())
    write('sfx/whoosh.wav', sfx_whoosh())
    write('sfx/sparkle.wav', sfx_sparkle())
    write('sfx/pop.wav', sfx_pop(760))
    for i, m in enumerate([72, 74, 76, 79, 81]):
        write(f'sfx/pop{i + 1}.wav', sfx_pop(nf(m)))
    write('sfx/success.wav', sfx_success())
    print('sfx ok')


# ------------------------------------------------------------------ trilha

BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
# (baixo, notas do pad, arpejo) — C, G, Am, F
CHORDS = [
    (36, [48, 55, 62, 64], [60, 67, 74, 76, 79, 76, 74, 67]),
    (43, [47, 55, 62, 69], [59, 67, 71, 74, 79, 74, 71, 67]),
    (45, [48, 52, 57, 64], [57, 64, 69, 72, 76, 72, 69, 64]),
    (41, [45, 53, 60, 64], [57, 65, 69, 72, 77, 72, 69, 65]),
]


def pad_voice(freqs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    st = np.zeros((n, 2))
    for f in freqs:
        for c, det in enumerate((-0.07, 0.07)):
            v = signal.sawtooth(2 * np.pi * f * (1 + det / 12) * t + RNG.uniform(0, 6.28))
            v += 0.6 * signal.sawtooth(2 * np.pi * f * (1 - det / 24) * t + RNG.uniform(0, 6.28))
            st[:, c] += v
    st = lp(st, 1100, 2)
    a = int(0.45 * SR)
    r = int(0.8 * SR)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a) ** 1.5
    e[-r:] *= np.linspace(1, 0, r) ** 1.2
    return st * e[:, None] / (len(freqs) * 2.5)


def marimba(f, vel=1.0):
    L = int(0.9 * SR)
    t = np.arange(L) / SR
    x = np.sin(2 * np.pi * f * t) * env_ad(L, 0.002, 0.28)
    x += 0.35 * np.sin(2 * np.pi * 3.93 * f * t) * env_ad(L, 0.001, 0.05)
    x += 0.10 * np.sin(2 * np.pi * 9.2 * f * t) * env_ad(L, 0.001, 0.015)
    return x * vel


def bass_note(f, dur):
    L = int((dur + 0.3) * SR)
    t = np.arange(L) / SR
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    e = env_ad(L, 0.01, 0.9)
    e[int(dur * SR):] *= np.exp(-np.arange(L - int(dur * SR)) / SR / 0.06)
    return lp(x * e, 600)


def kick():
    L = int(0.45 * SR)
    t = np.arange(L) / SR
    f = 48 + 110 * np.exp(-t / 0.035)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(L, 0.001, 0.16)
    return x


def snap():
    L = int(0.35 * SR)
    n = RNG.standard_normal(L)
    x = bp(n, 1100, 3600) * env_ad(L, 0.001, 0.045)
    x += bp(RNG.standard_normal(L), 1800, 2600) * env_ad(L, 0.012, 0.03) * 0.6
    return x * 0.8


def shaker():
    L = int(0.12 * SR)
    return hp(RNG.standard_normal(L), 6500) * env_ad(L, 0.004, 0.025)


def make_music(total, s_in, s_out):
    # andamento ajustado (~100 BPM) para cair um tempo forte na revelação (s_in) e no CTA (s_out)
    nb = max(1, round((s_out - s_in) / (4 * 60 / BPM)))
    BAR = (s_out - s_in) / nb
    BEAT = BAR / 4
    origin = s_in - np.ceil(s_in / BAR) * BAR
    n = int((total + 1.0) * SR)
    pad = np.zeros((n, 2))
    arp = np.zeros((n, 2))
    bass = np.zeros((n, 2))
    drums = np.zeros((n, 2))
    bars = int(np.ceil((total - origin) / BAR)) + 1
    K, SN, SH = kick(), snap(), shaker()
    for b in range(bars):
        t0 = origin + b * BAR
        if t0 + BAR < 0:
            continue
        root, pad_notes, arp_notes = CHORDS[b % 4]
        add(pad, pad_voice([nf(m) for m in pad_notes], BAR + 0.8), t0 - 0.2)
        groove = s_in - 0.05 <= t0 < s_out - 0.05
        for i, m in enumerate(arp_notes):
            if not groove and i % 2 == 1:
                continue
            at = t0 + i * BEAT / 2 + (0.006 if i % 2 else 0)
            vel = (0.9 if i % 4 == 0 else 0.65) * (0.8 if not groove else 1.0)
            add(arp, pan(marimba(nf(m + 12), vel), -0.35 if i % 2 else 0.35), at)
        if groove:
            add(bass, pan(bass_note(nf(root), BEAT * 1.6), 0), t0)
            add(bass, pan(bass_note(nf(root), BEAT * 0.8), 0), t0 + 2 * BEAT)
            add(bass, pan(bass_note(nf(root + 7), BEAT * 0.4), 0), t0 + 3.5 * BEAT)
            for k in (0, 2):
                add(drums, pan(K * 0.9, 0), t0 + k * BEAT)
            add(drums, pan(K * 0.45, 0), t0 + 3.5 * BEAT)
            for k in (1, 3):
                add(drums, pan(SN * 0.55, 0.1), t0 + k * BEAT)
            for k in range(16):
                acc = 0.5 if k % 4 == 2 else (0.32 if k % 2 else 0.2)
                add(drums, pan(SH * acc, 0.45), t0 + k * BEAT / 4)
    # acorde final no CTA, soando até o fim
    root, pad_notes, arp_notes = CHORDS[0]
    for i, m in enumerate([60, 64, 67, 72, 76, 79]):
        add(arp, pan(marimba(nf(m + 12), 0.7), -0.4 + 0.16 * i), s_out + i * 0.06)
    add(pad, pad_voice([nf(m) for m in pad_notes], total - s_out + 1.0) * 1.2, s_out)
    # sidechain leve do pad pelo bumbo
    duck = np.ones(n)
    for b in range(bars):
        for k in (0, 2):
            t0 = origin + b * BAR
            i = int((t0 + k * BEAT) * SR)
            if s_in - 0.05 <= t0 < s_out - 0.05 and 0 <= i < n:
                L = min(int(0.35 * SR), n - i)
                duck[i:i + L] *= 1 - 0.35 * np.exp(-np.arange(L) / SR / 0.1)
    pad *= duck[:, None]
    mix = 0.55 * verb(pad, 0.35) + 0.42 * verb(arp, 0.3) + 0.5 * bass + 0.42 * verb(drums, 0.12)
    mix = mix[: int(total * SR)]
    fade_in = int(0.4 * SR)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    fo = int(2.2 * SR)
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    mix = np.tanh(mix * 1.2) / 1.2
    return norm_peak(mix, 0.7)


# ------------------------------------------------------------------ mixagem

def smooth_env(x, att, rel):
    e = np.abs(x)
    out = np.zeros_like(e)
    a = np.exp(-1 / (att * SR))
    r = np.exp(-1 / (rel * SR))
    prev = 0.0
    # decimado para ficar rápido
    step = 48
    for i in range(0, len(e), step):
        v = e[i:i + step].max()
        c = a if v > prev else r ** step
        prev = c * prev + (1 - c) * v if v > prev else max(v, prev * r ** step)
        out[i:i + step] = prev
    return out


def make_mix(voice_path=None):
    cues = json.load(open('cues.json'))
    total = cues['end']
    n = int(total * SR)
    music = read('out/music.wav')[:n]
    music = np.pad(music, ((0, n - len(music)), (0, 0)))
    out = np.zeros((n, 2))
    sfx = json.load(open('out/sfx.json'))
    cache = {}
    for ev in sfx:
        name = ev['name']
        if name not in cache:
            cache[name] = read(f'sfx/{name}.wav')
        add(out, cache[name] * ev['gain'] * 0.55, ev['t'])
    if voice_path:
        v = read(voice_path)
        voice = np.zeros((n, 2))
        add(voice, v, cues.get('audio_offset', 0))
        venv = smooth_env(voice.mean(axis=1), 0.02, 0.35)
        thr = np.percentile(venv[venv > 1e-4], 60) if (venv > 1e-4).any() else 1
        duck = 1 - 0.55 * np.clip(venv / thr, 0, 1)
        out += voice * 0.95 + music * 0.30 * duck[:, None]
    else:
        out += music * 0.62
    write('out/mix.wav', norm_peak(out, 0.89))
    print('mix ok', 'com narração' if voice_path else 'sem narração')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'sfx':
        make_sfx()
    elif cmd == 'music':
        c = json.load(open('cues.json'))
        write('out/music.wav', make_music(c['end'], c['s2'], c['s8']))
        print('music ok', c['end'])
    elif cmd == 'mix':
        make_mix(sys.argv[2] if len(sys.argv) > 2 else None)
