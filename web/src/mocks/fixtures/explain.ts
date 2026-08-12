import type { ModelId } from '@/lib/api/types';

function hashSeed(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const CANVAS_SIZE = 224;

/**
 * Heatmap Grad-CAM sungguhan (bukan mock) tetap perlu spektrum warna kontinu
 * untuk merepresentasikan intensitas atensi — ini visualisasi data, bukan
 * hiasan UI. Palet dipilih dari warna project sendiri (grease -> kuning
 * hangat) alih-alih colormap 'jet' pelangi khas notebook lama, supaya tetap
 * senada instrument-panel, bukan penambahan gradient dekoratif baru.
 *
 * Dijalankan di thread utama (resolver MSW browser jalan di context window,
 * bukan di dalam Service Worker), jadi <canvas> tersedia seperti biasa.
 */
export function buildExplainFixtureBase64(file: File, modelId: ModelId, probability: number): string {
  const seed = hashSeed(`${file.name}:${file.size}:${modelId}:explain`);
  const cx = CANVAS_SIZE * (0.3 + seededRandom(seed) * 0.4);
  const cy = CANVAS_SIZE * (0.3 + seededRandom(seed + 1) * 0.4);
  const radius = CANVAS_SIZE * (0.18 + probability * 0.22);

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, `rgba(255, 224, 168, ${0.85 * probability})`);
  gradient.addColorStop(0.45, `rgba(255, 122, 69, ${0.65 * probability})`);
  gradient.addColorStop(1, 'rgba(255, 122, 69, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.split(',')[1] ?? '';
}
