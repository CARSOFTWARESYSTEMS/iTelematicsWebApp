import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

// Guards for the content rules of the Satellite Engineering redesign.
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

function offenders(pattern: RegExp) {
    return files.filter(({ text }) => pattern.test(text)).map(({ file }) => file);
}

describe('site content rules', () => {
    it('never shows an individual’s name', () => {
        expect(offenders(/sudarshan|karkala/i)).toEqual([]);
    });

    it('publishes no file whose name carries an individual’s name', () => {
        const published = allFiles(path.resolve(SRC, '../public')).map((f) => path.relative(path.resolve(SRC, '..'), f));
        expect(published.filter((f) => /sudarshan|karkala/i.test(f))).toEqual([]);
    });

    it('positions the company as Satellite Engineering, never as a training provider', () => {
        expect(offenders(/Satellite Engineering R&(amp;)?D/i)).toEqual([]);
        expect(offenders(/\btraining\b|intern-driven|learn by doing|engineers in training/i)).toEqual([]);
        const llms = readFileSync(path.resolve(SRC, '../public/llms.txt'), 'utf8');
        expect(llms).not.toMatch(/Satellite Engineering R&D|\btraining\b|intern-driven/i);
    });

    it('uses one name for each CTA', () => {
        expect(offenders(/Join (Satellite )?R&amp;D|Join Research|Explore R&amp;D/)).toEqual([]);
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
