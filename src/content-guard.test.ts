import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

// Guards for the site's content rules: the Satellite Engineering redesign, and since 2026-11-14 the
// Space Station Digital Twin R&D positioning.
const SRC = path.resolve(import.meta.dirname);

function allFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        return statSync(full).isDirectory() ? allFiles(full) : [full];
    });
}

function sourceFiles(dir: string): string[] {
    return allFiles(dir).filter((file) => /\.(tsx?|css)$/.test(file) && !/\.test\.tsx?$/.test(file));
}

const files = sourceFiles(SRC).map((file) => ({ file: path.relative(SRC, file), text: readFileSync(file, 'utf8') }));

function offenders(pattern: RegExp, except: string[] = []) {
    return files.filter(({ file, text }) => !except.includes(file) && pattern.test(text)).map(({ file }) => file);
}

// The EV.ENGINEER™ page (/ev-engineer) introduces the person behind EV.ENGINEER™ and links the
// "Training & Internship" programme (instruction, 2026-10-25). Both live in this one content file.
const EV_ENGINEER_CONTENT = path.join('lib', 'ev-engineer.ts');
const PERSONAL_NAME = /sudarshan|karkala/i;

describe('site content rules', () => {
    it('names an individual only in the EV.ENGINEER™ page content', () => {
        expect(offenders(PERSONAL_NAME, [EV_ENGINEER_CONTENT])).toEqual([]);
        expect(offenders(PERSONAL_NAME)).toEqual([EV_ENGINEER_CONTENT]);
    });

    it('publishes no file whose name carries an individual’s name', () => {
        const published = allFiles(path.resolve(SRC, '../public')).map((f) => path.relative(path.resolve(SRC, '..'), f));
        expect(published.filter((f) => /sudarshan|karkala/i.test(f))).toEqual([]);
    });

    it('never says "Satellite Engineering R&D" and never positions the company as a training provider', () => {
        expect(offenders(/Satellite Engineering R&(amp;)?D/i)).toEqual([]);
        expect(offenders(/\btraining\b|intern-driven|learn by doing|engineers in training/i, [EV_ENGINEER_CONTENT])).toEqual([]);
        const llms = readFileSync(path.resolve(SRC, '../public/llms.txt'), 'utf8');
        expect(llms).not.toMatch(/Satellite Engineering R&D|\btraining\b|intern-driven/i);
    });

    it('uses one name for each CTA', () => {
        expect(offenders(/Join (Satellite )?R&amp;D|Join Research|Explore R&amp;D/)).toEqual([]);
    });

    // Internships became the Satellite Engineering Research Lab (instruction, 2026-11-14). Technical
    // identifiers (the "internship" enquiry value, internship_* analytics events) keep their names;
    // EV.ENGINEER™'s own programme names on /ev-engineer are its destinations and stay as they are.
    it('presents the Research Lab, not internships', () => {
        expect(offenders(/\bInternships?\b|Career-Focused|Apply \/ Discuss|Explore Internships/, [EV_ENGINEER_CONTENT])).toEqual([]);
        expect(offenders(/href=["'{`]\/internships/)).toEqual([]);
        const llms = readFileSync(path.resolve(SRC, '../public/llms.txt'), 'utf8');
        expect(llms).not.toMatch(/internship|career-focused/i);
    });

    // About was retired and the Research Platform moved into the Research Lab (instruction, 2026-11-14);
    // both old URLs redirect. ("research-platform" stays as the contact form's enquiry value.)
    it('links no retired page', () => {
        expect(offenders(/["'`]\/(about|research-platform)(?=["'`#?/])/)).toEqual([]);
        const llms = readFileSync(path.resolve(SRC, '../public/llms.txt'), 'utf8');
        expect(llms).not.toMatch(/itelematics\.com\/(about|research-platform)\b/);
    });

    // /satellite-engineering became /space-station (instruction, 2026-11-14) and 301s there. The
    // analytics rules still match the old path on purpose, so old links keep their event.
    it('links /space-station, not the retired /satellite-engineering page', () => {
        expect(offenders(/["'`]\/satellite-engineering(?=["'`#?/])/, [path.join('lib', 'analytics', 'taxonomy.ts')])).toEqual([]);
        const llms = readFileSync(path.resolve(SRC, '../public/llms.txt'), 'utf8');
        expect(llms).not.toMatch(/itelematics\.com\/satellite-engineering\b/);
        expect(llms).toMatch(/itelematics\.com\/space-station\b/);
    });

    // The Space Station Digital Twin R&D content is country-neutral and names no station programme.
    it('keeps the space station content country-neutral and free of named programmes', () => {
        const station = files.filter(({ file }) => file.startsWith(path.join('components', 'station-twin')) || file.startsWith(path.join('lib', 'station-twin')) || file.startsWith(path.join('app', 'space-station')) || file === path.join('lib', 'space-station.ts'));
        expect(station.length).toBeGreaterThan(5);
        const named = /\bISS\b|International Space Station|Tiangong|Bharatiya|Gateway|Axiom|Mir\b|Skylab|ISHAVASYAM|Gamyaa|APEX|UFlight|iFab|NASA|ESA\b|ISRO|JAXA|Roscosmos|CNSA|SpaceX|Boeing|Airbus|India|Indian/;
        expect(station.filter(({ text }) => named.test(text)).map(({ file }) => file)).toEqual([]);
    });

    it('keeps llms-full.txt to the same content rules as the site', () => {
        const full = readFileSync(path.resolve(SRC, '../public/llms-full.txt'), 'utf8');
        expect(full).not.toMatch(/Satellite Engineering R&D|\btraining\b|internship|intern-driven|career-focused/i);
        expect(full).not.toMatch(/itelematics\.com\/(about|research-platform|satellite-engineering)\b/);
        expect(full).not.toMatch(PERSONAL_NAME);
        expect(full).not.toMatch(/\b(NASA|SpaceX|ISRO|JAXA|ESA|ISS)\b|International Space Station/);
    });

    it('makes no unverified promotional claims', () => {
        expect(offenders(/world[’']s first|flight[- ]proven|mission[- ]certified|fully autonomous|human[- ]rated/i)).toEqual([]);
    });

    it('names no other organisation inside the Space Digital Twin experiences', () => {
        const twin = files.filter(({ file }) => file.startsWith(path.join('components', 'space-twin')) || file.startsWith(path.join('lib', 'space-twin')));
        expect(twin.length).toBeGreaterThan(5);
        const brands = /ISHAVASYAM|Gamyaa|GAMYAA|APEX|UFlight|iFab|EV Society|EV\.ENGINEER|AutonomousEV|NASA|ESA\b|ISRO|SpaceX|Starlink|Boeing|Airbus|\bISS\b|International Space Station/;
        expect(twin.filter(({ text }) => brands.test(text)).map(({ file }) => file)).toEqual([]);
    });

    it('never links the retired APEX ecosystem URL', () => {
        expect(offenders(/apexrocketsystems\/ecosystem/)).toEqual([]);
    });

    it('has no Events & Registration links or routes', () => {
        expect(offenders(/Events &(amp;)? Registration|href=["'{`]\/events/)).toEqual([]);
    });

    it('does not name agencies or institutions that have no documented relationship', () => {
        expect(offenders(/\b(NASA|SpaceX|ISRO|IN-SPACe|IISc|IIST|IITs?|JAXA|ESA)\b/)).toEqual([]);
    });
});
