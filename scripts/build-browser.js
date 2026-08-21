#!/usr/bin/env node
/**
 * Ipfy TLD Validator — browser build
 *
 * Regenerates tld.js by inlining src/core.js (the shared logic) into
 * the browser-specific loader (document.currentScript auto-discovery,
 * the fetch-tld.json-on-load flow, and assembling window.TLD).
 *
 * This is NOT a real bundler — no dependency gets installed for this.
 * core.js's CommonJS export guard (`if (typeof module !== 'undefined')`)
 * is safe to inline as-is: in a real browser, `module` is undefined, so
 * that block silently never runs. No stripping needed.
 *
 * Run after editing src/core.js:
 *   node scripts/build-browser.js
 *
 * The public API this produces (window.TLD.check / .isKnownTld / .ready)
 * is unchanged from before this refactor — existing consumers (the
 * DNSSEC checker, any WordPress site already using the CDN URL) are
 * unaffected.
 */

const fs = require('fs');
const path = require('path');

const CORE_PATH = path.join(__dirname, '..', 'src', 'core.js');
const OUTPUT_PATH = path.join(__dirname, '..', 'tld.js');

const coreSource = fs.readFileSync(CORE_PATH, 'utf8').trim();

const output = `/**
 * Ipfy TLD Validator
 *
 * Checks a form field's domain against IANA's real TLD list, so
 * ".studio", ".domains", or an internationalized TLD doesn't get
 * silently rejected by a form that only ever expected ".com".
 *
 * Usage — one line per field:
 *   <input type="email" name="email" onblur="TLD.check(this)">
 *   <input type="url"   name="website" onblur="TLD.check(this)">
 *
 * That's it. It auto-detects email vs. URL from the field's type
 * attribute, extracts the domain, checks the TLD, and calls the
 * browser's native setCustomValidity() — which every standard HTML
 * form (Contact Form 7, Fluent Forms, Gravity Forms, or anything else
 * using a normal <form>) already respects for blocking submission and
 * showing an error, with zero plugin-specific integration code.
 *
 * Data (tld.json) is fetched once, automatically, from wherever this
 * script itself was loaded from — no separate include needed. If that
 * fetch hasn't finished yet (or fails) when check() is called, it fails
 * open: nothing gets blocked. A missing/slow data file should never be
 * the reason a real submission gets rejected.
 *
 * GENERATED FILE — do not edit directly. Source of truth is
 * src/core.js (shared with the @ipfy/tld-validator npm package) and
 * the loader logic in scripts/build-browser.js. Regenerate with:
 *   node scripts/build-browser.js
 */
(function (global) {
  'use strict';

${coreSource}

  var scriptEl = document.currentScript;
  var baseUrl = scriptEl ? scriptEl.src.replace(/tld\\.js(\\?.*)?$/, '') : '';

  var tldSet = null;
  var ready = fetch(baseUrl + 'tld.json')
    .then(function (res) {
      if (!res.ok) throw new Error('tld.json fetch failed: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      tldSet = new Set(data.tlds || []);
    })
    .catch(function (err) {
      console.warn('[TLD] Could not load tld.json — validation is disabled until it loads. Fields pass through unchecked.', err);
    });

  var isKnownTld = makeIsKnownTld(function () { return tldSet; });
  var check = makeFieldChecker(isKnownTld, function () { return tldSet !== null; });

  global.TLD = {
    check: check,
    isKnownTld: isKnownTld,
    ready: ready,
  };
})(window);
`;

fs.writeFileSync(OUTPUT_PATH, output);
console.log(`Regenerated ${path.relative(path.join(__dirname, '..'), OUTPUT_PATH)} from src/core.js`);
