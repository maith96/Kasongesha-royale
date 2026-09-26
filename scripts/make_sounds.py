"""Synthesise the game's sound effects as small WAV files (stdlib only).

Run from the repo root: python3 scripts/make_sounds.py
"""
import math
import random
import struct
import wave

RATE = 22050
OUT = 'assets/sounds'
random.seed(7)


def write(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    with wave.open(f'{OUT}/{name}.wav', 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(s / peak * 0.85 * 32767)) for s in samples))


def env(t, dur, attack=0.005):
    a = min(1.0, t / attack) if attack else 1.0
    return a * max(0.0, 1 - t / dur) ** 2


def lowpass(xs, k):
    out, y = [], 0.0
    for x in xs:
        y += k * (x - y)
        out.append(y)
    return out


def n(dur):
    return int(RATE * dur)


# Kick: a soft thud (falling low sine) with a little click of noise.
dur = 0.18
kick = []
for i in range(n(dur)):
    t = i / RATE
    f = 140 * math.exp(-t * 18) + 55
    kick.append(math.sin(2 * math.pi * f * t) * env(t, dur) + random.uniform(-1, 1) * 0.3 * max(0, 1 - t / 0.02))
write('kick', kick)

# Slide: stone scraping on the ground - filtered noise, fading out.
dur = 0.55
noise = lowpass([random.uniform(-1, 1) for _ in range(n(dur))], 0.25)
write('slide', [x * env(i / RATE, dur, 0.03) for i, x in enumerate(noise)])

# Splash: brighter noise burst for wet ground.
dur = 0.45
noise = lowpass([random.uniform(-1, 1) for _ in range(n(dur))], 0.6)
write('splash', [x * env(i / RATE, dur, 0.01) * (1 + 0.5 * math.sin(i / RATE * 90)) for i, x in enumerate(noise)])


def tones(notes, note_dur, wave_fn=math.sin, decay=1.0):
    out = []
    for f in notes:
        for i in range(n(note_dur)):
            t = i / RATE
            out.append(wave_fn(2 * math.pi * f * t) * env(t, note_dur * decay, 0.004))
    return out


def soft_square(x):
    return math.tanh(3 * math.sin(x))


# Good: two quick rising notes.
write('good', tones([784, 1047], 0.09))

# Close call: a wobbly "phew".
dur = 0.35
write('close', [math.sin(2 * math.pi * (600 + 80 * math.sin(i / RATE * 40)) * i / RATE) * env(i / RATE, dur) for i in range(n(dur))])

# Fail: a descending buzz.
dur = 0.5
fail, phase = [], 0.0
for i in range(n(dur)):
    t = i / RATE
    phase += 2 * math.pi * (240 - 140 * t / dur) / RATE
    fail.append(soft_square(phase) * env(t, dur, 0.01))
write('fail', fail)

# Win: rising arpeggio with a held top note.
write('win', tones([523, 659, 784], 0.1, soft_square) + tones([1047], 0.45, soft_square))
print('ok')
