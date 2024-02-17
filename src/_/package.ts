// import { describe, expect, test } from "bun:test";
import { sync as glob } from 'glob';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

import { getLatestVersion } from './package.privates.js';
import {
  $,
  JSONObject,
  JSONValue,
  logThenExit1,
  promptYN,
  readJSONFile,
  runCmd,
} from './utils.js';

type PgkJson = {
  version: string;
  name: string;
} & JSONObject;

// ===========================================================================

/**
 * Updates the changelog file with the new version and release date.
 */
// eslint-disable-next-line complexity
const updateChangelog = async (
  changelogFileName: string,
  opts?: Pick<UpdatePkgVersionOpts, 'offerDateShift'>
): Promise<{
  oldVersion: string;
  newVersion: string;
  newChangelog: string;
}> => {
  const { offerDateShift } = opts || {};
  const changelogFull = (await readFile(changelogFileName)).toString();
  const changelog = changelogFull.slice(0, 4000);
  const changelogTail = changelogFull.slice(4000);

  const upcomingHeader = '## Upcoming...';
  const addNewLines = '- ... <!-- Add new lines here. -->';

  let upcomingIdx = changelog.indexOf(upcomingHeader);
  if (upcomingIdx < 0) {
    throw new Error(`Could not find "${upcomingHeader}" header in ${changelogFileName}`);
  }
  upcomingIdx += upcomingHeader.length;

  const { oldVersionArr, oldVersionHeaderIdx } = getLatestVersion(
    changelog.slice(upcomingIdx)
  );
  if (!oldVersionArr) {
    throw new Error(`Could not find a valid "last version" in ${changelogFileName}`);
  }
  const oldVersion = oldVersionArr.join('.');

  if (
    oldVersion === '0.0.0' &&
    !(await promptYN('Are you ready for initial release?', 'n'))
  ) {
    throw new Error('Aborted by user');
  }

  const updates = changelog
    .slice(
      upcomingIdx,
      oldVersionHeaderIdx > 0 ? upcomingIdx + oldVersionHeaderIdx : undefined
    )
    .trim()
    .split(/\n\s*- /)
    .map((line) => line.trim().match(/^(\*\*BREAKING\*\*|feat:|fix:|docs:)/)?.[1])
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
  const newVersion = newVersionArr.join('.');

  const addNewLinesIdx = changelog.indexOf(addNewLines, upcomingIdx);
  if (addNewLinesIdx < 0) {
    throw new Error(
      `Could not find "${addNewLines}" marker at the top of ${changelogFileName}`
    );
  }

  const dayOffset: number = !offerDateShift
    ? 0
    : await new Promise((resolve) => {
        const readline = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        readline.question(`Delay release date by how many days? (0)  `, (answer) => {
          readline.close();
          resolve(parseInt(answer) || 0);
        });
      });
  const DAY_MS = 24 * 60 * 60 * 1000;
  const releaseDate = new Date(Date.now() + dayOffset * DAY_MS);

  const newChangelog =
    changelog.slice(0, addNewLinesIdx + addNewLines.length) +
    [
      '',
      '',
      `## ${newVersion}`,
      '',
      `_${releaseDate.toISOString().slice(0, 10)}_`,
      '',
    ].join('\n') +
    changelog.slice(addNewLinesIdx + addNewLines.length) +
    changelogTail;

  return { oldVersion, newVersion, newChangelog };
};

// ===========================================================================

export type UpdatePkgVersionOpts = {
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
    versionKey = 'version',
    changelogSuffix = '',
    pkgJsonSuffix = '',
  } = opts || {};

  const changelogFile = `${root}/CHANGELOG${changelogSuffix}.md`;
  const pkgFile = `${root}/package${pkgJsonSuffix}.json`;

  try {
    const pkg = await readJSONFile(pkgFile);

    const { oldVersion, newVersion, newChangelog } = await updateChangelog(
      changelogFile,
      { offerDateShift }
    );

    if (oldVersion !== pkg[versionKey]) {
      throw new Error(
        `Version mismatch between ${changelogFile} (${oldVersion}) and ${pkgFile} (${pkg[versionKey]})`
      );
    }

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
        `${runCmd}tsc --project ${tsCfgFile} --module CommonJS --outDir ${distFolder}`
      );
    }
    if (doESM) {
      await $(
        `${runCmd}tsc --project ${tsCfgFile} --module NodeNext --outDir ${distFolder}/esm`
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
          const moduleType = fileName.startsWith('esm/') ? 'esm' : 'commonjs';
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

    await $([
      `cd ${distFolder}`,
      `npm publish  --access public`,
      `cd ..`,
      `git add ${pkgJsonFile} ${root}/CHANGELOG${changelogSuffix}.md`,
      `git commit -m "release${pkgName}: v${version}"`,
    ]);
  } catch (err) {
    logThenExit1(err);
  }
};

// ===========================================================================
