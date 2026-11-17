import { describe, expect, it } from 'vitest';
import { EXPERIENCES } from './experiences';
import { EXTRA_TABS, parseSpaceLaunch } from './launch';

const registry = [...EXPERIENCES, ...EXTRA_TABS];
const DEFAULTS = { fullscreen: true, sound: true, voice: true, captions: true, volume: 100, autoplay: true, autonext: true };

describe('shareable Space Digital Twin links', () => {
    it('numbers the options as the tabs do', () => {
        expect(registry.map((o) => [o.number, o.label])).toEqual([
            ['01', 'Satellite'],
            ['02', 'Orbital Constellation'],
            ['03', 'Spacecraft'],
            ['04', 'Space Station'],
            ['05', 'Station Power & Energy'],
            ['06', 'Solar System'],
        ]);
    });

    it.each([
        ['1', 'satellite'],
        ['2', 'constellation'],
        ['3', 'spacecraft'],
        ['4', 'station'],
        ['5', 'eps'],
        ['6', 'solar'],
        ['06', 'solar'],
    ])('space_digital_twin=%s opens %s with every link default on', (n, id) => {
        expect(parseSpaceLaunch(`?space_digital_twin=${n}`, registry)).toEqual({ id, ...DEFAULTS });
    });

    it.each(['', '0', '7', '-1', '1.5', '6x', '006', '1e0', '%20', 'Infinity', 'solar', '6&space_digital_twin=1'])('ignores space_digital_twin=%s', (n) => {
        expect(parseSpaceLaunch(`?space_digital_twin=${n}`, registry)).toBeNull();
    });

    it('ignores options without a valid experience, and validates against the registry it is given', () => {
        expect(parseSpaceLaunch('', registry)).toBeNull();
        expect(parseSpaceLaunch('?sound=1&fullscreen=1', registry)).toBeNull();
        expect(parseSpaceLaunch('?space_digital_twin=6', EXPERIENCES)).toBeNull();
    });

    it('applies every override and keeps unrelated parameters out of it', () => {
        expect(parseSpaceLaunch('?utm_source=share&space_digital_twin=6&fullscreen=0&sound=0&voice=0&captions=0&volume=23.5&autoplay=0&autonext=0', registry)).toEqual({
            id: 'solar',
            fullscreen: false,
            sound: false,
            voice: false,
            captions: false,
            volume: 23.5,
            autoplay: false,
            autonext: false,
        });
    });

    it.each(['-1', '101', '1000', 'NaN', '1e2', '', 'loud', '30&volume=40'])('keeps volume 100 for volume=%s', (value) => {
        expect(parseSpaceLaunch(`?space_digital_twin=6&volume=${value}`, registry)?.volume).toBe(100);
    });

    it('accepts volume 0 and 100', () => {
        expect(parseSpaceLaunch('?space_digital_twin=6&volume=0', registry)?.volume).toBe(0);
        expect(parseSpaceLaunch('?space_digital_twin=6&volume=100', registry)?.volume).toBe(100);
    });

    it.each(['no', 'off', 'false', '', '2', '0&autonext=1'])('keeps the default (on) for a malformed or repeated value autonext=%s', (value) => {
        expect(parseSpaceLaunch(`?space_digital_twin=6&autonext=${value}`, registry)?.autonext).toBe(true);
    });
});
