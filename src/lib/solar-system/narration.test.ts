import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from './narration-manifest.json';
import { narrationScript } from './narration';
import { storySeconds } from './mission';
import { journey } from './phaseB';

const cues = (manifest as unknown as { cues: Record<string, { src: string; duration: number; phrases: [number, number, string][] }> }).cues;
const lines = narrationScript();
const { chapters } = journey();

describe('Voice narration', () => {
    it('narrates every chapter and every topic, with generated audio for every line', () => {
        for (const c of chapters) {
            expect(lines.filter((l) => l.program === `chapter:${c.id}`).length, c.id).toBeGreaterThanOrEqual(2);
            for (const l of c.labels)
                expect(
                    lines.some((x) => x.program === `topic:${l.id}`),
                    l.id,
                ).toBe(true);
        }
        expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
        for (const l of lines) {
            const c = cues[l.id];
            expect(c, `${l.id} has audio (run tools/narration/generate.py)`).toBeDefined();
            expect(c.duration).toBeGreaterThan(1);
            expect(existsSync(join(process.cwd(), 'public', c.src))).toBe(true);
            // The subtitles are the script, phrase by phrase.
            expect(c.phrases.map((p) => p[2]).join(' ')).toBe(l.text.replace(/\s+/g, ' ').trim());
            expect(l.text).not.toMatch(/NaN|undefined|Infinity/);
        }
    });

    it('fits each chapter line before the next one and within its scene', () => {
        for (const c of chapters) {
            const ls = lines.filter((l) => l.program === `chapter:${c.id}`).sort((a, b) => a.at - b.at);
            const total = storySeconds(c.segments);
            ls.forEach((l, i) => {
                const end = l.at + cues[l.id].duration;
                const next = i + 1 < ls.length ? ls[i + 1].at : total;
                expect(end, `${l.id} ends before ${i + 1 < ls.length ? ls[i + 1].id : 'the end of the chapter'}`).toBeLessThanOrEqual(next + (i + 1 < ls.length ? 0.15 : 1));
            });
        }
    });

    it('keeps each topic explanation to a length its scene can carry (at most four times its animation)', () => {
        for (const c of chapters)
            for (const l of c.labels) {
                const line = lines.find((x) => x.program === `topic:${l.id}`)!;
                expect(line.at + cues[line.id].duration + 1.5, l.id).toBeLessThanOrEqual(4 * storySeconds(l.segments) + 0.01);
            }
    });
});
