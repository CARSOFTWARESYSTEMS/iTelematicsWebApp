// The existing standalone experience tabs, shared with the homepage's launch validation.
export type Extra = 'eps' | 'solar';
export const EXTRA_TABS: readonly { id: Extra; number: string; label: string; title: string }[] = [
    { id: 'eps', number: '05', label: 'Station Power & Energy', title: 'Space Station Electrical Power & Energy Management Digital Twin' },
    { id: 'solar', number: '06', label: 'Solar System', title: 'Solar System — From Earth Launch to Deep Space Exploration' },
];

/** Launch-only URL preferences. No storage or history changes. */
export interface LaunchSettings {
    fullscreen: boolean;
    sound: boolean;
    voice: boolean;
    captions: boolean;
    volume: number;
    autoplay: boolean;
    autonext: boolean;
}

export function parseSpaceLaunch<T extends string>(search: string, registry: readonly { id: T; number: string }[]): (LaunchSettings & { id: T }) | null {
    const params = new URLSearchParams(search);
    const ids = params.getAll('space_digital_twin');
    if (ids.length !== 1 || !/^[1-9]\d*$/.test(ids[0])) return null;
    const experience = registry.find((entry) => Number(entry.number) === Number(ids[0]));
    if (!experience) return null;
    const flag = (name: string) => params.getAll(name).length === 1 && params.get(name) === '0' ? false : true;
    const rawVolume = params.get('volume') ?? '';
    const volume = params.getAll('volume').length === 1 && /^\d+(\.\d+)?$/.test(rawVolume) && Number(rawVolume) <= 100 ? Number(rawVolume) : 100;
    return { id: experience.id, fullscreen: flag('fullscreen'), sound: flag('sound'), voice: flag('voice'), captions: flag('captions'), autoplay: flag('autoplay'), autonext: flag('autonext'), volume };
}
