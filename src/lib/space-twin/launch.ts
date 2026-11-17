/**
 * Shareable Space Digital Twin links: `/?space_digital_twin=1…6` opens one experience of the viewer,
 * with launch options. Pure parsing only: the URL is read once and never written.
 */

/** The fifth and sixth options: separate experiences beside the four story experiences. */
export type Extra = 'eps' | 'solar';
export const EXTRA_TABS: readonly { id: Extra; number: string; label: string; title: string }[] = [
    { id: 'eps', number: '05', label: 'Station Power & Energy', title: 'Space Station Electrical Power & Energy Management Digital Twin' },
    { id: 'solar', number: '06', label: 'Solar System', title: 'Solar System — From Earth Launch to Deep Space Exploration' },
];

/** Only the Solar System has sound, voice narration and subtitles; the other options are silent. */
export const NARRATED: readonly string[] = ['solar'];

/** Options a link may set. Each applies to that visit only, and only until the visitor changes it. */
export interface LaunchSettings {
    fullscreen: boolean;
    sound: boolean;
    voice: boolean;
    captions: boolean;
    /** 0–100 (percent of the normal level). */
    volume: number;
    autoplay: boolean;
    /** Plays every stage in sequence (off: the first stage, then the visitor chooses). */
    autonext: boolean;
}

export const PARAM = 'space_digital_twin';

/** `1`/`0` set an option; anything else (missing, malformed, repeated) keeps the link default, on. */
function flag(params: URLSearchParams, name: string) {
    const values = params.getAll(name);
    return !(values.length === 1 && values[0] === '0');
}

function volume(params: URLSearchParams) {
    const values = params.getAll('volume');
    if (values.length !== 1 || !/^\d{1,3}(\.\d+)?$/.test(values[0])) return 100;
    const v = Number(values[0]);
    return v <= 100 ? v : 100;
}

/**
 * The experience a link selects (matched by its number in the viewer's registry) and the launch options,
 * or null when the link is absent or invalid: the page then behaves exactly as without it.
 */
export function parseSpaceLaunch<T extends string>(search: string, registry: readonly { id: T; number: string }[]): (LaunchSettings & { id: T }) | null {
    const params = new URLSearchParams(search);
    const ids = params.getAll(PARAM);
    if (ids.length !== 1 || !/^\d{1,2}$/.test(ids[0])) return null;
    const option = registry.find((entry) => Number(entry.number) === Number(ids[0]));
    if (!option) return null;
    return {
        id: option.id,
        fullscreen: flag(params, 'fullscreen'),
        sound: flag(params, 'sound'),
        voice: flag(params, 'voice'),
        captions: flag(params, 'captions'),
        volume: volume(params),
        autoplay: flag(params, 'autoplay'),
        autonext: flag(params, 'autonext'),
    };
}
