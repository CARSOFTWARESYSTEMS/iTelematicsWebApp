import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

// Guards for the content rules of the Satellite Engineering redesign.
const SRC = path.resolve(import.meta.dirname);

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) return sourceFiles(full);
        return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
    });
}

const files = sourceFiles(SRC).map((file) => ({ file: path.relative(SRC, file), text: readFileSync(file, 'utf8') }));

function offenders(pattern: RegExp) {
    return files.filter(({ text }) => pattern.test(text)).map(({ file }) => file);
}

describe('site content rules', () => {
    it('never shows an individual’s name', () => {
        expect(offenders(/sudarshan/i)).toEqual([]);
    });

    it('has no Events & Registration links or routes', () => {
        expect(offenders(/Events &(amp;)? Registration|href=["'{`]\/events/)).toEqual([]);
    });

    it('does not name agencies or institutions that have no documented relationship', () => {
        expect(offenders(/\b(NASA|SpaceX|ISRO|IN-SPACe|IISc|IIST|IITs?|JAXA|ESA)\b/)).toEqual([]);
    });
});
