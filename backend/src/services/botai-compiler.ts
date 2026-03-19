import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const MAX_FILE_SIZE = 500 * 1024; // 500KB

const DANGEROUS_MODULES = [
  'fs',
  'child_process',
  'net',
  'http',
  'https',
  'dgram',
  'cluster',
  'worker_threads',
  'vm',
  'os',
  'dns',
  'tls',
  'readline',
];

const DANGEROUS_IMPORT_PATTERNS = DANGEROUS_MODULES.flatMap((mod) => [
  new RegExp(`require\\s*\\(\\s*['"\`]${mod}['"\`]\\s*\\)`, 'g'),
  new RegExp(`from\\s+['"\`]${mod}['"\`]`, 'g'),
  new RegExp(`from\\s+['"\`]node:${mod}['"\`]`, 'g'),
  new RegExp(`require\\s*\\(\\s*['"\`]node:${mod}['"\`]\\s*\\)`, 'g'),
]);

export interface CompileResult {
  success: boolean;
  compiledCode?: string;
  errors: string[];
}

export async function compileBotAI(source: string): Promise<CompileResult> {
  const errors: string[] = [];

  // 1. File size check
  if (Buffer.byteLength(source) > MAX_FILE_SIZE) {
    return { success: false, errors: [`Source file exceeds maximum size of ${MAX_FILE_SIZE / 1024}KB`] };
  }

  // 2. Dangerous import scan
  for (const pattern of DANGEROUS_IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(source);
    if (match) {
      errors.push(`Forbidden import detected: ${match[0]}`);
    }
  }
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // 3. esbuild transpilation
  let compiledCode: string;
  try {
    const result = await esbuild.build({
      stdin: {
        contents: source,
        loader: 'ts',
        resolveDir: process.cwd(),
      },
      bundle: false,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      write: false,
    });

    if (result.errors.length > 0) {
      return {
        success: false,
        errors: result.errors.map((e) => `${e.text} (line ${e.location?.line ?? '?'})`),
      };
    }

    compiledCode = result.outputFiles![0].text;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [`TypeScript compilation failed: ${msg}`] };
  }

  // 4. Structure validation — write temp file, require it, check exports
  const tmpDir = path.join(process.cwd(), 'ai', '.tmp');
  const tmpFile = path.join(tmpDir, `validate_${Date.now()}.js`);
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(tmpFile, compiledCode);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(tmpFile);

    // Find the exported class — check default export, then named exports
    let AIClass: unknown = mod.default || mod;
    if (typeof AIClass === 'object' && AIClass !== null) {
      // Look for a class in named exports
      const exports = Object.values(mod);
      AIClass = exports.find(
        (v) => typeof v === 'function' && v.prototype && typeof v.prototype.generateInput === 'function',
      );
    }

    if (!AIClass || typeof AIClass !== 'function') {
      return {
        success: false,
        errors: ['No exported class found. The module must export a class (default or named).'],
      };
    }

    if (typeof (AIClass as { prototype: Record<string, unknown> }).prototype.generateInput !== 'function') {
      return {
        success: false,
        errors: [
          'Exported class does not have a generateInput() method. ' +
            'The class must implement: generateInput(player, state, logger?): PlayerInput | null',
        ],
      };
    }

    // Try instantiation
    try {
      const Constructor = AIClass as new (difficulty: string) => unknown;
      const instance = new Constructor('normal');
      if (typeof (instance as Record<string, unknown>).generateInput !== 'function') {
        return {
          success: false,
          errors: ['Instantiated class does not have a generateInput method on the instance.'],
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        errors: [`Class instantiation failed with difficulty="normal": ${msg}`],
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [`Structure validation failed: ${msg}`] };
  } finally {
    // Cleanup temp file
    try {
      delete require.cache[require.resolve(tmpFile)];
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }
  }

  logger.info('Bot AI compilation and validation successful');
  return { success: true, compiledCode, errors: [] };
}
