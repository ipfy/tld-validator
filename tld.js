/**
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
 */
(function (global) {
  'use strict';

  var scriptEl = document.currentScript;
  var baseUrl = scriptEl ? scriptEl.src.replace(/tld\.js(\?.*)?$/, '') : '';

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

  function extractHostname(rawValue, mode) {
    var value = (rawValue || '').trim();
    if (!value) return null;

    if (mode === 'email') {
      var at = value.lastIndexOf('@');
      if (at === -1) return null;
      value = value.slice(at + 1);
    }

    try {
      // Punycode-encodes any Unicode/IDN domain the same way a real DNS
      // lookup would need it — so ಐಪಿಫೈ.ಭಾರತ and münchen.de both work.
      var url = new URL('http://' + value.replace(/^[a-z]+:\/\//i, ''));
      return url.hostname;
    } catch (e) {
      return null;
    }
  }

  function tldOf(hostname) {
    var parts = hostname.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
  }

  function isKnownTld(tld) {
    return !!tldSet && tldSet.has(String(tld || '').toLowerCase());
  }

  /**
   * Validates one field. Call it from onblur, onchange, or before
   * submit — whatever the form already uses.
   *
   * @param {HTMLInputElement} input
   * @param {Object} [opts]
   * @param {'email'|'url'} [opts.mode] - auto-detected from input.type if omitted
   * @param {string} [opts.message] - custom validation error text
   * @returns {boolean} whether the field currently passes
   */
  function check(input, opts) {
    opts = opts || {};

    if (!tldSet) {
      input.setCustomValidity('');
      return true; // data not loaded yet — never block on that
    }

    if (!input.value) {
      input.setCustomValidity('');
      return true; // let required/type validation handle empty fields
    }

    var mode = opts.mode || (input.type === 'email' ? 'email' : 'url');
    var hostname = extractHostname(input.value, mode);
    var tld = hostname ? tldOf(hostname) : null;

    if (tld && isKnownTld(tld)) {
      input.setCustomValidity('');
      return true;
    }

    if (!hostname) {
      // Value doesn't even parse as a domain — defer to the field's own
      // type="email"/type="url" validation message rather than ours.
      input.setCustomValidity('');
      return false;
    }

    input.setCustomValidity(opts.message || "That domain's ending doesn't look like a real one — please check it.");
    return false;
  }

  global.TLD = {
    check: check,
    isKnownTld: isKnownTld,
    ready: ready,
  };
})(window);
