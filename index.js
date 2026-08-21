'use strict';

/**
 * Ipfy TLD Validator — Node.js / npm entry point
 *
 * const tld = require('@ipfy/tld-validator');
 * tld.isKnownTld('studio');           // true
 * tld.isValidDomain('user@x.mdf');    // false
 *
 * DATA FRESHNESS — how this actually behaves, precisely:
 *
 * 1. Importing this module (`require(...)`) makes NO network call.
 *    Bundled data (data/tld.json, refreshed at each npm publish — see
 *    the package README for the exact cadence) loads synchronously
 *    from disk the first time any check function is actually called,
 *    not at import time.
 *
 * 2. That same first call also triggers ONE background fetch to
 *       https://cdn.jsdelivr.net/gh/ipfy/tld-validator@main/tld.json
 *    to pick up any TLDs added since this package version was
 *    published. This does not block or delay that first call's
 *    result — it resolves using bundled data immediately, and the
 *    live data (if the fetch succeeds) is used for every call after
 *    that. At most one fetch ever happens per process, regardless of
 *    how many times you call a check function.
 *
 * 3. If that fetch fails, is slow, or never resolves, nothing breaks
 *    and nothing is blocked — bundled data keeps being used silently.
 *    There is no error path a caller needs to handle for this.
 *
 * 4. To guarantee zero network activity, ever — for restricted or
 *    air-gapped environments — call configure({ liveUpdate: false })
 *    before the first check call:
 *
 *      const tld = require('@ipfy/tld-validator');
 *      tld.configure({ liveUpdate: false });
 */

const fs = require('fs');
const path = require('path');
const { extractHostname, tldOf, makeIsKnownTld, isValidDomain: isValidDomainCore, makeFieldChecker } = require('./src/core.js');

const BUNDLED_PATH = path.join(__dirname, 'data', 'tld.json');
const LIVE_URL = 'https://cdn.jsdelivr.net/gh/ipfy/tld-validator@main/tld.json';
const MIN_EXPECTED_TLDS = 1000; // sanity floor — a malformed live response should never replace good bundled data

let liveUpdateEnabled = true;
let bundledMeta = null;
let currentSet = null;
let liveFetchTriggered = false;
let liveFetchPromise = null;

function loadBundled() {
  if (!currentSet) {
    bundledMeta = JSON.parse(fs.readFileSync(BUNDLED_PATH, 'utf8'));
    currentSet = new Set(bundledMeta.tlds);
  }
  return currentSet;
}

function triggerLiveRefresh() {
  liveFetchPromise = fetch(LIVE_URL)
    .then((res) => {
      if (!res.ok) throw new Error('fetch failed: ' + res.status);
      return res.json();
    })
    .then((data) => {
      if (Array.isArray(data.tlds) && data.tlds.length >= MIN_EXPECTED_TLDS) {
        currentSet = new Set(data.tlds);
      }
    })
    .catch(() => {
      // Silent, by design — bundled/current data stays in use. This is
      // a freshness upgrade, not a requirement; a network hiccup here
      // should never surface as an error to the caller.
    });
  return liveFetchPromise;
}

function getTldSet() {
  const set = loadBundled(); // always synchronous, always succeeds off disk
  if (liveUpdateEnabled && !liveFetchTriggered) {
    liveFetchTriggered = true;
    triggerLiveRefresh(); // fire-and-forget — does not block this call
  }
  return currentSet || set;
}

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.liveUpdate] - set false to guarantee zero
 *   network calls, ever. Must be called before the first check call
 *   to take effect (it only prevents a fetch that hasn't fired yet).
 */
function configure(opts) {
  opts = opts || {};
  if (typeof opts.liveUpdate === 'boolean') liveUpdateEnabled = opts.liveUpdate;
}

/**
 * Resolves once the live refresh has settled (succeeded or failed).
 * Not required for normal use — isKnownTld/isValidDomain are correct
 * immediately, using bundled data, without awaiting this. Useful if
 * you specifically want to know the live-vs-bundled state has
 * resolved, e.g. in a test.
 */
function whenLiveRefreshSettles() {
  return liveFetchPromise || Promise.resolve();
}

const isKnownTld = makeIsKnownTld(getTldSet);
const check = makeFieldChecker(isKnownTld, function () { return true; }); // bundled data is always synchronously available

module.exports = {
  isKnownTld,
  isValidDomain: function (input) { return isValidDomainCore(isKnownTld, input); },
  tldOf,
  extractHostname,
  check, // mainly useful with a DOM-like object (jsdom, etc.) — see README
  configure,
  whenLiveRefreshSettles,
  get bundledUpdatedAt() {
    loadBundled();
    return bundledMeta.updatedAt;
  },
};
