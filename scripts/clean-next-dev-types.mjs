import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const cwd = process.cwd();

rmSync(join(cwd, '.next', 'dev'), { recursive: true, force: true });

const tsconfigPath = join(cwd, 'tsconfig.json');
const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
if (Array.isArray(tsconfig.include)) {
  tsconfig.include = tsconfig.include.filter((entry) => entry !== '.next/dev/types/**/*.ts');
  writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
}
