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
  exit1,
  ignoreError,
  logError,
  logThenExit1,
  promptYN,
  runCmd,
  runner,
  setRunner,
  $ as shell$,
} from './_/utils.js';
