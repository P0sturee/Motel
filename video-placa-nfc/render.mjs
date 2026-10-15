// Renderiza index.html quadro a quadro (Chromium headless) e gera o MP4 sem áudio.
// Uso:
//   node render.mjs stills=0.5,4,9.5            -> PNGs de conferência em out/still_*.png
//   node render.mjs video out=out/video.mp4      -> vídeo completo (+ out/sfx.json)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.includes('=') ? a.split('=') : [a, true]));
const FPS = +(args.fps || 30);
const OUT = args.out || 'out/video.mp4';
const WORKERS = +(args.workers || Math.max(1, Math.min(6, os.cpus().length - 1)));
const URL = 'file://' + path.resolve('index.html');
fs.mkdirSync('out', { recursive: true });

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(URL);
  await page.evaluate(() => window.READY);
  const cdp = await page.context().newCDPSession(page);
  return { page, cdp };
}

async function grab({ page, cdp }, t) {
  await page.evaluate(t => window.seekTo(t), t);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  return Buffer.from(data, 'base64');
}

const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });

if (args.stills) {
  const p = await openPage(browser);
  for (const t of String(args.stills).split(',').map(Number)) {
    fs.writeFileSync(`out/still_${t.toFixed(2)}.png`, await grab(p, t));
    console.log('still', t);
  }
  await browser.close();
  process.exit(0);
}

const probe = await openPage(browser);
const duration = await probe.page.evaluate(() => window.DURATION);
const sfx = await probe.page.evaluate(() => window.SFX_EVENTS);
fs.writeFileSync('out/sfx.json', JSON.stringify(sfx, null, 1));
await probe.page.close();

const total = Math.ceil(duration * FPS);
const per = Math.ceil(total / WORKERS);
console.log(`duração ${duration}s · ${total} quadros · ${WORKERS} processos`);
const t0 = Date.now();

async function worker(w) {
  const a = w * per, b = Math.min(total, a + per);
  if (a >= b) return null;
  const seg = `out/seg_${w}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), seg],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res(seg) : rej(new Error('ffmpeg ' + c))));
  const p = await openPage(browser);
  for (let i = a; i < b; i++) {
    const buf = await grab(p, i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (w === 0 && (i - a) % 60 === 0) console.log(`  ${Math.round(100 * (i - a) / (b - a))}% (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await p.page.close();
  return done;
}

const segs = (await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)))).filter(Boolean);
await browser.close();
fs.writeFileSync('out/segs.txt', segs.map(s => `file '${path.basename(s)}'`).join('\n'));
await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'out/segs.txt', '-c', 'copy', OUT], { stdio: 'inherit' })
  .on('close', c => c === 0 ? res() : rej(new Error('concat ' + c))));
segs.forEach(s => fs.unlinkSync(s));
console.log(`ok ${OUT} em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
