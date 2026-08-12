/**
 * Store tema minimal — tanpa dependency state-management baru.
 * Sumber kebenaran tunggal: atribut data-theme di <html> + localStorage.
 * index.html sudah men-set data-theme sebelum paint pertama (anti-FOUC);
 * store ini hanya menyinkronkan React dengan apa yang sudah ada di DOM.
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'fracture-dx-theme';

function readInitialTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

let currentTheme: Theme = readInitialTheme();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function getTheme(): Theme {
  return currentTheme;
}

export function setTheme(next: Theme): void {
  if (next === currentTheme) return;
  currentTheme = next;
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage bisa diblokir (private mode) — tema tetap berfungsi
    // untuk sesi berjalan, hanya tidak persist lintas reload.
  }
  notify();
}

export function toggleTheme(): void {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
