// Builds both outputs from one source: a standalone file for class and a fragment to publish.
import { build as esbuild } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// v1 is the class page as first built. v2 is the updated lesson (intro and Figure 1, generations,
// theory vs practice, Firepath to OpenFlow); it swaps in its own registry and keeps v1's output as it was.
export const EDITIONS = {
  v1: { title: 'Jupiter Rising Labs', file: 'jupiter-rising-labs', registry: null, css: null },
  v2: { title: 'Jupiter Rising Labs v2', file: 'jupiter-rising-labs-v2', registry: join(ROOT, 'src/editions/v2/registry.js'), css: join(ROOT, 'src/editions/v2') },
};
export const outFor = (edition = 'v1') => ({
  standalone: join(ROOT, 'dist', `${EDITIONS[edition].file}.html`),
  fragment: join(ROOT, 'dist', `${EDITIONS[edition].file}.fragment.html`),
});
export const OUT = outFor('v1');

// Points the shell's registry import at the edition's own registry.
const registryPlugin = (registry) => ({
  name: 'edition-registry',
  setup(b) {
    if (!registry) return;
    b.onResolve({ filter: /^\.\/registry\.js$/ }, (args) =>
      args.importer.endsWith(join('src', 'shell', 'main.js')) ? { path: registry } : undefined,
    );
  },
});

async function cssIn(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.css'))
    .map((e) => join(e.parentPath, e.name))
    .sort();
  return Promise.all(files.map((f) => readFile(f, 'utf8')));
}

async function bundleJs(registry) {
  const result = await esbuild({
    entryPoints: [join(ROOT, 'src/shell/main.js')],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    charset: 'utf8',
    legalComments: 'none',
    // Paper figures ship inside the page, so it still works offline.
    loader: { '.jpg': 'dataurl', '.png': 'dataurl' },
    write: false,
    plugins: [registryPlugin(registry)],
  });
  return result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}

export async function build({ write = true, edition = 'v1' } = {}) {
  const { title, registry, css: editionCss } = EDITIONS[edition];
  const out = outFor(edition);
  const [shell, labs, panels, own, js] = await Promise.all([
    cssIn(join(ROOT, 'src/shell')),
    cssIn(join(ROOT, 'src/labs')),
    cssIn(join(ROOT, 'src/panels')),
    editionCss ? cssIn(editionCss) : [],
    bundleJs(registry),
  ]);
  const css = [...shell, ...labs, ...panels, ...own].join('\n').replace(/<\/style/gi, '<\\/style');
  const head = `<title>${title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n${css}</style>`;
  const body = `<div id="app"></div>\n<script>\n${js}</script>`;
  const fragment = `${head}\n${body}\n`;
  const standalone = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  if (write) {
    await mkdir(dirname(out.standalone), { recursive: true });
    await writeFile(out.standalone, standalone);
    await writeFile(out.fragment, fragment);
  }
  return { standalone, fragment };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const edition = process.argv.includes('--edition') ? process.argv[process.argv.indexOf('--edition') + 1] : 'v1';
  if (!EDITIONS[edition]) throw new Error(`Unknown edition: ${edition}`);
  await build({ edition });
  const out = outFor(edition);
  console.log(`Built ${edition}:\n  ${out.standalone}\n  ${out.fragment}`);
}
