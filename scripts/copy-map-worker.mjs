// MapLibre 6 uses an external module worker; preserve its sibling shared module.
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,copyFileSync} from 'node:fs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(root,'apps/web/node_modules/maplibre-gl/dist');
const dest=resolve(root,'apps/web/public/vendor/maplibre-gl');
mkdirSync(dest,{recursive:true});
for(const file of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs'])copyFileSync(resolve(source,file),resolve(dest,file));
copyFileSync(resolve(source,'../LICENSE.txt'),resolve(dest,'LICENSE.txt'));
