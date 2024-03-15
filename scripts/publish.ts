import { argStrings, publishToNpm, updatePkgVersion } from '@maranomynet/libtools';

await updatePkgVersion({ preReleaseName: argStrings.prerelease });
await import('./build.js');
await publishToNpm();
