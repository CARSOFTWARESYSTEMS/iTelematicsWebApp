import { describe, expect, it } from 'vitest';
import { activeCue, cuesFor, phraseAt, type Cue } from './narrator';

const cue = (id: string, at: number, duration: number): Cue => ({
    id,
    at,
    duration,
    src: `/${id}.mp3`,
    phrases: [
        [0, 2, 'First phrase.'],
        [2.5, duration, 'Second phrase.'],
    ],
});

describe('Narration scheduling', () => {
    const cues = [cue('a', 1, 4), cue('b', 8, 5)];
    it('speaks the line whose window contains the clock, at the matching position', () => {
        expect(activeCue(cues, 0.5)).toBeNull();
        expect(activeCue(cues, 2)).toEqual({ cue: cues[0], offset: 1 });
        expect(activeCue(cues, 6)).toBeNull();
        expect(activeCue(cues, 9.5)?.cue.id).toBe('b');
        expect(activeCue(cues, 20)).toBeNull();
    });

    it('shows the phrase being spoken, holding it briefly after', () => {
        expect(phraseAt(cues[0], 0.1)).toBe('First phrase.');
        expect(phraseAt(cues[0], 2.4)).toBe('First phrase.');
        expect(phraseAt(cues[0], 3)).toBe('Second phrase.');
        expect(phraseAt(cues[0], 6)).toBeNull();
    });

    it('finds the lines of each programme in order', () => {
        const ascent = cuesFor('chapter:ascent');
        expect(ascent.length).toBeGreaterThanOrEqual(3);
        for (let i = 1; i < ascent.length; i++) expect(ascent[i].at).toBeGreaterThan(ascent[i - 1].at);
        expect(cuesFor('topic:j-assist')).toHaveLength(1);
        expect(cuesFor(null)).toEqual([]);
    });
});
