import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Belum dipakai — disiapkan untuk saat unit test (Vitest) ditambahkan nanti.
 * `buildExplainFixtureBase64` bergantung ke <canvas> (DOM), jadi test yang
 * memakai server ini butuh environment jsdom.
 */
export const server = setupServer(...handlers);
