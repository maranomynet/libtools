import { describe, expect, test } from 'bun:test';

import { runCmd, Runner, runner, runPkgBin, runScript, setRunner } from './utils.js';

describe('Script Runner', () => {
  test('runner and runCmd', () => {
    expect(runner).toBe('bun'); // auto-detected as bun, because this library uses bun
    expect(runScript).toBe('bun run --bun ');
    expect(runCmd).toBe(runScript);
    expect(runPkgBin).toBe('bun run --bun ');
  });
  test('setRunner', () => {
    expect(setRunner('npm')).toBeUndefined();
    expect(runner).toBe('npm');
    expect(runScript).toBe('npm run ');
    expect(runCmd).toBe(runScript);
    expect(runPkgBin).toBe('npm exec -- ');
  });
  test('setRunner handles bad input by falling back to **initial** default', () => {
    // @ts-expect-error  (testing bad input)
    const badRunner: Runner = 'bad';
    setRunner(badRunner);
    expect(runner).toBe('bun');
    expect(runScript).toBe('bun run --bun ');
    expect(runCmd).toBe(runScript);
    expect(runPkgBin).toBe('bun run --bun ');
  });
});
