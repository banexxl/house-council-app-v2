// Check that all tokens from src/locales/tokens.ts
// exist in every translation file under src/locales/translations.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const tokensPath = path.join(root, 'src', 'locales', 'tokens.ts');
const translationsDir = path.join(root, 'src', 'locales', 'translations');
const locales = ['en', 'es', 'de', 'rs'];

function read(file) { return fs.readFileSync(file, 'utf8'); }

function loadTokensObject(tsSource) {
  const transformed = tsSource.replace(/\bexport\s+const\s+tokens\s*=\s*/, 'const tokens = ') + '\nmodule.exports = tokens;\n';
  const sandbox = { module: {}, exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(transformed, sandbox, { filename: 'tokens.ts' });
  return sandbox.module.exports || sandbox.exports;
}

function collectTokenPaths(tokensObj) {
  const paths = [];
  function visit(obj, trail) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        const next = [...trail, key];
        if (val && typeof val === 'object') visit(val, next);
        else paths.push('tokens.' + next.join('.'));
      }
    }
  }
  visit(tokensObj, []);
  return paths;
}

function extractKeysFromTranslation(content) {
  const keys = new Set();
  const re = /\[(tokens(?:\.[a-zA-Z0-9_]+)+)\]\s*:/g;
  let m; while ((m = re.exec(content))) keys.add(m[1]);
  return keys;
}

function main() {
  const tokensObj = loadTokensObject(read(tokensPath));
  const allTokenKeys = collectTokenPaths(tokensObj);

  let hasMissing = false;
  for (const locale of locales) {
    const p = path.join(translationsDir, `${ locale }.ts`);
    const present = extractKeysFromTranslation(read(p));
    const missing = allTokenKeys.filter(k => !present.has(k));
    if (missing.length > 0) hasMissing = true;
    console.log(`${ locale }: missing ${ missing.length }`);
    if (missing.length > 0) {
      const preview = missing.slice(0, 25);
      for (const k of preview) console.log('  - ' + k);
      if (missing.length > preview.length) console.log(`  ... and ${ missing.length - preview.length } more`);
    }
  }

  if (hasMissing) process.exitCode = 1;
}

main();

