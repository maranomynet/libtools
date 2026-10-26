import { shell$ } from '@maranomynet/libtools';

import { typeCheckSources } from '../src/_/checking.js';

await shell$(`bun install`);
shell$(`bun test --dots --watch`);
typeCheckSources({ watch: true });
