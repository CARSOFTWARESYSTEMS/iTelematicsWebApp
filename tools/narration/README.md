# Solar System narration tools

Voice narration for the Solar System experience (Space Digital Twin option 06) is generated **once, locally**,
and served as static audio files. Nothing calls a speech service while a visitor plays the mission.

- **Voice:** Kokoro-82M (`hexgrad/Kokoro-82M`, Apache-2.0), voice `hf_alpha` (Indian-English, female), speed 0.9.
  Chosen on 16 November 2026 after comparing Kokoro, Pocket TTS, KittenTTS, MeloTTS and OpenVoice V2 with
  machine listening (speech recognition back to text, loudness, noise, pitch, pause and consistency
  measures). No attribution is required for the generated audio.
- **`speech.py`:** turns caption text into the text the voice speaks. Numbers become words, mission codes are
  spelled out (RSC-1 → "R S C one"), "AU" becomes "astronomical units", and words the voice gets wrong are
  respelled. Every entry was checked by generating it in a sentence and transcribing it back. Most technical
  terms needed nothing: hydrazine, Oberth, periapsis, the Galilean moons, radioisotope thermoelectric.
- **Script style:** write "launch pad", not "pad" alone (heard as "path" in this accent).

Setup: `python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt` and `brew install espeak-ng`.

## Regenerating

1. `npx tsx tools/narration/export-script.ts` writes `script.json` from `src/lib/solar-system/narration.ts`.
2. `python tools/narration/generate.py` regenerates only the lines whose text or rules changed: MP3s in
   `public/audio/solar-system/narration/`, timings in `src/lib/solar-system/narration-manifest.json`.
3. `python tools/narration/qa.py` transcribes every line back and lists the worst word errors (needs
   `faster-whisper jiwer librosa`).
4. `npx vitest run src/lib/solar-system/narration.test.ts` checks coverage and that every line fits its scene.

The player (`src/components/solar-system/narrator.ts`) and its behaviour are documented in docs/SOLAR_SYSTEM.md,
section "Voice narration".
