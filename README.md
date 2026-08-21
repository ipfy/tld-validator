# Ipfy TLD Validator

Checks a form field's domain against IANA's real, current TLD list —
so `.studio`, `.domains`, or an internationalized TLD doesn't get
silently rejected by a form that was only ever tested against `.com`.

Two files: `tld.js` (the validator) and `tld.json` (the data, refreshed
weekly from IANA, no manual maintenance needed).

## Usage

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

### If the data hasn't loaded yet, or fails to load

Every field passes. This never blocks a real submission just because
`tld.json` was slow or briefly unreachable — the whole point is to
catch bad TLDs, not to add a new way for forms to break.

## Regenerating tld.json

```
node build.js
```

Node 18+, no dependencies. A GitHub Action
(`.github/workflows/refresh.yml`) does this automatically, weekly, and
only commits if IANA's list actually changed.

## License

MIT. TLD data is derived from IANA's public Root Zone Database; Ipfy
TLD Validator isn't affiliated with IANA.
