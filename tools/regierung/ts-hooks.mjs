/**
 * Lädt TypeScript-Dateien aus app/src direkt in Node – damit das Build-Skript DIESELBE
 * Auswertungslogik wie App und Tests verwendet (keine Kopie).
 *
 * - löst den Pfad-Alias „@/…“ (tsconfig) nach app/src/… auf,
 * - ergänzt fehlende Endungen (.ts, .tsx, /index.ts),
 * - übersetzt .ts mit dem TypeScript-Compiler aus app/node_modules (nur Syntax, keine Typprüfung).
 *
 * Nutzung: `import { registerTsHooks } from './ts-hooks.mjs'; registerTsHooks();`
 */
import fs from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_DIR = path.resolve(here, '../../app');
const SRC_DIR = path.join(APP_DIR, 'src');
const requireFromApp = createRequire(path.join(APP_DIR, 'package.json'));

const EXTENSIONS = ['.ts', '.tsx', '/index.ts'];

function existingFile(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function registerTsHooks() {
  const ts = requireFromApp('typescript');
  registerHooks({
    resolve(specifier, context, nextResolve) {
      let base = null;
      if (specifier.startsWith('@/')) base = path.join(SRC_DIR, specifier.slice(2));
      else if (
        (specifier.startsWith('./') || specifier.startsWith('../')) &&
        context.parentURL?.startsWith('file:') &&
        /\.tsx?$/.test(context.parentURL)
      ) {
        base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      }
      if (base) {
        const file = existingFile(base);
        if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith('file:') && /\.tsx?$/.test(url)) {
        const file = fileURLToPath(url);
        const source = fs.readFileSync(file, 'utf8');
        const out = ts.transpileModule(source, {
          fileName: file,
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        });
        // Die App lädt JSON-Dateien mit require(); in Node-Modulen gibt es das nur über createRequire.
        const prelude = source.includes('require(')
          ? "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url); "
          : '';
        return { format: 'module', source: prelude + out.outputText, shortCircuit: true };
      }
      return nextLoad(url, context);
    },
  });
}
