// Génère les images web (WebP) et data.js à partir de photos/<catégorie>/.
// Usage : npm run images   (macOS : nécessite cwebp — brew install webp)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const photosDir = path.join(root, 'photos');
const imagesDir = path.join(root, 'images');
const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp', '.tif', '.tiff']);
const WIDTHS = [800, 1600];
const LARGE_WIDTH = 2400; // bandeaux pleine largeur et plein écran

const categories = JSON.parse(fs.readFileSync(path.join(root, 'categories.json'), 'utf8'));

function slugify(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// « 03-cheminee-blanche » → « Cheminee blanche » ; les accents du nom de fichier sont conservés.
function captionFrom(name) {
  const text = name.normalize('NFC').replace(/^\d+[\s._-]*/, '').replace(/[_-]+/g, ' ').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}

function dimensions(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return {
    width: Number(out.match(/pixelWidth: (\d+)/)[1]),
    height: Number(out.match(/pixelHeight: (\d+)/)[1]),
  };
}

function isFresh(output, source) {
  return fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(source).mtimeMs;
}

function toWebp(source, output, width, sourceWidth) {
  const args = ['-quiet', '-q', '78', '-metadata', 'none'];
  if (sourceWidth > width) args.push('-resize', String(width), '0');
  execFileSync('cwebp', [...args, source, '-o', output]);
}

// Bandeau d'accueil par défaut : la photo la plus large, la moins agrandie à l'écran.
function widest(variants) {
  return variants.reduce((best, v) => (!best || v.largeurSource > best.largeurSource ? v : best), null);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogue-'));
const data = [];

for (const category of categories) {
  const dir = path.join(photosDir, category.slug);
  const outDir = path.join(imagesDir, category.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(dir)
    .filter((f) => SOURCE_EXT.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));

  const produced = new Set();
  const variants = [];
  let cover = null;

  for (const file of files) {
    let source = path.join(dir, file);
    const base = path.parse(file).name;
    const id = slugify(base);
    const isCover = id.startsWith('couverture');

    // cwebp ne lit pas le HEIC : conversion préalable en JPEG via sips.
    if (path.extname(file).toLowerCase() === '.heic') {
      const jpeg = path.join(tmp, `${id}.jpg`);
      execFileSync('sips', ['-s', 'format', 'jpeg', source, '--out', jpeg], { stdio: 'ignore' });
      fs.utimesSync(jpeg, fs.statSync(source).atime, fs.statSync(source).mtime);
      source = jpeg;
    }

    const size = dimensions(source);
    const widths = size.width > WIDTHS.at(-1) ? [...WIDTHS, LARGE_WIDTH] : WIDTHS;

    for (const width of widths) {
      const name = `${id}-${width}.webp`;
      const output = path.join(outDir, name);
      produced.add(name);
      if (!isFresh(output, path.join(dir, file))) toWebp(source, output, width, size.width);
    }

    const entry = {
      id,
      legende: captionFrom(base),
      ratio: Number((size.width / size.height).toFixed(4)),
      largeurSource: size.width,
      src: `images/${category.slug}/${id}`,
      largeurs: widths,
    };
    if (isCover) cover = entry;
    else variants.push(entry);
  }

  // Supprime les images web dont la photo source a été retirée.
  for (const name of fs.readdirSync(outDir)) {
    if (!produced.has(name)) fs.rmSync(path.join(outDir, name));
  }

  data.push({ ...category, couverture: cover ?? widest(variants), variantes: variants });
  console.log(`${category.titre.padEnd(16)} ${variants.length} variante(s)${cover ? ' + couverture' : ''}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(
  path.join(root, 'data.js'),
  `// Fichier généré par scripts/build.mjs — ne pas modifier à la main.\nwindow.CATALOGUE = ${JSON.stringify(data, null, 2)};\n`,
);
console.log('data.js mis à jour.');
