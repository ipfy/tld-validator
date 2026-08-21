# Ipfy TLD Validator

Checks a form field's domain against IANA's real, current TLD list —
so `.studio`, `.domains`, or an internationalized TLD doesn't get
silently rejected by a form that was only ever tested against `.com`.

Two ways to use it:

- **In a browser**, via a single `<script>` tag (`tld.js` + `tld.json`,
  refreshed weekly from IANA, no maintenance needed)
- **In Node.js**, via the [`@ipfy/tld-validator`](https://www.npmjs.com/package/@ipfy/tld-validator)
  npm package (bundled data, republished monthly, with an optional
  live refresh)

Both are built from the same source — `src/core.js` — so there's one
implementation of the actual TLD-checking logic, not two that can
quietly drift apart.

## Browser usage

Include the script once, then one line per field:

```html
<script src="https://cdn.jsdelivr.net/gh/ipfy/tld-validator@main/tld.js"></script>

<input type="email" name="email" onblur="TLD.check(this)">
<input type="url" name="website" onblur="TLD.check(this)">
```

That's it. `TLD.check(this)` auto-detects email vs. URL from the
field's `type` attribute, extracts the domain, and checks its TLD. It
calls the browser's built-in `setCustomValidity()` — which any standard
`<form>` already respects, so this works inside Contact Form 7, Fluent
Forms, Gravity Forms, or a plain HTML form with zero plugin-specific
code. An invalid field shows the browser's native validation message
and blocks submission automatically.

Works with internationalized domains too — `ಐಪಿಫೈ.ಭಾರತ`,
`münchen.de`, etc. — no extra setup.

If `tld.json` hasn't loaded yet, or fails to load, every field passes.
This never blocks a real submission just because the data was slow or
briefly unreachable — the point is to catch bad TLDs, not to add a new
way for forms to break.

## Node.js / npm usage

```
npm install @ipfy/tld-validator
```

```js
const tld = require('@ipfy/tld-validator');

tld.isKnownTld('studio');              // true
tld.isValidDomain('user@x.mdf');       // false
```

### Exactly what this does over the network — read this before using it in anything with a security review

This is worth being precise about, not vague:

1. **`require('@ipfy/tld-validator')` makes no network call.** Data
   loads from the bundled `data/tld.json` file on disk, synchronously,
   the first time you actually call `isKnownTld()` or
   `isValidDomain()` — not at import time.

2. **That same first call also triggers one background fetch** to
   `https://cdn.jsdelivr.net/gh/ipfy/tld-validator@main/tld.json`, to
   pick up any TLDs added since this package version was published.
   This does not block or delay that first call — it returns using
   bundled data immediately. If the fetch succeeds, every call after
   that uses the refreshed data. **At most one fetch happens per
   process, ever** — not one per call.

3. **If that fetch fails, is slow, or never resolves, nothing breaks.**
   Bundled data keeps being used silently. There's no error to catch,
   no exception path — this fetch either quietly improves freshness or
   quietly does nothing.

4. **To guarantee zero network activity, ever** — for restricted,
   offline, or air-gapped environments — disable it before the first
   check call:

   ```js
   const tld = require('@ipfy/tld-validator');
   tld.configure({ liveUpdate: false });
   ```

If you want to know once the live-refresh attempt has settled (rather
than just trusting it happened silently in the background), `await
tld.whenLiveRefreshSettles()` — not required for correctness, just
there if you want it.

### Other exports

```js
tld.tldOf('example.co.in');            // 'in'
tld.extractHostname('user@x.com', 'email'); // 'x.com'
tld.bundledUpdatedAt;                  // ISO timestamp of the bundled snapshot
tld.check;                             // same function as browser TLD.check — useful with jsdom or similar, not typical server-side use
```

### Data freshness — the two cadences aren't the same, on purpose

- `tld.json` (browser CDN file) — refreshed **weekly**, automatically,
  via `.github/workflows/refresh.yml`.
- The npm package's bundled `data/tld.json` — refreshed at **each npm
  publish**, currently monthly. Publishing itself is a manual,
  intentional step (`.github/workflows/publish-npm.yml`, triggered by
  hand) rather than fully automatic — an npm publish is effectively
  permanent in a way a git commit isn't, so that step stays deliberate.
  Between publishes, the npm package's optional live-refresh (above)
  can still pick up anything newer directly from the weekly-refreshed
  CDN file, if `liveUpdate` isn't disabled.

## Repo layout

```
src/core.js              — canonical logic (environment-agnostic; no window, no document)
tld.js                    — browser build, generated from src/core.js
tld.json                  — browser/CDN data, refreshed weekly
index.js                  — npm package entry point
data/tld.json             — npm package's bundled data snapshot
build.js                  — regenerates tld.json from IANA
scripts/build-browser.js  — regenerates tld.js from src/core.js
scripts/prepublish.js     — snapshots tld.json into data/ before npm publish
```

If you ever change `src/core.js`, regenerate the browser build before
committing:

```
npm run build:browser
```

## License

MIT. TLD data is derived from IANA's public Root Zone Database; Ipfy
TLD Validator isn't affiliated with IANA.
