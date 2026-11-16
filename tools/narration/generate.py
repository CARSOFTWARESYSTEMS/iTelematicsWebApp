"""
Generates the Solar System narration once, locally: one MP3 per script line (Kokoro-82M, voice hf_alpha,
speed 0.9), loudness-normalised to -16 LUFS, with phrase-level subtitle timings measured during
generation. Writes public/audio/solar-system/narration/<id>.mp3 and src/lib/solar-system/narration-manifest.json.

Unchanged lines (same text, voice, speed and pronunciation rules) are skipped.
Run from the repository root: python tools/narration/generate.py  (see README.md for setup)
"""
import hashlib, json, os, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(__file__))
from speech import speak  # noqa: E402

VOICE, SPEED, SR, LUFS = 'hf_alpha', 0.9, 24000, -16.0
AUDIO_DIR = os.path.join(ROOT, 'public', 'audio', 'solar-system', 'narration')
MANIFEST = os.path.join(ROOT, 'src', 'lib', 'solar-system', 'narration-manifest.json')
# Generation rules version: part of every line's cache key, with the pronunciation rules.
GEN_VERSION = b'phrases-v2'
RULES = open(os.path.join(os.path.dirname(__file__), 'speech.py'), 'rb').read() + GEN_VERSION


def phrases(text: str) -> list[str]:
    """
    Subtitle phrases: sentences, split again at a comma when longer than 14 words. A sentence under four
    words ("Saturn.", "Cutoff.") is joined to the next: generated alone, its prosody is unstable.
    """
    out = []
    pending = ''
    for sentence in re.split(r'(?<=[.!?;:])\s+', text.strip()):
        if pending:
            sentence = f'{pending} {sentence}'
            pending = ''
        if len(sentence.split()) < 4:
            pending = sentence
            continue
        words = sentence.split()
        if len(words) > 14 and ', ' in sentence:
            cut = min((m.end() for m in re.finditer(r', ', sentence)), key=lambda e: abs(e - len(sentence) / 2))
            out += [sentence[:cut].strip(), sentence[cut:].strip()]
        else:
            out.append(sentence)
    if pending:
        if out:
            out[-1] = f'{out[-1]} {pending}'
        else:
            out.append(pending)
    return [p for p in out if p]


def pause_after(phrase: str) -> float:
    return 0.5 if phrase.endswith(('.', '!', '?')) else 0.32 if phrase.endswith((':', ';')) else 0.22


def trim(a: np.ndarray) -> np.ndarray:
    idx = np.where(np.abs(a) > 0.012 * np.max(np.abs(a)))[0]
    # Generous lead-in: soft opening consonants (s, th, c) sit below the threshold.
    return a[max(0, idx[0] - int(0.08 * SR)): idx[-1] + int(0.06 * SR)] if len(idx) else a


def main():
    script = json.load(open(os.path.join(os.path.dirname(__file__), 'script.json')))
    manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {'cues': {}}
    os.makedirs(AUDIO_DIR, exist_ok=True)
    todo = []
    for line in script:
        h = hashlib.sha1(json.dumps([line['text'], VOICE, SPEED, LUFS]).encode() + RULES).hexdigest()[:16]
        prev = manifest['cues'].get(line['id'])
        if prev and prev.get('hash') == h and os.path.exists(os.path.join(AUDIO_DIR, line['id'] + '.mp3')):
            continue
        todo.append((line, h))
    print(f'{len(script)} lines, {len(todo)} to generate', flush=True)
    if todo:
        # Kokoro's English fallback uses espeak-ng; the pip-bundled build cannot find its data on macOS.
        import misaki.espeak  # noqa: F401
        from phonemizer.backend.espeak.wrapper import EspeakWrapper
        EspeakWrapper.set_library('/opt/homebrew/lib/libespeak-ng.dylib')
        EspeakWrapper.set_data_path('/opt/homebrew/share/espeak-ng-data')
        from kokoro import KPipeline
        import pyloudnorm as pyln
        pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
        meter = pyln.Meter(SR)
    for line, h in todo:
        parts, timing, t = [], [], 0.0
        ps = phrases(line['text'])
        for i, p in enumerate(ps):
            a = trim(np.concatenate([x.numpy() for _, _, x in pipe(speak(p), voice=VOICE, speed=SPEED)]).astype(np.float32))
            timing.append([round(t, 2), round(t + len(a) / SR, 2), p])
            parts.append(a)
            t += len(a) / SR
            if i < len(ps) - 1:
                gap = pause_after(p)
                parts.append(np.zeros(int(gap * SR), np.float32))
                t += gap
        y = np.concatenate(parts)
        y = y * 10 ** ((LUFS - meter.integrated_loudness(y)) / 20)
        y *= min(1.0, 0.84 / np.max(np.abs(y)))  # peaks under -1.5 dBFS
        with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
            sf.write(tmp.name, y, SR, subtype='PCM_16')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '48k', os.path.join(AUDIO_DIR, line['id'] + '.mp3')], check=True)
        manifest['cues'][line['id']] = {'src': f"/audio/solar-system/narration/{line['id']}.mp3", 'duration': round(len(y) / SR, 2), 'phrases': timing, 'hash': h}
        print(f"{line['id']}: {len(y) / SR:.1f} s", flush=True)
    ids = {l['id'] for l in script}
    manifest['cues'] = {k: v for k, v in sorted(manifest['cues'].items()) if k in ids}
    manifest.update({'model': 'Kokoro-82M (Apache-2.0)', 'voice': VOICE, 'speed': SPEED, 'lufs': LUFS})
    json.dump(manifest, open(MANIFEST, 'w'), indent=1, ensure_ascii=False)
    open(MANIFEST, 'a').write('\n')


if __name__ == '__main__':
    main()
