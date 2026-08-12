import { useSyncExternalStore } from 'react';
import type { Decision, ModelId } from '@/lib/api/types';

export interface HistoryRecord {
  id: string;
  timestampIso: string;
  modelId: ModelId;
  fileName: string;
  decision: Decision;
  rawProbability: number;
  calibratedProbability: number;
  threshold: number;
  /** Thumbnail kecil (~96px) — bukan gambar asli, supaya localStorage tidak cepat penuh. */
  thumbnailDataUrl: string | null;
  /** Heatmap Grad-CAM base64 PNG, disimpan apa adanya (sudah kecil, 224x224). */
  heatmapPngBase64: string | null;
}

const STORAGE_KEY = 'fracture-dx-history';
const MAX_RECORDS = 50;

// Cache supaya getSnapshot (dipanggil tiap render oleh useSyncExternalStore)
// tidak selalu mengembalikan referensi array baru saat isi localStorage
// belum berubah — referensi tidak stabil bisa memicu re-render berulang.
let cachedRaw: string | null = null;
let cachedRecords: HistoryRecord[] = [];

function readAll(): HistoryRecord[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === cachedRaw) return cachedRecords;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cachedRecords = Array.isArray(parsed) ? parsed : [];
  } catch {
    cachedRecords = [];
  }
  return cachedRecords;
}

function writeAll(records: HistoryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    // quota penuh / localStorage diblokir — riwayat sesi ini tidak persist,
    // tapi aplikasi tetap jalan normal.
  }
  notify();
}

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function appendHistoryRecord(record: Omit<HistoryRecord, 'id' | 'timestampIso'>): void {
  const full: HistoryRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestampIso: new Date().toISOString(),
  };
  writeAll([full, ...readAll()]);
}

export function clearHistory(): void {
  writeAll([]);
}

/** Bikin thumbnail kecil dari File gambar — dipakai sebelum menyimpan ke riwayat. */
export async function createThumbnailDataUrl(file: File, maxSize = 96): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}

export function useLocalHistory(): HistoryRecord[] {
  return useSyncExternalStore(subscribe, readAll, () => []);
}
