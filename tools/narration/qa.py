"""
Listening check for the generated narration: transcribes every line back to text (faster-whisper small.en)
and reports the word error rate against the script, worst first. Needs: pip install faster-whisper jiwer librosa.
Run from the repository root: python tools/narration/qa.py
"""
import json, os, re, sys
import jiwer, librosa
from faster_whisper import WhisperModel
from num2words import num2words

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
script = json.load(open(os.path.join(os.path.dirname(__file__), 'script.json')))
manifest = json.load(open(os.path.join(ROOT, 'src', 'lib', 'solar-system', 'narration-manifest.json')))['cues']
asr = WhisperModel('small.en', device='cpu', compute_type='int8')


def norm(s: str) -> str:
    s = s.lower().replace('kilometres', 'kilometers').replace('metres', 'meters').replace('centre', 'center').replace('’', "'")
    s = re.sub(r'(\d),(\d)', r'\1\2', s)
    s = re.sub(r'(\d+)\.(\d+)', lambda m: num2words(int(m.group(1))) + ' point ' + ' '.join(num2words(int(d)) for d in m.group(2)), s)
    s = re.sub(r'\d+', lambda m: num2words(int(m.group(0))), s)
    s = re.sub(r"[^a-z' ]+", ' ', s.replace('-', ' ')).replace(' and ', ' ').replace("'s", 's')
    return re.sub(r'\s+', ' ', s).strip()


rows = []
for line in script:
    y, _ = librosa.load(os.path.join(ROOT, 'public', manifest[line['id']]['src'].lstrip('/')), sr=16000)
    hyp = ' '.join(s.text for s in asr.transcribe(y, language='en', beam_size=5)[0]).strip()
    rows.append((jiwer.wer(norm(line['text']), norm(hyp)), line['id'], line['text'], hyp))
rows.sort(reverse=True)
for w, i, t, h in rows[: int(sys.argv[1]) if len(sys.argv) > 1 else 15]:
    print(f'{100 * w:5.1f} %  {i}\n   said: {t}\n  heard: {h}')
print(f'mean word error {100 * sum(r[0] for r in rows) / len(rows):.1f} % over {len(rows)} lines; {sum(r[0] > 0.1 for r in rows)} above 10 %')
