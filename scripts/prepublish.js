#!/usr/bin/env node
/**
 * Ipfy TLD Validator — prepublish step
 *
 * Copies the current root tld.json (kept fresh weekly by
 * .github/workflows/refresh.yml) into data/tld.json, so whatever gets
 * published to npm bundles a snapshot from the moment of publish —
 * not whatever was last committed by hand.
 *
 * Runs automatically as part of `npm publish` via the
 * prepublishOnly script in package.json. Not meant to be run standalone,
 * though it's harmless to.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'tld.json');
const DEST = path.join(__dirname, '..', 'data', 'tld.json');

if (!fs.existsSync(SRC)) {
  console.error(`Expected ${SRC} to exist — has the weekly refresh ever run?`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.copyFileSync(SRC, DEST);
console.log(`Bundled data snapshot: copied ${path.relative(process.cwd(), SRC)} -> ${path.relative(process.cwd(), DEST)}`);
