import type { ModelInfo } from '@/lib/api/types';

export const modelsFixture: ModelInfo[] = [
  {
    id: 'tiny',
    label: 'ConvNeXt-Tiny',
    params_millions: 28,
    input_size: 224,
    onnx_size_mb: 109,
    description: 'Backbone teringan — target inference tercepat di CPU HF Space.',
  },
  {
    id: 'small',
    label: 'ConvNeXt-Small',
    params_millions: 50,
    input_size: 224,
    onnx_size_mb: 192,
    description: 'Keseimbangan akurasi/latency terbaik di eksperimen terkontrol.',
  },
  {
    id: 'base',
    label: 'ConvNeXt-Base',
    params_millions: 89,
    input_size: 224,
    onnx_size_mb: 340,
    description: 'Kapasitas lebih besar, cocok jadi acuan batas atas akurasi.',
  },
  {
    id: 'large',
    label: 'ConvNeXt-Large',
    params_millions: 198,
    input_size: 224,
    onnx_size_mb: 755,
    description: 'Backbone terbesar — latency tertinggi, dipakai sebagai pembanding kapasitas.',
  },
];
