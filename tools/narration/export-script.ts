// Writes the narration script (lib/solar-system/narration.ts, numbers from the models) to script.json for
// generate.py. Run: npx tsx tools/narration/export-script.ts
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { narrationScript } from '../../src/lib/solar-system/narration';

const here = dirname(fileURLToPath(import.meta.url));
const lines = narrationScript();
writeFileSync(join(here, 'script.json'), JSON.stringify(lines, null, 1) + '\n');
console.log(`${lines.length} lines, ${lines.reduce((a, l) => a + l.text.split(/\s+/).length, 0)} words → tools/narration/script.json`);
