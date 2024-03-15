# Change Log for `@maranomynet/libtools`

## Upcoming...

- ... <!-- Add new lines here. -->
- feat: Add option `tag` for `publishToNpm()` — defaults to the first segment
  of the version's pre-release segment.

## 0.1.9

_2024-03-15_

- feat: Add export `argStrings`
- feat: Add support for pre-release versions in `updatePkgVersion()` — via the
  `preReleaseName` option

## 0.1.8

_2024-02-17_

- feat: Add option `type` to `buildNpmLib`
- feat: Add option `postProcess` to `buildNpmLib`

## 0.1.4 — 0.1.7

_2024-02-13_

- feat: `buildNpmLib` excludes `pkg.bin` paths from `pkg.exports`
- feat: Add `typeCheckSources` function with `watch` option
- fix: Regression in detecting old version

## 0.1.1 – 0.1.3

_2024-02-12_

- feat: Add `tsWorkspaces` option to `errorCheckSources()`
- feat: Support reading old version from range headings in `CHANGELOG.md`
- docs: Fix JSDoc `@see` links to README chapters

## 0.1.0

_2024-02-09_

- feat: Initial release. 🎉🥳👯
