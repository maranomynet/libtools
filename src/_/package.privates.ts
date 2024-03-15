export const getLatestVersion = (
  changelog: string
): {
  oldVersionArr: [number, number, number] | undefined;
  oldVersionHeaderIdx: number;
} => {
  const oldVersionHeaderIdx = changelog.indexOf('## ');

  let oldVersionArr =
    oldVersionHeaderIdx >= 0
      ? changelog
          .slice(oldVersionHeaderIdx, oldVersionHeaderIdx + 128)
          .match(
            /^##\s+(?:\d+\.\d+\.\d+(?:[-+][a-z0-9-.]+)?\s*[-–—]\s*)?(\d+)\.(\d+)\.(\d+)(?:[-+][a-z0-9-.]+)?\s*(?:\n|$)/
          )
          ?.slice(1)
          .map(Number)
      : [0, 0, 0];

  if (oldVersionArr && oldVersionArr.length !== 3) {
    oldVersionArr = undefined;
  }

  return {
    oldVersionArr: oldVersionArr as [number, number, number] | undefined,
    oldVersionHeaderIdx,
  };
};
