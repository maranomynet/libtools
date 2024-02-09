import { describe, expect, test } from 'bun:test';

import { runCmd, Runner, runner, setRunner } from './utils.js';

describe('Script Runner', () => {
  test('runner and runCmd', () => {
    expect(runner).toBe('bun');
    expect(runCmd).toBe('bun run --bun ');
  });
  test('setRunner', () => {
    expect(setRunner('npm')).toBeUndefined();
    expect(runner).toBe('npm');
    expect(runCmd).toBe('npm run ');
  });
  test('setRunner handles bad input by falling back to initial default', () => {
    // @ts-expect-error  (testing bad input)
    const badRunner: Runner = 'bad';
    setRunner(badRunner);
    expect(runner).toBe('bun');
    expect(runCmd).toBe('bun run --bun ');
  });
});
