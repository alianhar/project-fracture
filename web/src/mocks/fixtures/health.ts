import type { HealthResponse } from '@/lib/api/types';

/**
 * Simulasi transisi cold -> warming -> ready, supaya ColdStartBanner teruji
 * nyata di dev (bukan langsung "ready"). Durasi didemokan lebih singkat
 * daripada realita HF Space (spec §9: 30-60 detik) supaya nyaman dites
 * berulang kali — bukan klaim performa asli.
 */
const COLD_MS = 1500;
const WARMING_MS = 6000;
const startedAt = Date.now();

export function getHealthFixture(): HealthResponse {
  const elapsed = Date.now() - startedAt;

  if (elapsed < COLD_MS) {
    return { status: 'cold', uptime_s: 0, eta_s: Math.ceil(WARMING_MS / 1000) };
  }
  if (elapsed < COLD_MS + WARMING_MS) {
    const remainingMs = COLD_MS + WARMING_MS - elapsed;
    return { status: 'warming', uptime_s: Math.floor(elapsed / 1000), eta_s: Math.ceil(remainingMs / 1000) };
  }
  return { status: 'ready', uptime_s: Math.floor(elapsed / 1000), eta_s: null };
}
