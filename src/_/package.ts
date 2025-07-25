// import { describe, expect, test } from "bun:test";
import { sync as glob } from 'glob';
import { readFile, writeFile } from 'node:fs/promises';

import {
  $,
  JSONObject,
  JSONValue,
  logThenExit1,
  prompt,
  promptYN,
  readJSONFile,
  runPkgBin,
} from './utils.js';

type PgkJson = {
  version: string;
  name: string;
} & JSONObject;

// ===========================================================================

export const _getLatestVersion = (
  changelog: string
): {
  oldVersionArr: [number, number, number];
  oldVersionHeaderIdx: number;
} => {
  changelog = `\n${changelog}`;

  const match = changelog.match(
    /\n##\s+(?:\d+\.\d+\.\d+(?:\+[a-z0-9-.]+)?\s*[-–—]\s*)?(\d+)\.(\d+)\.(\d+)(?:\+[a-z0-9-.]+)?\s*(?:\n|$)/
  );

  if (!match) {
    return {
      oldVersionArr: [0, 0, 0],
      oldVersionHeaderIdx: changelog.length - 1,
    };
  }

  let oldVersionArr = match.slice(1).map(Number) as [number, number, number];

  return {
    oldVersionArr,
    oldVersionHeaderIdx: match?.index ?? -1,
  };
};

// ===========================================================================

/**
 * Updates the changelog file with the new version and release date.
 */
