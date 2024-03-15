import { describe, expect, test } from 'bun:test';

import { distFolder } from './package.js';
import { getLatestVersion } from './package.privates.js';

describe('distFolder', () => {
  test('is _npom-lib', () => {
    expect(distFolder).toBe('_npm-lib');
  });
});

describe('getLatestVersion', () => {
  const upcoming = `- feat: New features\n- fix: Bugfix\n\n`;

  const tests: Array<{
    title: string;
    input: Parameters<typeof getLatestVersion>[0];
    expected: ReturnType<typeof getLatestVersion>;
  }> = [
    {
      title: 'returns undefined oldVersionArr when version header is missing',
      input: '- feat: Initial release\n',
      expected: {
        oldVersionArr: [0, 0, 0],
        oldVersionHeaderIdx: -1,
      },
    },
    {
      title: 'returns undefined oldVersionArr when changelog is empty',
      input: '',
      expected: {
        oldVersionArr: [0, 0, 0],
        oldVersionHeaderIdx: -1,
      },
    },
    {
      title: 'returns undefined oldVersionArr when version header is empty',
      input: '## \n- feat: Something\n',
      expected: {
        oldVersionArr: undefined,
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'finds a simple version header',
      input: '##  1.23.456 \n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 23, 456],
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'finds a simple version header after some text',
      input: `${upcoming}##  1.23.456 \n- feat: Something\n`,
      expected: {
        oldVersionArr: [1, 23, 456],
        oldVersionHeaderIdx: upcoming.length,
      },
    },
    {
      title: 'picks the later version from a range',
      input: '## 1.23.456 -  1.23.567 \n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 23, 567],
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'picks the later version from a range after some text',
      input: `${upcoming}## 1.23.456 -  1.23.567 \n- feat: Something\n`,
      expected: {
        oldVersionArr: [1, 23, 567],
        oldVersionHeaderIdx: upcoming.length,
      },
    },
    {
      title: 'allows for an en dash in a range',
      input: '##  1.23.456 – 1.23.567 \n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 23, 567],
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'allows for an em dash in a range',
      input: '##  1.23.456 — 1.23.567 \n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 23, 567],
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'spaces are optional in a range',
      input: '## 1.23.456—1.23.567\n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 23, 567],
        oldVersionHeaderIdx: 0,
      },
    },

    {
      title: 'only checks the first H2 (##) header',
      input: '## Surprise!!\n\nWat!?\n\n## 1.0.0\n\n- feat: Something\n',
      expected: {
        oldVersionArr: undefined,
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'does NOT tolerate spaces in versions',
      input: '## 1. 0.0\n\n- feat: Something\n',
      expected: {
        oldVersionArr: undefined,
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'supports prerelease versions',
      input: '## 1.0.0-beta.1\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 0, 0],
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'supports build numbers in versions',
      input: '## 1.0.0+beta.1\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 0, 0],
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'supports prerelease versions in a range',
      input: '## 1.0.0 – 1.0.1-beta.1\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 0, 1],
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'supports prerelease versions in a range',
      input: '## 1.0.0-beta.1 – 1.0.1-beta.3\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 0, 1],
        oldVersionHeaderIdx: 0,
      },
    },
  ];

  tests.forEach(({ title, input, expected }) => {
    test(title, () => {
      expect(getLatestVersion(input)).toEqual(expected);
    });
  });
});
