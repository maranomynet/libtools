import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';

// ===========================================================================

/**
 * The command line arguments passed to the script, parsed into an object
 * where the keys are the argument names and the values are the argument values.
 *
 * For example, if the script is called with `--foo=bar --baz --smu=false`, then `args` will be:
 * `{ foo: 'bar', baz: true, smu: false }`
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#args-object
 */
const _args: Record<string, string | boolean | undefined> = {};

/**
 * Filtered convenience clone of `args` with all `boolean` values removed.
 *
 * For example, if the script is called with `--foo=bar --baz --smu=false`, then `args` will be:
 * `{ foo: 'bar' }`
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#argstrings-object
 */
const _argStrings: Record<string, string | undefined> = {};

process.argv.slice(2).forEach((arg) => {
  const [key, value] = arg.replace(/^-+/, '').split('=');
  if (!key) {
    return;
  }
  const lowerValue = value?.toLowerCase();
  const argValue =
    value == null || lowerValue === 'true'
      ? true
      : lowerValue === 'false'
      ? false
      : value;
  _args[key] = argValue;
  if (argValue && typeof argValue === 'string') {
    _argStrings[key] = argValue;
  }
});

export const args: Readonly<typeof _args> = _args;
export const argStrings: Readonly<typeof _argStrings> = _argStrings;

// ===========================================================================
// Logging and Errors

/**
 * Shorthand for immediate `process.exit(1)`.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#logging-and-errors
 */
export const exit1 = () => process.exit(1);

/**
 * Logs trown error message to the console and then continues
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#logging-and-errors
 */
export const logError = (err: unknown): void => {
  const message =
    !err || typeof err !== 'object'
      ? String(err)
      : 'output' in err && Array.isArray(err.output)
      ? err.output.join('\n').trim()
      : String('message' in err ? err.message : err);

  console.info('--------------------------');
  console.error(message);
};

/**
 * Calls `logError` and then exits the `process` with code 1.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#logging-and-errors
 */
export const logThenExit1 = (err: unknown) => {
  logError(err);
  process.exit(1);
};

/**
 * Sugar No-op function that signals to the reader that the error is being
 * intentionally ignored.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#logging-and-errors
 */
export const ignoreError = () => undefined;

// ===========================================================================

type Falsy = undefined | null | false | 0;

/**
 * A wrapper around Node.js' `child_process.exec` command that returns a
 * promise and pipes the output to the current process' stdout and stderr.
 *
 * If you pass an array of commands, they will be joined with `' && '` (after
 * filtering out all falsy values).
 *
 * If `continueOnError` is `true`, the process will simply throw (i.e. reject
 * the Promise) instead of exiting the `process` with code `1`.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#shell$
 */
export const $ = (
  cmd: string | Array<string | Falsy>,
  continueOnError?: boolean
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (Array.isArray(cmd)) {
      cmd = cmd.filter((cmdItem) => !!cmdItem).join(' && ');
    }
    if (!cmd) {
      logThenExit1('No command to execute');
    }

    const execProc = exec(cmd, (error) => {
      if (!error) {
        resolve(undefined);
      } else if (continueOnError) {
        reject(error);
      } else {
        exit1();
      }
    });
    const killProc = () => {
      execProc.kill();
    };
    process.on('exit', killProc);
    execProc.once('close', () => {
      process.off('exit', killProc);
    });
    execProc.stdout?.pipe(process.stdout);
    execProc.stderr?.pipe(process.stderr);
  });

// ===========================================================================

/**
 * Prompts the user with a question and returns a promise that resolves to
 * `true` if the user enters "y" or "Y" and `false` if the user enters "n" or "N".
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#promptyn
 */
export const promptYN = async (
  question: string,
  defAnswer?: 'y' | 'n'
): Promise<boolean> => {
  const defaultAnswer = defAnswer || 'y';
  const options = defaultAnswer === 'n' ? 'y[N]' : '[Y]n';

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  let answer = await readline.question(`${question}  ${options}  `);
  readline.close();

  answer = answer.trim().toLowerCase() || defaultAnswer;

  return /^y(?:es)?/.test(answer)
    ? true
    : /^n(?:o)?/.test(answer)
    ? false
    : promptYN('Please enter "y" or "n"');
};

// ===========================================================================

export type JSONValue = string | number | boolean | null | JSONArray | JSONObject;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = Array<JSONValue>;

/**
 * Reads a *.json file and returns the parsed JSON.
 */
export const readJSONFile = <Ret extends JSONObject>(path: string): Promise<Ret> => {
  if (!path.endsWith('.json')) {
    throw new Error(`"${path}" does not end with ".json"`);
  }
  return readFile(path).then((buffer) => JSON.parse(buffer.toString()));
};

// ===========================================================================

export type Runner = 'npm' | 'yarn' | 'bun';

const _defaultRunner: Runner = /*#__PURE__*/ (() => {
  const runtime =
    existsSync('./bun.lockb') || existsSync('./bun.lock')
      ? 'bun'
      : existsSync('./yarn.lock')
      ? 'yarn'
      : undefined;
  if (runtime) {
    console.info(`${runtime} detected 👀`);
  }
  return runtime || 'npm';
})();

/**
 * The package manager used to run node scripts. One of: 'npm', 'yarn' or 'bun'.
 *
 * Defaults to 'npm' if no lock file is found.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#script-and-package-binary-runner
 */
export let runner: Runner = _defaultRunner;

// ---------------------------------------------------------------------------

const _runScriptCmds: Record<Runner, string> = {
  bun: 'bun run --bun ',
  npm: 'npm run ',
  yarn: 'yarn run ',
};

const _runPkgBinCmds: Record<Runner, string> = {
  bun: 'bun run --bun ',
  npm: 'npm exec -- ',
  yarn: 'yarn run ',
};

/**
 * The prefix for running npm package scripts (for example within `shell$`
 * commands), using the currently set `runner`.
 *
 * One of:
 * - `npm run `
 * - `yarn run `
 * - `bun run --bun `
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#script-and-package-binary-runner
 */
export let runScript = _runScriptCmds[runner];

/** @deprecated Use `runScript` instead  (Will be removed in v0.2) */
export let runCmd = runScript;

/**
 * The prefix for running binaies of installed packages (for example within
 * `shell$` commands), using the currently set `runner`.
 *
 * One of:
 * - `npm exec -- `
 * - `yarn run `
 * - `bun run --bun `
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#script-and-package-binary-runner
 */
export let runPkgBin = _runPkgBinCmds[runner];

/**
 * Set the project `runner` manually, if the default auto-detection is not
 * working.
 *
 * @see https://github.com/maranomynet/libtools/tree/v0.1#script-and-package-binary-runner
 */
export const setRunner = (newRunner?: Runner) => {
  newRunner = newRunner && newRunner in _runScriptCmds ? newRunner : _defaultRunner;
  runner = newRunner;
  runScript = _runScriptCmds[newRunner];
  runCmd = runScript;
  runPkgBin = _runPkgBinCmds[newRunner];
};

// ===========================================================================
