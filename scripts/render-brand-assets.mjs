import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const projectRoot = resolve(import.meta.dirname, '..');

const renders = [
  {
    input: resolve(projectRoot, 'icon/icon-xzp.svg'),
    output: resolve(projectRoot, 'icon/icon-xzp.png'),
  },
  {
    input: resolve(projectRoot, 'icon/icon-xzp.svg'),
    output: resolve(projectRoot, 'icon/logo.png'),
    width: 1024,
  },
  {
    input: resolve(projectRoot, 'icon/logo-transparent.svg'),
    output: resolve(projectRoot, 'icon/logo-transparent.png'),
    width: 1024,
  },
  {
    input: resolve(projectRoot, 'icon/banner-xzp.svg'),
    output: resolve(projectRoot, 'icon/banner.png'),
  },
];

for (const render of renders) {
  const svg = await readFile(render.input, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: render.width
      ? { mode: 'width', value: render.width }
      : undefined,
    font: {
      fontFiles: [
        '/system/fonts/Roboto-Regular.ttf',
        '/system/fonts/DroidSansMono.ttf',
        '/system/fonts/CutiveMono.ttf',
      ],
      loadSystemFonts: false,
      defaultFontFamily: 'Roboto',
      defaultFontSize: 16,
    },
  });
  const pngData = resvg.render().asPng();
  await mkdir(dirname(render.output), { recursive: true });
  await writeFile(render.output, pngData);
}
