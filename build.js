#!/usr/bin/env node
/**
 * Ipfy TLD Validator — build script
 * Regenerates tld.json from IANA's Root Zone Database.
 *
 * Usage: node build.js
 * Requires Node 18+ (built-in fetch). No dependencies.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://data.iana.org/TLD/tlds-alpha-by-domain.txt';
const OUTPUT_PATH = path.join(__dirname, 'tld.json');
const MIN_EXPECTED_TLDS = 1000; // sanity floor — catches a broken/truncated fetch before it overwrites a good file

async function main() {
  console.log(`Fetching ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();

  const versionLine = text.split('\n').find((l) => l.trim().startsWith('#'));

  const tlds = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.toLowerCase());

  if (tlds.length < MIN_EXPECTED_TLDS) {
    throw new Error(`Only parsed ${tlds.length} TLDs — expected ${MIN_EXPECTED_TLDS}+. Aborting without touching tld.json.`);
  }

  const output = {
    generator: 'Ipfy TLD Validator',
    source: SOURCE_URL,
    sourceVersion: versionLine ? versionLine.replace(/^#\s*/, '') : null,
    updatedAt: new Date().toISOString(),
    count: tlds.length,
    tlds,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output) + '\n');
  console.log(`Wrote ${tlds.length} TLDs to tld.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
