# Bundled fonts

The brand webfonts are vendored here so that rendering never touches the network
at generation time and output is identical on every machine.

| Family | Role | Licence |
| --- | --- | --- |
| Syne | Display / headlines | SIL Open Font Licence 1.1 |
| Space Grotesk | Body / UI | SIL Open Font Licence 1.1 |
| JetBrains Mono | Technical detail, contact strip | SIL Open Font Licence 1.1 |

All three are licensed under the SIL OFL 1.1, which permits bundling and
self-hosting. Full licence texts: <https://openfontlicense.org>.

Each file is a **variable** font covering a weight range, which is why several
weights share the same bytes. `src/design/fonts.js` detects this and emits one
`@font-face` with a weight range rather than one per weight.

## Files

- `<Family>-<weight>.woff2` — font data. Refresh with `npm run fetch-fonts`.
- `metrics.json` — measured glyph advance widths, used to wrap text exactly
  without a browser round-trip. Regenerate with `npm run calibrate-fonts`
  whenever a font file changes.
