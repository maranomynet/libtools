# Change Log for `@maranomynet/libtools`

## Upcoming...

- ... <!-- Add new lines here. -->
- `updatePkgVersion`:
  - feat: The `<!-- Add new lines here -->` marker is now optional
  - feat: Treat `## Unreleased` as alias for `## Upcoming`

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
