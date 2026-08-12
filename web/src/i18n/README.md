# i18n — struktur saja, UI switch ditunda

`strings.ts` sudah punya dictionary lengkap `id` dan `en`, tapi
`use-strings.ts` hardcode ke `id` — belum ada tombol/UI untuk pindah bahasa.

Jangan bangun UI switch bahasa tanpa diminta eksplisit oleh user (spec §10
menyebut "i18n ID/EN" sebagai fitur, tapi keputusan brainstorming 2026-08-13
secara eksplisit membatasi pass ini hanya menyiapkan strukturnya).

Untuk mengaktifkan nanti: ganti `useStrings()` di `use-strings.ts` supaya
membaca preferensi bahasa (localStorage, mirip pola `theme-store.ts`) dan
mengembalikan `id` atau `en` sesuai itu.