// eslint-disable-next-line complexity
const updateChangelog = async (
  changelogFileName: string,
  opts?: Pick<UpdatePkgVersionOpts, 'offerDateShift' | 'preReleaseName'>
): Promise<{
  oldVersion: string;
  newVersion: string;
  newChangelog: string;
}> => {
  const { offerDateShift, preReleaseName } = opts || {};
  const changelogFull = (await readFile(changelogFileName)).toString();
  const changelog = changelogFull.slice(0, 4000);
  const changelogTail = changelogFull.slice(4000);

  const upcomingRe = new RegExp('## (Upcoming|Unreleased)\\.{0,3}', 'i');
  const addNewLinesRe = new RegExp(
    '(?:- \\.\\.\\.)(?: <!-- Add new lines here\\.? -->)?',
    'i'
  );

  const upcomingResult = upcomingRe.exec(changelog);
  if (!upcomingResult) {
    throw new Error(
      `Could not find "${upcomingRe.source}" header in ${changelogFileName}`
    );
  }
  const upcomingEndIdx = upcomingResult.index + upcomingResult[0].length;

  const { oldVersionArr, oldVersionHeaderIdx } = _getLatestVersion(
    changelog.slice(upcomingEndIdx)
  );
  const oldVersion = oldVersionArr.join('.');

  if (
    oldVersion === '0.0.0' &&
    !(await promptYN(
      [
        'No valid previous version number were found.',
        'Are you aiming for initial (0.0.0) release?',
      ].join('\n'),
      'n'
    ))
  ) {
    throw new Error('Aborted by user');
  }

  const updates = changelog
    .slice(
      upcomingEndIdx,
      oldVersionHeaderIdx > 0 ? upcomingEndIdx + oldVersionHeaderIdx : undefined
    )
    .trim()
    .split(/(?:^|\n\s*)- /)
    .map((line) => line.trim().match(/^(\*\*BREAKING\*\*|feat:|fix:|docs:|perf:)/)?.[1])
    .filter(/** @type {((x: unknown) => x is string)} */ (x) => !!x);

  if (updates.length === 0) {
    console.info(
      `No significant/relevant unreleased updates found in ${changelogFileName}`
    );
    process.exit(0);
  }

  const isPrerelease = !oldVersionArr[0];
  const majorIdx = isPrerelease ? 1 : 0;
  const minorIdx = majorIdx + 1;
  const patchIdx = minorIdx + (isPrerelease ? 0 : 1);

  let newVersionArr = [...oldVersionArr];
  if (updates.includes('**BREAKING**') || oldVersion === '0.0.0') {
    if (isPrerelease && (await promptYN('Should we bump to v1.0.0?', 'n'))) {
      newVersionArr = [1, 0, 0];
    } else {
      newVersionArr[patchIdx] = 0;
      newVersionArr[minorIdx] = 0;
      newVersionArr[majorIdx] = oldVersionArr[majorIdx] + 1;
    }
  } else if (updates.includes('feat:')) {
    newVersionArr[patchIdx] = 0;
    newVersionArr[minorIdx] = oldVersionArr[minorIdx]! + 1;
  } else {
    newVersionArr[patchIdx] = oldVersionArr[patchIdx]! + 1;
  }

  const newVersion =
    newVersionArr.join('.') + (preReleaseName ? `-${preReleaseName}` : '');

  const addNewLinesResult = addNewLinesRe.exec(changelog.slice(upcomingEndIdx));
  const addNewLinesEndIdx =
    upcomingEndIdx +
    (addNewLinesResult ? addNewLinesResult.index + addNewLinesResult[0].length : 0);

  let dayOffset = 0;
  if (offerDateShift) {
    const answer = await prompt(`Delay release date by how many days? (0)`);
    dayOffset = parseInt(answer) || 0;
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  const releaseDate = new Date(Date.now() + dayOffset * DAY_MS);

  const newChangelog =
    changelog.slice(0, addNewLinesEndIdx) +
    (addNewLinesResult ? '' : '\n\n- ... <!-- Add new lines here. -->') +
    [
      '',
      '',
      `## ${newVersion}`,
      '',
      `_${releaseDate.toISOString().slice(0, 10)}_`,
      '',
      '',
    ].join('\n') +
    changelog.slice(addNewLinesEndIdx).trimStart() +
    changelogTail;

  return { oldVersion, newVersion, newChangelog };
};

// ===========================================================================

export type UpdatePkgVersionOpts = {
  /**
   * Optional pre-release name to append to the version number. (e.g. `'beta.1'`)
   *
   * Deafult: `undefined` (none)
   */
  preReleaseName?: string;
  /**
   * Should the user be offered to shift the release date N days into the future.
   *
   * Default: `false`
   */
  offerDateShift?: boolean;
  /**
   * The root folder of the project/package.
   *
   * Default: `'.'`
   */
  root?: string;
  /**
   * Optional suffix to append to the `CHANGELOG.md` file before the `.md`
   * file extension.
   *
   * Default: `''`
   */
  changelogSuffix?: string;
} & PackageVersionOpts;

/**
 * Auto-updates the `package.json` and `CHANGELOG.md` files with the new
 * version and release date, based on the "## Upcoming..." entries in the
 * changelog, and their conventional commit prefixees ("**BREAKING**", "feat:",
 * "fix:", "docs:")
 *
 * @see  https://github.com/maranomynet/libtools/tree/v0.1#updatepkgversion
 */
export const updatePkgVersion = async (opts?: UpdatePkgVersionOpts): Promise<void> => {
  const {
    root = '.',
    offerDateShift,
    preReleaseName,
    versionKey = 'version',
    changelogSuffix = '',
    pkgJsonSuffix = '',
  } = opts || {};

  if (preReleaseName && !/^[a-z0-9.-]+$/.test(preReleaseName)) {
    throw new Error(`Invalid pre-release name: ${JSON.stringify(preReleaseName)}`);
  }

  const changelogFile = `${root}/CHANGELOG${changelogSuffix}.md`;
  const pkgFile = `${root}/package${pkgJsonSuffix}.json`;

  try {
    const pkg = await readJSONFile(pkgFile);

    const { /* oldVersion,  */ newVersion, newChangelog } = await updateChangelog(
      changelogFile,
      { offerDateShift, preReleaseName }
    );

    const versionOK = await promptYN(`New version: ${newVersion}\nIs this correct?`);
    if (!versionOK) {
      throw new Error('Aborted by user');
    }

    pkg[versionKey] = newVersion;
    await Promise.all([
      writeFile(pkgFile, `${JSON.stringify(pkg, null, '  ')}\n`),
      writeFile(changelogFile, newChangelog),
    ]);
  } catch (err) {
    logThenExit1(err);
  }
};

// ===========================================================================

export type PackageVersionOpts = {
  /**
   * The root folder of the project/package.
   *
   * Default: `'.'`
   */
  root?: string;
  /**
   * Optional suffix to append to the `package.json` file before the `.json`
   * file extension.
   *
   * Default: `''`
   */
  pkgJsonSuffix?: string;
  /**
   * Optional custom `pkg.*` key to read.
   *
   * Default: `'version'`
   */
  versionKey?: string;
};

/**
 * Reads the `version` field from the `./package.json` file and returns it.
 *
 * The name of the field can be customized with the `versionKey` option.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#getpkgversion
 */
export const getPkgVersion = async (opts?: PackageVersionOpts): Promise<string> => {
  const { root = '.', versionKey = 'version', pkgJsonSuffix = '' } = opts || {};
  const pkgFile = `${root}/package${pkgJsonSuffix}.json`;
  const versionValue = (await readJSONFile<PgkJson>(pkgFile))[versionKey];
  if (
    typeof versionValue !== 'string' ||
    !/\d+\.\d+\.\d+(?:[+-].+)?/.test(versionValue)
  ) {
    const valueStr = JSON.stringify(versionValue, null, 2);
    throw new Error(`Invalid '${versionKey}' value in '${pkgFile}': ${valueStr}`);
  }
  return versionValue;
};

// ===========================================================================

type MakeLibPackageJsonOpts = {
  distDir: string;
  root: string;
  pkgJsonSuffix: string;
  entryPoints: Array<string>;
};

/**
 * Clones the local `./package.json` file into `outDir` after spreading its
 * `npmPackageJson` object into the root of the new `package.json` file
 * and removing any nully values.
 */
const makeLibPackageJson = async (opts: MakeLibPackageJsonOpts): Promise<void> => {
  const { distDir, root, pkgJsonSuffix, entryPoints } = opts;
  const pkg = await readJSONFile(`${root}/package${pkgJsonSuffix}.json`);
  const libPkg: JSONObject = Object.fromEntries(
    Object.entries({
      ...pkg,
      ...(pkg.npmPackageJson as JSONObject),
      npmPackageJson: null,
    } satisfies JSONObject as JSONObject).filter(
      (entry): entry is [string, NonNullable<JSONValue>] => entry[1] != null
    )
  );

  const bins = !libPkg.bin
    ? []
    : (typeof libPkg.bin === 'string' ? [libPkg.bin] : Object.values(libPkg.bin)).map(
        (path) => String(path).replace(/^(\.\/)?/, './')
      );

  libPkg.exports = entryPoints.reduce((exports, file) => {
    const token = file.replace(/\.tsx?$/, '');
    const expToken = token === 'index' ? '.' : `./${token}`;
    const expObj: (typeof exports)[string] = {
      import: `./esm/${token}.js`,
      require: `./${token}.js`,
    };
    if (!bins.includes(expObj.require) && !bins.includes(expObj.import)) {
      exports[expToken] = expObj;
    }
    return exports;
  }, {} as Record<string, Record<'import' | 'require', string>>);

  await writeFile(`${distDir}/package.json`, JSON.stringify(libPkg, null, '\t'));
};

// ===========================================================================

/**
 * Adds reference paths for every entry point (except the index) to the
 * `index.d.ts` file inside the `distFolder`.
 */
const addReferenePathsToIndex = async (
  entryPoints: Array<string>,
  distFolder: string
): Promise<void> => {
  const dtsify = (tsFilePath: string) => tsFilePath.replace(/\.(tsx?)$/, '.d.$1');
  const indexTsFile = entryPoints.find((filePath) =>
    /(?:^|\/)index.tsx?$/.test(filePath)
  );

  if (indexTsFile) {
    const extraEntryPaths = entryPoints
      .filter((filePath) => filePath !== indexTsFile)
      .map(dtsify)
      .map((declFile) => `/// <reference path="./${declFile}" />`);
    if (extraEntryPaths.length > 0) {
      const indexDeclFile = `${distFolder}/${dtsify(indexTsFile)}`;
      await writeFile(
        indexDeclFile,
        `${extraEntryPaths.join('\n')}\n\n${await readFile(indexDeclFile)}`
      );
    }
  }
};

// ===========================================================================

/**
 * The folder where the library will be built and published from.
 *
 * Put this folder in your `.gitignore` file.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#distfolder
 */
export const distFolder = '_npm-lib';

// ===========================================================================

export type BuildNpmLibOpts = {
  /**
   * The source folder where the build entry points are located.
   *
   * Default: `'src'`
   */
  srcDir?: string;
  /**
   * The root folder of the project/package.
   *
   * Default: `'.'`
   */
  root?: string;
  /**
   * Optional suffix to append to the `package.json` file before the `.json`
   * file extension.
   *
   * Default: `''`
   */
  pkgJsonSuffix?: string;
  /**
   * Optional suffix to append to the `CHANGELOG.md` file before the `.md`
   * file extension.
   *
   * Default: `''`
   */
  changelogSuffix?: string;
  /**
   * Optional suffix to append to the `README.md` file before the `.md`
   * file extension.
   *
   * Default: `''`
   */
  readmeSuffix?: string;

  /**
   * A function to post-process the tsc built `.js` files.
   *
   * @param jsFileContents - The contents of the `.js` file.
   * @param fileName - The path to the file — for reference.
   * @param type - The module type of the file: `'commonjs'` or `'esm'`.
   *
   * @returns The new/updated content for the `.js` file, or `undefined` if no changes were made.
   */
  postProcess?: (
    /** The contents of the `.js` file. */
    jsFileContents: string,
    /** The path to the file — for reference. */
    fileName: string,
    /** The module type of the file: `'commonjs'` or `'esm'`. */
    type: 'commonjs' | 'esm'
  ) => string | undefined | Promise<string | undefined>;

  /**
   * The type of module to build: `'esm'`, `'commonjs'`, or `'both'`.
   *
   * Default: `'both'`
   */
  type?: 'esm' | 'commonjs' | 'both';
};

/**
 * Reads `./tsconfig.build.json` for include and exclude patterns and uses them
 * as entry points to build the CommonJS and ESM versions of the library into
 * the `distDir` folder.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#buildnpmlib
 */
export const buildNpmLib = async (opts?: BuildNpmLibOpts) => {
  const {
    srcDir = 'src',
    root = '.',
    pkgJsonSuffix = '',
    readmeSuffix = '',
    changelogSuffix = '',
    postProcess,
    type = 'both',
  } = opts || {};
  const doCJS = type !== 'esm';
  const doESM = type !== 'commonjs';
  const tsCfgFile = `${root}/tsconfig.build.json`;
  try {
    const {
      exclude = [],
      include,
    }: { exclude?: Array<string>; include?: Array<string> } = await readJSONFile(
      tsCfgFile
    );

    if (!include || include.length === 0) {
      throw new Error(`No include patterns found in "${tsCfgFile}"`);
    }

    const entryPoints = include
      .flatMap((pattern) => glob(pattern, { ignore: exclude }))
      .map((filePath) => filePath.slice(srcDir.length + 1));

    await $(`rm -rf ${distFolder}`);
    if (doCJS) {
      await $(
        `${runPkgBin}tsc --project ${tsCfgFile} --module CommonJS --outDir ${distFolder}`
      );
    }
    if (doESM) {
      await $(
        `${runPkgBin}tsc --project ${tsCfgFile} --module NodeNext --outDir ${distFolder}/esm`
      );
    }
    await $([
      `cp ${root}/README${readmeSuffix}.md ${distFolder}/README.md`,
      `cp ${root}/CHANGELOG${changelogSuffix}.md ${distFolder}/CHANGELOG.md`,
    ]);

    if (postProcess) {
      await Promise.all(
        glob(`**/*.js`, { cwd: distFolder }).map(async (fileName) => {
          const ioFileName = `${distFolder}/${fileName}`;
          const moduleType =
            type !== 'both' ? type : fileName.startsWith('esm/') ? 'esm' : 'commonjs';
          const oldContents = (await readFile(ioFileName)).toString();
          const newContents = await postProcess(oldContents, fileName, moduleType);
          if (newContents != null && newContents !== oldContents) {
            return writeFile(ioFileName, newContents);
          }
        })
      );
    }

    await Promise.all([
      doCJS && addReferenePathsToIndex(entryPoints, distFolder),
      doESM && addReferenePathsToIndex(entryPoints, `${distFolder}/esm`),
      makeLibPackageJson({
        root: root,
        pkgJsonSuffix,
        distDir: distFolder,
        entryPoints,
      }),
      doESM &&
        writeFile(`${distFolder}/esm/package.json`, JSON.stringify({ type: 'module' })),
    ]);
  } catch (err) {
    logThenExit1(err);
  }
};

// ===========================================================================

export type PublishToNpmOpts = {
  /**
   * Should the package name be displayed in the "release:" commit message.
   *
   * Default: `false`
   */
  showName?: boolean;
  /**
   * The root folder of the project/package.
   *
   *  Default: `'.'`
   */
  root?: string;
  /**
   * Optional suffix to append to the `package.json` file before the `.json`
   * file extension.
   *
   * Default: `''`
   */
  pkgJsonSuffix?: string;
  /**
   * Optional suffix to append to the `CHANGELOG.md` file before the `.md`
   * file extension.
   *
   * Default: `''`
   */
  changelogSuffix?: string;
  /**
   * The `--tag` option to pass to `npm publish`.
   *
   * Default: `''`
   * ...or the first segement of the version number's pre-release name.
   */
  tag?: string;
};

/**
 * Publishes the library to npm (using `npm publish`) and commits the
 * `CANGELOG.md` and `package.json` changes to the local git repo.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#publishtonpm
 */
export const publishToNpm = async (opts?: PublishToNpmOpts): Promise<void> => {
  const { root = '.', changelogSuffix = '', pkgJsonSuffix = '', showName } = opts || {};
  try {
    const pkgJsonFile = `${root}/package${pkgJsonSuffix}.json`;
    const pkg = await readJSONFile<PgkJson>(pkgJsonFile);
    const version = pkg.version;
    const pkgName = showName ? `(${pkg.name})` : '';

    const tag = opts?.tag || version.split('-')[1]?.split('.')[0];
    const tagArg = tag ? `--tag ${tag}` : '';

    await $([
      `cd ${distFolder}`,
      `npm publish  --access public ${tagArg}`,
      `cd ..`,
      `git add ${pkgJsonFile} ${root}/CHANGELOG${changelogSuffix}.md`,
      `git commit -m "release${pkgName}: v${version}"`,
    ]);
  } catch (err) {
    logThenExit1(err);
  }
};

// ===========================================================================
