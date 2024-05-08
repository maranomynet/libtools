export {
  errorCheckSources,
  formatSources,
  lintSources,
  typeCheckSources,
} from './_/checking.js';
export type {
  BuildNpmLibOpts,
  PackageVersionOpts,
  PublishToNpmOpts,
  UpdatePkgVersionOpts,
} from './_/package.js';
export {
  buildNpmLib,
  distFolder,
  getPkgVersion,
  publishToNpm,
  updatePkgVersion,
} from './_/package.js';
export type { Equals, Expect, Extends, NotExtends } from './_/typetests.js';
export type { JSONArray, JSONObject, JSONValue } from './_/utils.js';
export {
  args,
  argStrings,
  exit1,
  ignoreError,
  logError,
  logThenExit1,
  promptYN,
  runCmd, // eslint-disable-line deprecation/deprecation
  runner,
  runPkgBin,
  runScript,
  setRunner,
  $ as shell$,
} from './_/utils.js';
