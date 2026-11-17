import { describe, expect, it } from 'vitest';
import { EXPERIENCES } from './experiences';
import { EXTRA_TABS, parseSpaceLaunch } from './launch';

const registry = [...EXPERIENCES, ...EXTRA_TABS];
describe('Space launch URLs', () => {
    it.each(['satellite', 'constellation', 'spacecraft', 'station', 'eps', 'solar'])('selects %s with launch defaults', (id) => {
        expect(parseSpaceLaunch(`?space_digital_twin=${registry.findIndex((e) => e.id === id) + 1}`, registry)).toEqual({
            id, fullscreen: true, sound: true, voice: true, captions: true, volume: 100, autoplay: true, autonext: true,
        });
    });
    it.each(['', '0', '7', '-1', '1.5', '6x', '06', '1e0', '%20', 'Infinity', '6&space_digital_twin=1'])('ignores invalid experience %s', (id) => {
        expect(parseSpaceLaunch(`?space_digital_twin=${id}`, registry)).toBeNull();
    });
    it('ignores options without a valid experience and validates against the supplied registry', () => {
        expect(parseSpaceLaunch('?sound=1&fullscreen=1', registry)).toBeNull();
        expect(parseSpaceLaunch('?space_digital_twin=6', EXPERIENCES)).toBeNull();
    });
    it('accepts all explicit overrides', () => {
        expect(parseSpaceLaunch('?space_digital_twin=6&fullscreen=0&sound=0&voice=0&captions=0&volume=23.5&autoplay=0&autonext=0&utm_source=share', registry)).toEqual({
            id: 'solar', fullscreen: false, sound: false, voice: false, captions: false, volume: 23.5, autoplay: false, autonext: false,
        });
    });
    it.each(['-1', '101', 'NaN', '1e2', '', '30&volume=40'])('uses default volume for malformed value %s', (value) => {
        expect(parseSpaceLaunch(`?space_digital_twin=6&volume=${value}&sound=no&voice=2`, registry)).toMatchObject({ volume: 100, sound: true, voice: true });
    });
    it('accepts zero volume', () => {
        expect(parseSpaceLaunch('?space_digital_twin=6&volume=0', registry)?.volume).toBe(0);
    });
    it.each(['no', '', '0&autonext=1'])('defaults malformed or duplicate autonext=%s to on', (value) => {
        expect(parseSpaceLaunch(`?space_digital_twin=6&autonext=${value}`, registry)?.autonext).toBe(true);
    });
});
