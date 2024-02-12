export const normalizeTSCfgPaths = (tsConfigs?: Array<string>): Array<string> => [
  './tsconfig.json',
  ...(tsConfigs || [])
    .map((path) =>
      `./${`${path.trim()}/tsconfig.json`.replace(/(?:\.\/+)+/, '')}`
        .replace(/\/\.\//g, '/')
        .replace(/\.json\/tsconfig\.json$/, '.json')
        .replace(/\/{2,}/, '/')
    )
    .filter((path) => path !== './tsconfig.json')
    .sort()
    .filter((path, i, arr) => i === 0 || path !== arr[i - 1]),
];
