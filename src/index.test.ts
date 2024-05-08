import type {
  BuildNpmLibOpts,
  Equals,
  Expect,
  Extends,
  JSONArray,
  JSONObject,
  JSONValue,
  NotExtends,
  PackageVersionOpts,
  PublishToNpmOpts,
  UpdatePkgVersionOpts,
} from './index.js';
import * as moduleExports from './index.js';

// ===========================================================================
// Test Type Signature and Exports

if (false as boolean) {
  /* eslint-disable @typescript-eslint/no-unused-vars */

  // Make sure the module exports are as advertised
  const exports: Record<keyof typeof moduleExports, true> = {
    buildNpmLib: true,
    updatePkgVersion: true,
    publishToNpm: true,

    args: true,
    argStrings: true,
    distFolder: true,

    promptYN: true,
    shell$: true,
    getPkgVersion: true,
    // readJSONFile: true,

    runner: true,
    setRunner: true,
    runCmd: true,
    runScript: true,
    runPkgBin: true,

    logError: true,
    logThenExit1: true,
    ignoreError: true,
    exit1: true,

    formatSources: true,
    errorCheckSources: true,
    typeCheckSources: true,
    lintSources: true,
  };

  type JSONArray_is_exported = JSONArray;
  type JSONObject_is_exported = JSONObject;
  type JSONValue_is_exported = JSONValue;

  type BuildNpmLibOpts_is_exported = BuildNpmLibOpts;
  type PackageVersionOpts_is_exported = PackageVersionOpts;
  type UpdatePkgVersionOpts_is_exported = UpdatePkgVersionOpts;
  type PublishToNpmOpts_is_exported = PublishToNpmOpts;

  type Equals_is_exported = Equals<true, true>;
  type Expect_is_exported = Expect<true>;
  type Extends_is_exported = Extends<true, boolean>;
  type NotExtends_is_exported = NotExtends<boolean, true>;

  /* eslint-enable @typescript-eslint/no-unused-vars */
}

// ===========================================================================
// Test Individual Functions

// Set timezone to something ahead of UTC to make sure tests don't depend on local time
process.env.TZ = 'Asia/Yangon';
