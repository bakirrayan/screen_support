// Builds the GitHub Pages site: copies site/ and the fabrication files into one folder
// and writes files/manifest.json for the download list.
// Usage: node tools/build-site.mjs [outDir]   (default: _site)
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, '_site'));
if (out === root) throw new Error('Refusing to build into the repository root');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'files'), { recursive: true });
cpSync(join(root, 'site'), out, { recursive: true });
writeFileSync(join(out, '.nojekyll'), '');

const groupOf = (rel) => {
  const top = rel.split('/')[0], ext = extname(rel).toLowerCase();
  if (top === 'STEP') return 'step';
  if (top === 'STL') return 'stl';
  if (top === 'DXF') return 'dxf';
  if (top === 'Images') return 'images';
  if (ext === '.sc' || ext === '.zip') return 'design';
  if (ext === '.pdf' || ext === '.xlsx') return 'drawings';
  return null;
};
const manifest = [];
const take = (rel) => {
  const g = groupOf(rel);
  if (!g) return;
  cpSync(join(root, rel), join(out, 'files', rel), { recursive: true });
  manifest.push({ path: rel, name: rel.split('/').pop(), group: g, size: statSync(join(root, rel)).size });
};
for (const name of readdirSync(root)) {
  const full = join(root, name);
  if (statSync(full).isDirectory()) {
    if (!['STEP', 'STL', 'DXF', 'Images'].includes(name)) continue;
    for (const f of readdirSync(full).sort()) if (statSync(join(full, f)).isFile()) take(`${name}/${f}`);
  } else take(name);
}
const order = ['design', 'drawings', 'step', 'dxf', 'stl', 'images'];
manifest.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.name.localeCompare(b.name, 'en', { numeric: true }));
writeFileSync(join(out, 'files', 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`Built ${relative(process.cwd(), out) || out}: ${manifest.length} files`);
