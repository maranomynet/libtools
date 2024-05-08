# `@maranomynet/libtools`

Helper functions for people authoring npm packages. They are opinionated and
eccentric, but they work surprisingly well.

```
npm install --save-dev @maranomynet/libtools
yarn add --dev @maranomynet/libtools
bun add --dev @maranomynet/libtools
```

**Contents:**

<!-- prettier-ignore-start -->

- [Features](#features)
- [Build / Publish Helpers.](#build--publish-helpers)
  - [`buildNpmLib`](#buildnpmlib)
  - [`updatePkgVersion`](#updatepkgversion)
  - [`getPkgVersion`](#getpkgversion)
  - [`publishToNpm`](#publishtonpm)
  - [`distFolder`](#distfolder)
- [Code Quality Helpers.](#code-quality-helpers)
  - [`errorCheckSources`](#errorchecksources)
  - [`typeCheckSources`](#typechecksources)
  - [`lintSources`](#lintsources)
  - [`formatSources`](#formatsources)
- [Misc Utilities](#misc-utilities)
  - [`args` Object](#args-object)
  - [`argStrings` Object](#argstrings-object)
  - [`shell$`](#shell)
  - [Script and Package Binary Runner](#script-and-package-binary-runner)
  - [Logging and Errors](#logging-and-errors)
  - [`promptYN`](#promptyn)
- [Type Testing Helpers](#type-testing-helpers)
  - [Type `Expect<T>`](#type-expectt)
  - [Type `Equals<A, B>`](#type-equalsa-b)
  - [Type `Extends<A, B>`](#type-extendsa-b)
  - [Type `NotExtends<A, B>`](#type-notextendsa-b)
- [Contributing](#contributing)
- [Change Log](#change-log)

<!-- prettier-ignore-end -->

---

## Features

> **NOTE:**  
> This "features" chapter is a bit rough. It's a work in progress. The rest of
> this readme, however, is quite complete.

These functions are convention-based and opinionated. They are designed to
help you use TypeScript to author npm packages that are easy to maintain,
build and publish.

The published packages are dual-format (CommonJS and ES modules) and include
type definitions, and are extremely lightweight and free of unnecessary
dev-related files.

The project must contain a file called `tsconfig.build.json` with `include`
and `exclude` fields that describe the files to be treated as entrypints and
added to the published package.json's `exports` field.

If your package contains a `pkg.bin` field, the `buildNpmLib` function will
exclude its contents from the `pkg.exports` field.

Your `package.json` should be set to `private: true` and contain a
`npmPackageJson` field with overrides for the dist `package.json`.

The project's `CHANGELOG.md` MUST follow the same format as the one in this
project.

The `.gitignore` file must also contain the following line:

```sh
/_npm-lib
```

**Example `pkg.npmPackageJson`:**

```json
  "npmPackageJson": {
    "type": null,
    "private": null,
    "scripts": null,
    "devDependencies": null,
    "engines": null,
    "sideEffects": false,
  }
```

(NOTE: Fields with `null` are removed from the published dist `package.json`
file.)

**Example `tsconfig.build.json`:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2018",
    "resolveJsonModule": false,
    "noEmit": false,
    "declaration": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": [
    "src/**/*.test.*",
    "src/**/*.privates.*",
    "src/**/_*/*",
    "src/**/*.d.ts"
  ]
}
```

**Example `pgk.scripts`**

```json
  "scripts": {
    "dev": "bun install  &&  bun test --watch",
    "build": "bun scripts/build.ts",
    "publish:lib": "bun scripts/publish.ts",
    "prepublishOnly": "echo \"\nRun 'bun run publish:lib' to publish this package\n\n\"  &&  exit 1",
    "check": "bun scripts/checkErrors.ts"
  },
```

(This example uses the `bun` runtime, but you can easily use `yarn` or `npm`
if you prefer.)

---

## Build / Publish Helpers.

---

### `buildNpmLib`

**Syntax:** `buildNpmLib(opts?: BuildNpmLibOpts): Promise<void>`

Reads `./tsconfig.build.json` for include and exclude patterns and uses them
as entry points to build the CommonJS and ESM versions of the library into the
[`distFolder`](#distdir) folder.

```ts
import { buildNpmLib } from '@maranomynet/libtools';

await buildNpmLib(); // Exits on errors.
```

**`BuildNpmLibOpts`**:

- **`srcDir`**`?: string` — (Default: `'src'`)  
  The source folder where the build entry points are located.
- **`postProcess`**`?: (jsFileContents: string, fileName: string, type: 'cjs' | 'esm') => string | undefined | Promise<string | undefined>`
  — (Default: `undefined`)  
  A function to post-process the tsc built `.js` files. It should return the
  new/updated content for the `.js` file, or `undefined` if no changes were
  made.
- **`type`**`?: 'esm' | 'commonjs' | 'both'` — (Default: `'both'`)  
  The type of module to build: `'esm'`, `'commonjs'`, or `'both'`.
- **`root`**`?: string` — (Default: `'.'`)  
  The root folder of the project/package.
- **`pkgJsonSuffix`**`?: string` — (Default: `''`)  
  Optional suffix to append to the `package.json` file before the `.json` file
  extension.
- **`changelogSuffix`**`?: string` — (Default: `''`)  
  Optional suffix to append to the `CHANGELOG.md` file before the `.md` file
  extension.
- **`readmeSuffix`**`?: string` — (Default: `''`)  
  Optional suffix to append to the `README.md` file before the `.md` file
  extension.

---

### `updatePkgVersion`

**Syntax:** `updatePkgVersion(opts?: UpdatePkgVersionOpts): Promise<void>`

Auto-updates the `package.json` and `CHANGELOG.md` files with a new version
and release date, based on the "## Upcoming..." entries in the changelog, and
their conventional commit prefixees (`**BREAKING**`, `feat:`, `fix:`, `docs:`)

Prompts the user to confirm the new version number, before writing any changes
to disk.

Exits if any problems are found.

```ts
import { updatePkgVersion } from '@maranomynet/libtools';

await updatePkgVersion(); // Exits on errors.
// Now you can build and publish the package!!
```

**`UpdatePkgVersionOpts`**:

- **`preReleaseName`**`?: string` — (Default: `''`)  
  Optional pre-release name to append to the version number. (e.g. `'beta.1'`)
- **`offerDateShift`**`?: boolean` — (Default: `false`)  
  Should the user be offered to shift the release date N days into the future.
- **`root`**`?: string` — (Default: `'.'`)  
  The root directory of the project/package.
- **`changelogSuffix`**`?: string` — (Default: `''`)  
  Optional suffix to append to the `CHANGELOG.md` file before the `.md` file
  extension.
- **`pkgJsonSuffix`**`?: string` — (Default: `''`)  
  Optional suffix to append to the `package.json` file before the `.json` file
  extension.
- **`versionKey`**`?: string` — (Default: `'version'`)  
  Optional custom `pkg.*` key to read.

---

### `getPkgVersion`

**Syntax:** `getPkgVersion(options?: PackageVersionOpts): Promise<string>`

Reads the current `version` field from the `./package.json` file and returns
it.

Errors (but does not exit) if the string does not roughly match the semver
format.

```ts
import { getPkgVersion } from '@maranomynet/libtools';

const version: string = await getPkgVersion();
```

**`PackageVersionOpts`**:

- **`root`**`?: string` — (Default: `'.'`)  
  The root directory of the project/package.
- **`pkgJsonSuffix`**`?: string` — (Default: `''`)  
  Optional suffix to append to the `package.json` file before the `.json` file
  extension.
- **`versionKey`**`?: string` — (Default: `'version'`)  
  Optional custom `pkg.*` key to read.

---

### `publishToNpm`

**Syntax:** `publishToNpm(opts?: PublishToNpmOpts): Promise<void>`

Publishes the library to npm (using `npm publish`) and commits the
`CANGELOG.md` and `package.json` changes to the local git repo.

Exits if any problems are found.

```ts
import { publishToNpm } from '@maranomynet/libtools';

// First, update the package version and run build and tests, etc.
await publishToNpm(); // Exits on errors.
```

**`PublishToNpmOpts`**:

- **`showName`**`?: boolean` — (Default: `false`)  
  Should the package name be displayed in the "release:" commit message.
- **`root`**`?: string` — (Default: `'.'`)  
  The root directory of the project/package.
- **`pkgJsonSuffix`**`?: string` — (Default: `''`)  
  Optional suffix to append to the `package.json` file before the `.json` file
  extension.
- **`changelogSuffix`**`?: string` — (Default: `''`)  
  Optional suffix to append to the `CHANGELOG.md` file before the `.md` file
  extension.

---

### `distFolder`

**Syntax:** `distFolder: '_npm-lib'`

The directory where the built package will be placed.

```ts
import { distFolder } from '@maranomynet/libtools';

console.log(distFolder); // '_npm-lib'
```

This directory is not configurable, and should be added to your `.gitignore`
file and VSCode's `search.exclude` setting:

```json
  "search.exclude": {
     "_npm-lib/*": true
  },
```

---

## Code Quality Helpers.

This package offers a few tools to ensure code quality. They assume you have
ESLint and Prettier installed and configured.

**Shared options:**

- **`continueOnError`** — (Default: `false`)  
  Controls whether the check should hard exit on errors, or merely reject the
  promise to allow you to handle the error (and possibly exit) manually.

### `errorCheckSources`

**Syntax:**
`errorCheckSources(opts?: { tsWorkspaces?: Array<string>, continueOnError?: boolean }): Promise<void>`

Error-checks the project's sources using ESLint and the TypeScript compiler.
It ignores warnings, but exits if errors are found. Does NOT auto-fix
anything.

**Exra Options:**

- **`tsWorkspaces`**`?: Array<string>` — (Default: `[]`)  
   An array additional TypeScript workspaces to type-check.\
   Can be either a relative path to a tsconfig file, or a folder that containings
  a file called `tsconfig.json`.

```ts
import { errorCheckSources } from '@maranomynet/libtools';

await errorCheckSources(); // Exits on errors.

// or...
await errorCheckSources({ continueOnError: true }).catch((err) => {
  // do something custom
});

// multi-workspace:
await errorCheckSources({
  tsWorkspaces: ['api-server', './tsconfig.testserver.json'],
});
// Runs tsc for:
//  - `./tsconfig.json`  (<-- always checked!)
//  - `./api-server/tsconfig.json`
//  - `./tsconfig.testserver.json`
```

---

### `typeCheckSources`

**Syntax:**
`typeCheckSources(opts?: { tsWorkspaces?: Array<string>, watch?: boolean, continueOnError?: boolean }): Promise<void>`

Type-checks the project's sources using TypeScript's `tsc`.

Has the same options as [`errorCheckSources`](#errorchecksources), plus:

- **`watch`**`?: boolean` — (Default: `false`)  
  If `true`, the type-checker will watch the files for changes.

```ts
import { typeCheckSources } from '@maranomynet/libtools';

await typeCheckSources(); // Exits on errors.

// or...
typeCheckSources({ watch: true }); // Does not exit on errors.

// multi-workspace:
await typeCheckSources({
  tsWorkspaces: ['api-server', './tsconfig.testserver.json'],
  watch: true,
});
// typechecks and watches all workspaces
```

---

### `lintSources`

**Syntax:** `lintSources(opts?: { continueOnError?: boolean }): Promise<void>`

Lints the project's sources using ESLint and Prettier. Reports all warnings
and errors, but DOES NOT EXIT. Does NOT auto-fix anyting.

```ts
import { lintSources } from '@maranomynet/libtools';

await lintSources();
```

---

### `formatSources`

**Syntax:**
`formatSources(opts?: { continueOnError?: boolean }): Promise<void>`

Formats auto-fixes the project's sources using Prettier and ESLint. Auto-fixes
all auto-fixable issues, but does NOT report anything. Exits if errors are
found.

```ts
import { formatSources } from '@maranomynet/libtools';

await formatSources(); // Exits on errors.

// or...
await formatSources({ continueOnError: true }).catch((err) => {
  // do something custom
});
```

---

## Misc Utilities

---

### `args` Object

**Syntax:** `Record<string, string | boolean | undefined>`

The command line arguments passed to the script, parsed into an object where
the keys are the argument names and the values are the argument values.

For example, if you call your script like this:

```sh
bun  my-script.ts  --foo=bar  --baz  --smu=false
```

…then in `my-script.ts`:

```ts
import { args } from '@maranomynet/libtools';

console.log(args);
// {
//   foo: 'bar',
//   baz: true,
//   smu: false
// }
```

---

### `argStrings` Object

**Syntax:** `Record<string, string | undefined>`

Filtered convenience clone of `args` with all `boolean` values removed.

So, if you call your script like this:

```sh
bun  my-script.ts  --foo=bar  --baz  --smu=false
```

…then in `my-script.ts`:

```ts
import { argStrings } from '@maranomynet/libtools';

console.log(argStrings);
// {
//   foo: 'bar',
// }
```

The argument parsing is currenly very simple and stupid:

1. Spaces are used to separate arguments.
2. Quotation marks CAN NOT be used to group arguments.
3. Equals signs (`=`) between key and value must NOT have any spaces around
   them.
4. Literal `true` or `false` (case-insensitive) values are converted to a
   `boolean`.

### `shell$`

**Syntax:**
`shell$(cmd: string | Array<string | Falsy>, continueOnError?: boolean): Promise<void>`

A wrapper around Node.js' `child_process.exec` command that returns a promise
and pipes the output to the current process' stdout and stderr.

If you pass an array of commands, they will be joined with `' && '` (after
filtering out all falsy values).

If `continueOnError` is `true`, the process will simply throw (i.e. reject the
Promise) instead of exiting the `process` with code `1`.

```ts
import { shell$ } from '@maranomynet/libtools';

await shell$('NAME=World; echo "Hello ${NAME}!"');
// Logs: "Hello World!"

const dir = 'some-dir';
// These commands are joined with ' && ' before execution
await shell$([
  `mkdir ${dir}`,
  `cd ${dir}`,
  `echo "Hello World!" > hello.txt`,
  null, // Falsy values are ignored/filtered
  `cd -`,
]);
```

<!-- #fragment anchor(s) to not break older v0.1 @see links -->

<a name="script-runner"></a>

### Script and Package Binary Runner

There are different ways of running scripts and package binaries, depending on
whether you're using `npm`, `yarn` or `bun`.

Libtools tries to auto-detect which runner you're using, based on the presence
of `bun.lockb` and `yarn.lock` files — falling back to `npm` as a default.

```ts
import {
  runner,
  runScript,
  runPkgBin,
  setRunner,
} from '@maranomynet/libtools';

console.log(runner); // ??? (auto-detected for your project, defaults to 'npm')

setRunner('npm'); // Force "npm" as the runner (for example)

console.log(runner); // 'npm'
console.log(runScript); // 'npm run '
console.log(runPkgBin); // 'npm exec -- '
```

The `runScript` string is a prefix that can be used to run a `package.json`
script using the current runner, whereas `runPkgBin` executes the package
binary of an installed dependency. For example:

```ts
import { ruScript, runPkgBin, shell$ } from '@maranomynet/libtools';

await shell$(runScript + 'test'); // runs pkg.scripts.test
await shell$(runPkgBin + 'vitest --watch'); // runs node_modules/.bin/vitest
```

### Logging and Errors

This package also includes a few convenience functions for handling thrown
errors, rejected Promises and other script failures.

```ts
import {
  exit1,
  logThenExit1,
  logError,
  ignoreError,
} from '@maranomynet/libtools';

const rejected = Promise.reject(new Error('Oops!'));

rejected.catch(exit1); // Immediate `process.exit(1)`
// or...
rejected.catch(logThenExit1); // Logs the error, then exits with code 1
// or...
rejected.catch(logError); // Console logs the error and then continues
// or...
rejected.catch(ignoreError); // Ignores the error and continues
```

### `promptYN`

**Syntax:**
`promptYN(question: string, defAnswer?: 'y'|'n'): Promise<boolean>`

Prompts the user with a question and returns a promise that resolves to `true`
if the user enters "y" or "Y" and `false` if the user enters "n" or "N".

```ts
import { promptYN } from '@maranomynet/libtools';

const userAccepted: boolean = await promptYN('Do you want to continue?');
// Do you want to continue?  [Y]n  ▍

const deleteAll = await promptYN('Delete all the things?', 'n');
// Delete all the things?  y[N]  ▍
```

---

## Type Testing Helpers

---

### Type `Expect<T>`

Expects `T` to be `true`

```ts
import type { Expect } from '@reykjavik/hanna-utils';

type OK = Expect<true>;
type Fails = Expect<false>; // Type Error
```

---

### Type `Equals<A, B>`

Returns true if types `A` and `B` are equal (and neither is `any`)

```ts
import type { Equals, Expect } from '@reykjavik/hanna-utils';

type OK = Expect<Equals<'same', 'same'>>;
type Fails = Expect<Equals<'not', 'same'>>; // Type Error
```

---

### Type `Extends<A, B>`

Returns true if type `A` extends type `B` (and neither is `any`)

```ts
import type { Extends, Expect } from '@reykjavik/hanna-utils';

type OK = Expect<Extends<'some', string>>;
type Fails = Expect<Extends<string, 'some'>>; // Type Error
```

---

### Type `NotExtends<A, B>`

Returns true if type `A` does **NOT** extend type `B` (and neither is `any`)

```ts
import type { NotExtends, Expect } from '@reykjavik/hanna-utils';

type OK = Expect<NotExtends<string, 'some'>>;
type Fails = Expect<NotExtends<'some', string>>; // Type Error
type FailsAlso = Expect<NotExtends<'same', 'same'>>; // Type Error
```

---

## Contributing

This project uses the [Bun runtime](https://bun.sh) for development (tests,
build, etc.)

PRs are welcoms!

---

## Change Log

See
[CHANGELOG.md](https://github.com/maranomynet/libtools/blob/dev/CHANGELOG.md)
