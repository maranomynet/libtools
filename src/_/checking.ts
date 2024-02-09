import { $, ignoreError, runCmd } from './utils.js';

type LintOpts = {
  autofix?: boolean;
  silent?: boolean;
  errorsonly?: boolean;
};

const eslint = ({ autofix, errorsonly, silent }: LintOpts = {}) =>
  [
    `eslint`,
    autofix ? '--fix' : '',
    silent ? '-o /dev/null' : '',
    errorsonly ? '--quiet' : '',
    `--ignore-path .gitignore  "**/*.{cjs,js,ts,tsx}"`,
  ].join(' ');

const prettier = ({ autofix, silent, errorsonly }: LintOpts = {}) =>
  [
    `prettier`,
    autofix ? '--write' : '--check',
    silent ? '--loglevel=error' : '',
    errorsonly ? '--loglevel=error' : '',
    `--no-error-on-unmatched-pattern --ignore-path .gitignore "**/*.{json,md,yml,css,html}"`,
  ].join(' ');

// ===========================================================================

type CheckOpts = {
  continueOnError?: boolean;
};

// ===========================================================================

/**
 * Lints the project's sources using ESLint and Prettier.\
 * Reports all warnings and errors, but DOES NOT EXIT.\
 * Does NOT auto-fix anyting.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.0#lintsources
 */
export const lintSources = async (): Promise<void> => {
  await $(runCmd + eslint(), true).catch(ignoreError);
  await $(runCmd + prettier(), true).catch(ignoreError);
};

// ===========================================================================

/**
 * Error-checks the project's sources using ESLint and the TypeScript's tsc.\
 * It ignores warnings, but exits if errors are found.\
 * Does NOT auto-fix anyting.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.0#errorchecksources
 */
export const errorCheckSources = async (opts: CheckOpts = {}): Promise<void> => {
  await $(runCmd + eslint({ errorsonly: true }), opts.continueOnError);
  await $(
    `${runCmd}tsc --project tsconfig.json --noEmit --pretty --incremental false`,
    opts.continueOnError
  );
};

// ===========================================================================

/**
 * Formats auto-fixes the project's sources using Prettier and ESLint.\
 * Auto-fixes all auto-fixable issues, but does NOT report anything.\
 * Exits if errors are found.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.0#formatsources
 */
export const formatSources = async (opts: CheckOpts = {}): Promise<void> => {
  await $(runCmd + prettier({ autofix: true, silent: true }), opts.continueOnError);
  await $(runCmd + eslint({ autofix: true, silent: true }), opts.continueOnError);
};

// ===========================================================================
