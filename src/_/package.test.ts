import { describe, expect, test } from 'bun:test';

import { _getLatestVersion, distFolder } from './package.js';

describe('distFolder', () => {
  test('is _npom-lib', () => {
    expect(distFolder).toBe('_npm-lib');
  });
});

describe('getLatestVersion', () => {
  const upcoming = `- feat: New features\n- fix: Bugfix\n\n`;

  const tests: Array<{
    title: string;
    input: Parameters<typeof _getLatestVersion>[0];
    expected: ReturnType<typeof _getLatestVersion>;
  }> = [
    {
      title: 'returns undefined oldVersionArr when version header is missing',
      input: '- feat: Initial release\n',
      expected: {
        oldVersionArr: [0, 0, 0],
        oldVersionHeaderIdx: 24,
      },
    },
    {
      title: 'returns undefined oldVersionArr when changelog is empty',
      input: '',
      expected: {
        oldVersionArr: [0, 0, 0],
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'returns undefined oldVersionArr when version header is empty',
      input: '## \n- feat: Something\n',
      expected: {
        oldVersionArr: [0, 0, 0],
        oldVersionHeaderIdx: 22,
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
      title: 'Looks past the first H2 (##) header', // important for skipping pre-release tag versions
      input: '## Surprise!!\n\nWat!?\n\n## 1.0.0\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 0, 0],
        oldVersionHeaderIdx: 22,
      },
    },
    {
      title: 'does NOT tolerate spaces in versions',
      input: '## 1. 0.0\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [0, 0, 0],
        oldVersionHeaderIdx: 29,
      },
    },
    {
      title: 'Skips/ignores prerelease versions',
      input: '## 1.0.0-beta.1\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [0, 0, 0],
        oldVersionHeaderIdx: 35,
      },
    },
    {
      title: 'Skips prerelease versions to pick up previous stable version',
      input: '## 1.0.0-beta.1\n\n- feat: Something\n\n## 0.5.0\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [0, 5, 0],
        oldVersionHeaderIdx: 36,
      },
    },
    {
      title: 'skips/ignores prerelease versions in a range',
      input: '## 1.0.0-beta.1+build1 – 1.0.77-beta.3\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [0, 0, 0],
        oldVersionHeaderIdx: 58,
      },
    },
    {
      title: 'skips prerelease versions in a range to pick up previous stable version',
      input:
        '## 1.0.7-beta.1 – 1.1.0-beta.3\n\n- feat: Something\n\n## 1.0.6\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 0, 6],
        oldVersionHeaderIdx: 51,
      },
    },

    {
      title: 'Ignores build numbers in versions',
      input: '## 1.0.0+build-123\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 0, 0],
        oldVersionHeaderIdx: 0,
      },
    },
    {
      title: 'ignores build numbers in a range',
      input: '## 1.0.0+build-1 – 1.0.77+build-3\n\n- feat: Something\n',
      expected: {
        oldVersionArr: [1, 0, 77],
        oldVersionHeaderIdx: 0,
      },
    },
  ];

  tests.forEach(({ title, input, expected }) => {
    test(title, () => {
      expect(_getLatestVersion(input)).toEqual(expected);
    });
  });
});
