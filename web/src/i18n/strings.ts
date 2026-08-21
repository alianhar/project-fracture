/**
 * STRUKTUR SAJA — UI switch bahasa ditunda (lihat README.md di folder ini).
 * Tujuan file ini sekarang: memastikan string UI utama tidak hardcode
 * tersebar di banyak komponen, supaya suatu saat switch bahasa tinggal
 * mengganti sumber dictionary, bukan menulis ulang komponen.
 */

export interface Dictionary {
  nav: {
    analyze: string;
    compare: string;
    benchmark: string;
    methodology: string;
    history: string;
  };
  coldStart: {
    warming: (etaLabel: string) => string;
    note: string;
  };
  disclaimer: {
    short: string;
    full: string;
  };
}

export const id: Dictionary = {
  nav: {
    analyze: 'Analyze',
    compare: 'Compare',
    benchmark: 'Benchmark',
    methodology: 'Methodology',
    history: 'History',
  },
  coldStart: {
    warming: (etaLabel) => `Menghangatkan model — estimasi ${etaLabel}.`,
    note: 'Layanan gratis tidur setelah 48 jam tidak dipakai.',
  },
  disclaimer: {
    short: 'Alat bantu riset, bukan alat diagnosis.',
    full: 'Sistem ini adalah alat bantu riset klasifikasi citra, bukan alat diagnosis medis dan belum tersertifikasi untuk penggunaan klinis. Setiap keputusan klinis tetap harus melalui radiolog atau tenaga medis berwenang.',
  },
};

export const en: Dictionary = {
  nav: {
    analyze: 'Analyze',
    compare: 'Compare',
    benchmark: 'Benchmark',
    methodology: 'Methodology',
    history: 'History',
  },
  coldStart: {
    warming: (etaLabel) => `Warming up model — est. ${etaLabel}.`,
    note: 'The free-tier service sleeps after 48 hours of inactivity.',
  },
  disclaimer: {
    short: 'A research tool, not a diagnostic device.',
    full: 'This system is a research tool for image classification, not a medical diagnostic device, and is not certified for clinical use. Clinical decisions must always go through a licensed radiologist or medical professional.',
  },
};
