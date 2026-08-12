import { id, type Dictionary } from './strings';

/**
 * Bahasa saat ini HARDCODE ke 'id' — belum ada UI switch bahasa (lihat
 * README.md). Komponen tetap memanggil hook ini (bukan mengimpor `id`
 * langsung) supaya saat switch bahasa dibangun nanti, hanya file ini yang
 * perlu diubah.
 */
export function useStrings(): Dictionary {
  return id;
}
