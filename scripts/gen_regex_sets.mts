import { promises as fs } from 'fs';
import * as path from 'path';

const rootDir = path.resolve(import.meta.dirname, '..');
const nodeModules = path.resolve(rootDir, 'node_modules');
const unicodeDir = path.resolve(nodeModules, '@unicode', 'unicode-16.0.0');
const outFile = path.resolve(rootDir, 'src', 'data-gen.json');

async function* scan(d: string): AsyncGenerator<string, void, void> {
  for await (const dirent of await fs.opendir(d)) {
    if (dirent.isDirectory()) {
      const p = path.join(d, dirent.name);
      const test = path.join(p, 'code-points.js');
      try {
        await fs.stat(test);
        yield p;
      } catch {
        yield* scan(p);
      }
    }
  }
}

type Range = readonly [from: number, to: number];

const data: Record<string, readonly Range[]> = {};

for await (const item of scan(unicodeDir)) {
  const category = path.relative(unicodeDir, item).replace(/\\/g, '/');
  const { default: cps } = await import(`@unicode/unicode-16.0.0/${category}/code-points.js`);
  if (!Array.isArray(cps)) {
    continue;
  }
  const ranges: Range[] = [];
  let from = 0;
  let to = 0;
  cps.forEach((cp, i) => {
    if (i === 0) {
      from = cp;
      to = cp;
    } else {
      if (to + 1 === cp) {
        to += 1;
      } else {
        ranges.push([from, to]);
        from = cp;
        to = cp;
      }
    }
  });
  ranges.push([from, to]);
  data[category] = ranges;
}

await fs.writeFile(outFile, JSON.stringify(data));
