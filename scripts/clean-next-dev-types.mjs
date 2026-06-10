import { rmSync } from 'node:fs';
import { join } from 'node:path';

rmSync(join(process.cwd(), '.next', 'dev'), { recursive: true, force: true });
