import { describe, expect, test } from 'bun:test';

import { _normalizeTSCfgPaths } from './checking.js';

describe('normalizeTSCfgPaths', () => {
  const tests: Array<{
    title: string;
    input: Parameters<typeof _normalizeTSCfgPaths>[0];
    expected: ReturnType<typeof _normalizeTSCfgPaths>;
  }> = [
    {
      title: 'accepts undefined',
      input: undefined,
      expected: ['./tsconfig.json'],
    },
    {
      title: 'accepts empty array',
      input: [],
      expected: ['./tsconfig.json'],
    },
    {
      title: 'accepts paths',
      input: ['a', 'b/c', 'd/e/f/'],
      expected: [
        './tsconfig.json',
        './a/tsconfig.json',
        './b/c/tsconfig.json',
        './d/e/f/tsconfig.json',
      ],
    },
    {
      title: 'accepts custom .json files',
      input: ['b/tsconfig.json', 'd/e/f.json/', 'foo.json', 'tsconfig.json/'],
      expected: [
        './tsconfig.json',
        './b/tsconfig.json',
        './d/e/f.json/tsconfig.json',
        './foo.json',
        './tsconfig.json/tsconfig.json',
      ],
    },
    {
      title: 'collapses duplicates',
      input: [
        '.',
        './',
        'tsconfig.json',
        'api-server',
        './tsconfig.json',
        '././//./tsconfig.json',
        './api-server///tsconfig.json',
      ],
      expected: ['./tsconfig.json', './api-server/tsconfig.json'],
    },
  ];

  tests.forEach(({ title, input, expected }) => {
    test(title, () => {
      expect(_normalizeTSCfgPaths(input)).toEqual(expected);
    });
  });
});
