import { describe, expect, test } from 'bun:test';

import { distFolder } from './package.js';

describe('distFolder', () => {
  test('is _npom-lib', () => {
    expect(distFolder).toBe('_npm-lib');
  });
});
