import { normalizeTSCfgPaths } from './checking.privates.js';
import { $, runPkgBin } from './utils.js';

type LintOpts = {
  autofix?: boolean;
  silent?: boolean;
  errorsonly?: boolean;
};

const eslint = ({ autofix, errorsonly, silent }: LintOpts = {}) =>
  runPkgBin +
  [
    `eslint`,
    autofix ? '--fix' : '',
    silent ? '-o /dev/null' : '',
    errorsonly ? '--quiet' : '',
    `--ignore-path .gitignore  "**/*.{cjs,js,ts,tsx}"`,
  ].join(' ');

const prettier = ({ autofix, silent, errorsonly }: LintOpts = {}) =>
  runPkgBin +
  [
    `prettier`,
    autofix ? '--write' : '--check',
    silent ? '--loglevel=error' : '',
    errorsonly ? '--loglevel=error' : '',
    `--no-error-on-unmatched-pattern --ignore-path .gitignore "**/*.{json,md,yml,css,html}"`,
  ].join(' ');

// ===========================================================================

type CheckOpts = {
  /**
   * Controls whether the check should hard exit on errors, or merely reject
   * the promise to allow you to handle the error (and possibly exit) manually.
   *
   * Default: `false`
   */
  continueOnError?: boolean;
};

// ===========================================================================

/**
 * Lints the project's sources using ESLint and Prettier.\
 * Reports all warnings and errors, but DOES NOT EXIT.\
 * Does NOT auto-fix anyting.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#lintsources
 */
export const lintSources = async (): Promise<void> => {
  let ok = true;
  const swallowError = () => {
    ok = false;
  };
  await $(eslint(), true).catch(swallowError);
  await $(prettier(), true).catch(swallowError);
  if (ok as boolean) {
    console.info('\n🎂 No issues found');
  }
};

// ===========================================================================

type TypeCheckOpts = ErrorCheckOpts & {
  /**
   * If `true`, the type-checker will watch the files for changes.
   *
   * Default: `false`
   */
  watch?: boolean;
};

/**
 * Type-checks the project's sources using TypeScript's tsc.\
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#typechecksources
 */
export const typeCheckSources = async (opts: TypeCheckOpts = {}): Promise<void> => {
  const watchFlags = opts.watch ? '--watch --preserveWatchOutput' : '';
  await Promise.all(
    normalizeTSCfgPaths(opts.tsWorkspaces).map((tsConfig) =>
      $(
        `${runPkgBin}tsc --project ${tsConfig} --noEmit ${watchFlags} --pretty --incremental false`,
        opts.continueOnError
      )
    )
  );
  if (!opts.watch) {
    console.info('\n🎂 No errors found');
  }
};

// ===========================================================================

type ErrorCheckOpts = {
  /**
   * An array additional TypeScript workspaces to type-check.\
   * Can be either a relative path to a tsconfig file, or a folder that
   * containings a file called `tsconfig.json`.
   *
   * Default: `undefined`
   *
   * @see https://github.com/maranomynet/libtools/tree/v0.1#errorchecksources
   */
  tsWorkspaces?: Array<string>;
} & CheckOpts;

/**
 * Error-checks the project's sources using ESLint and the TypeScript's tsc.\
 * It ignores warnings, but exits if errors are found.\
 * Does NOT auto-fix anyting.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#errorchecksources
 */
export const errorCheckSources = async (opts: ErrorCheckOpts = {}): Promise<void> => {
  await $(eslint({ errorsonly: true }), opts.continueOnError);
  await typeCheckSources(opts); // Handles emitting "No errors found" message
};

// ===========================================================================

/**
 * Formats auto-fixes the project's sources using Prettier and ESLint.\
 * Auto-fixes all auto-fixable issues, but does NOT report anything.\
 * Exits if errors are found.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#formatsources
 */
export const formatSources = async (opts: CheckOpts = {}): Promise<void> => {
  await $(prettier({ autofix: true, silent: true }), opts.continueOnError);
  await $(eslint({ autofix: true, silent: true }), opts.continueOnError);
  console.info('\n🎂 Finished formatting');
};

// ===========================================================================
