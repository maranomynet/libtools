# Change Log for `@maranomynet/libtools`

## Upcoming...

- ... <!-- Add new lines here. -->

## 0.1.17

_2025-05-14_

- feat: `shell$` accepts a callback for its second `handleError` parameter
- fix: Broken README link in the JSDoc for `shell$`

## 0.1.16

_2025-01-27_

- feat: Add support for `bun@1.2`'s plaintext `bun.lock` file

## 0.1.15

_2024-10-30_

- feat: Add `perf:` as a valid "patch"-level commit type

## 0.1.13 – 0.1.14

_2024-08-20_

- `updatePkgVersion`:
  - feat: The `<!-- Add new lines here -->` marker is now optional
  - feat: Auto-insert "Add new lines here" marker if none is found
  - feat: Treat `## Unreleased` as alias for `## Upcoming`
  - fix: Allow "## " to appear in changelog entries

## 0.1.12

_2024-06-10_

- feat: Emit happy message after uneventful error-check/linting runs

## 0.1.11

_2024-05-08_

- feat: filter out empty/anonymous `args` (i.e. `--`, `-`, etc.)
- feat: Add `runPkgBin` for running package binaries
- feat: Add (rename) `runScript` — deprecate `runCmd`
- fix: `npm` errors when running `buildNpmLib` as well as `errorCheckSources`,
  `formatSources`, `lintSources` and `typeCheckSources`

## 0.1.9 — 0.1.10

_2024-03-15_

- feat: Add export `argStrings`
- feat: Add support for pre-release versions in `updatePkgVersion()` — via the
  `preReleaseName` option
- feat: Add option `tag` for `publishToNpm()` — defaults to the first segment
  of the version's pre-release segment.

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
